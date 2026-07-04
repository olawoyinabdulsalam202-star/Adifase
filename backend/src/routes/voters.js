const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_COST = 12;

router.use(requireAdmin);

// GET /voters — all voters with hasVoted + lastActivity computed
router.get('/', (req, res) => {
  const voters = db.prepare('SELECT * FROM voters ORDER BY created_at ASC').all();
  const lastVoteStmt = db.prepare(
    'SELECT MAX(created_at) AS lastActivity, COUNT(*) AS voteCount FROM votes WHERE user_id = ?'
  );

  const result = voters.map((v) => {
    const { lastActivity, voteCount } = lastVoteStmt.get(v.id);
    return {
      id: v.id,
      name: v.name,
      email: v.email,
      createdAt: v.created_at,
      hasVoted: voteCount > 0,
      lastActivity: lastActivity || null,
    };
  });

  res.status(200).json(result);
});

// POST /voters — admin registers a voter with a temp password
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = db.prepare('SELECT id FROM voters WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'A voter with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const voter = { id: makeId('voter'), name, email: email.toLowerCase() };
    db.prepare(
      'INSERT INTO voters (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(voter.id, voter.name, voter.email, passwordHash);

    const row = db.prepare('SELECT id, name, email, created_at FROM voters WHERE id = ?').get(voter.id);
    res.status(201).json({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at });
  } catch (err) {
    next(err);
  }
});

// DELETE /voters/:id — admin only
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM voters WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Voter not found.' });
  db.prepare('DELETE FROM votes WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM voters WHERE id = ?').run(req.params.id);
  res.status(200).json({ success: true });
});

module.exports = router;
