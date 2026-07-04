const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toApi(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

// GET /roles — public, used by voter pages and admin
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM roles ORDER BY created_at ASC').all();
  res.status(200).json(rows.map(toApi));
});

// POST /roles — admin only
router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required.' });
  }
  const role = { id: makeId('role'), name: name.trim() };
  db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)').run(role.id, role.name);
  const row = db.prepare('SELECT * FROM roles WHERE id = ?').get(role.id);
  res.status(201).json(toApi(row));
});

// PUT /roles/:id — admin only
router.put('/:id', requireAdmin, (req, res) => {
  const { name } = req.body || {};
  const existing = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Role not found.' });
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required.' });
  }
  db.prepare('UPDATE roles SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  const row = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  res.status(200).json(toApi(row));
});

// DELETE /roles/:id — admin only, blocked if participants exist under it
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Role not found.' });

  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM participants WHERE role_id = ?')
    .get(req.params.id);
  if (count > 0) {
    return res.status(400).json({ error: 'Reassign or remove participants under this role before deleting it.' });
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
  res.status(200).json({ success: true });
});

module.exports = router;
