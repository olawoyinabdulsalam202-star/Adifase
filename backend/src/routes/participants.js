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
router.get('/', (req, res) => {
  const { roleId } = req.query;
  const rows = roleId
    ? db.prepare('SELECT * FROM participants WHERE role_id = ? ORDER BY created_at ASC').all(roleId)
    : db.prepare('SELECT * FROM participants ORDER BY created_at ASC').all();
  res.status(200).json(rows.map(toApi));
});

// POST /participants — admin only
router.post('/', requireAdmin, (req, res) => {
  const { name, roleId, manifesto, photoUrl } = req.body || {};
  if (!name || !name.trim() || !roleId) {
    return res.status(400).json({ error: 'Candidate name and roleId are required.' });
  }
  const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
  if (!role) return res.status(400).json({ error: 'That role does not exist.' });

  const participant = {
    id: makeId('p'),
    name: name.trim(),
    roleId,
    manifesto: manifesto || null,
    photoUrl: photoUrl || null,
  };
  db.prepare(
    'INSERT INTO participants (id, name, role_id, manifesto, photo_url) VALUES (?, ?, ?, ?, ?)'
  ).run(participant.id, participant.name, participant.roleId, participant.manifesto, participant.photoUrl);

  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(participant.id);
  res.status(201).json(toApi(row));
});

// PUT /participants/:id — admin only, partial update
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Candidate not found.' });

  const { name, roleId, manifesto, photoUrl } = req.body || {};

  if (roleId) {
    const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
    if (!role) return res.status(400).json({ error: 'That role does not exist.' });
  }

  const updated = {
    name: name !== undefined ? name : existing.name,
    role_id: roleId !== undefined ? roleId : existing.role_id,
    manifesto: manifesto !== undefined ? manifesto : existing.manifesto,
    photo_url: photoUrl !== undefined ? photoUrl : existing.photo_url,
  };

  db.prepare(
    'UPDATE participants SET name = ?, role_id = ?, manifesto = ?, photo_url = ? WHERE id = ?'
  ).run(updated.name, updated.role_id, updated.manifesto, updated.photo_url, req.params.id);

  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
  res.status(200).json(toApi(row));
});

// DELETE /participants/:id — admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Candidate not found.' });
  db.prepare('DELETE FROM votes WHERE participant_id = ?').run(req.params.id);
  db.prepare('DELETE FROM participants WHERE id = ?').run(req.params.id);
  res.status(200).json({ success: true });
});

module.exports = router;
