const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    roleId: row.role_id,
    manifesto: row.manifesto,
    photoUrl: row.photo_url,
  };
}

// GET /participants — public. Optional ?roleId= filter
router.get('/', async (req, res, next) => {
  try {
    const { roleId } = req.query;
    const rows = roleId
      ? await db.all('SELECT * FROM participants WHERE role_id = ? ORDER BY created_at ASC', [roleId])
      : await db.all('SELECT * FROM participants ORDER BY created_at ASC');
    res.status(200).json(rows.map(toApi));
  } catch (err) {
    next(err);
  }
});

// POST /participants — admin only
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, roleId, manifesto, photoUrl } = req.body || {};
    if (!name || !name.trim() || !roleId) {
      return res.status(400).json({ error: 'Candidate name and roleId are required.' });
    }
    const role = await db.get('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!role) return res.status(400).json({ error: 'That role does not exist.' });

    const participant = {
      id: makeId('p'),
      name: name.trim(),
      roleId,
      manifesto: manifesto || null,
      photoUrl: photoUrl || null,
    };
    await db.run(
      'INSERT INTO participants (id, name, role_id, manifesto, photo_url) VALUES (?, ?, ?, ?, ?)',
      [participant.id, participant.name, participant.roleId, participant.manifesto, participant.photoUrl]
    );

    const row = await db.get('SELECT * FROM participants WHERE id = ?', [participant.id]);
    res.status(201).json(toApi(row));
  } catch (err) {
    next(err);
  }
});

// PUT /participants/:id — admin only, partial update
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM participants WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Candidate not found.' });

    const { name, roleId, manifesto, photoUrl } = req.body || {};

    if (roleId) {
      const role = await db.get('SELECT id FROM roles WHERE id = ?', [roleId]);
      if (!role) return res.status(400).json({ error: 'That role does not exist.' });
    }

    const updated = {
      name: name !== undefined ? name : existing.name,
      role_id: roleId !== undefined ? roleId : existing.role_id,
      manifesto: manifesto !== undefined ? manifesto : existing.manifesto,
      photo_url: photoUrl !== undefined ? photoUrl : existing.photo_url,
    };

    await db.run(
      'UPDATE participants SET name = ?, role_id = ?, manifesto = ?, photo_url = ? WHERE id = ?',
      [updated.name, updated.role_id, updated.manifesto, updated.photo_url, req.params.id]
    );

    const row = await db.get('SELECT * FROM participants WHERE id = ?', [req.params.id]);
    res.status(200).json(toApi(row));
  } catch (err) {
    next(err);
  }
});

// DELETE /participants/:id — admin only
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await db.get('SELECT * FROM participants WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Candidate not found.' });
    await db.run('DELETE FROM votes WHERE participant_id = ?', [req.params.id]);
    await db.run('DELETE FROM participants WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
