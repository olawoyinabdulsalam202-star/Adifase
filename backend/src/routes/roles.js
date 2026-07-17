const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toApi(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

// GET /roles — public, used by voter pages and admin
router.get('/', async (req, res, next) => {
  try {
    const rows = await db.all('SELECT * FROM roles ORDER BY created_at ASC');
    res.status(200).json(rows.map(toApi));
  } catch (err) {
    next(err);
  }
});

// POST /roles — admin only
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required.' });
    }
    const role = { id: makeId('role'), name: name.trim() };
    await db.run('INSERT INTO roles (id, name) VALUES (?, ?)', [role.id, role.name]);
    const row = await db.get('SELECT * FROM roles WHERE id = ?', [role.id]);
    res.status(201).json(toApi(row));
  } catch (err) {
    next(err);
  }
});

// PUT /roles/:id — admin only
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    const existing = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Role not found.' });
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required.' });
    }
    await db.run('UPDATE roles SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    const row = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    res.status(200).json(toApi(row));
  } catch (err) {
    next(err);
  }
});

// DELETE /roles/:id — admin only, blocked if participants exist under it
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Role not found.' });

    const { count } = await db.get(
      'SELECT COUNT(*)::int AS count FROM participants WHERE role_id = ?',
      [req.params.id]
    );
    if (count > 0) {
      return res.status(400).json({ error: 'Reassign or remove participants under this role before deleting it.' });
    }

    await db.run('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
