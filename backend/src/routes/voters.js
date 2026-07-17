const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const BCRYPT_COST = 12;

router.use(requireAdmin);

// GET /voters — all voters with hasVoted + lastActivity computed
router.get('/', async (req, res, next) => {
  try {
    const voters = await db.all('SELECT * FROM voters ORDER BY created_at ASC');

    const result = [];
    for (const v of voters) {
      const { lastactivity, votecount } = await db.get(
        'SELECT MAX(created_at) AS lastActivity, COUNT(*)::int AS voteCount FROM votes WHERE user_id = ?',
        [v.id]
      );
      result.push({
        id: v.id,
        name: v.name,
        email: v.email,
        createdAt: v.created_at,
        hasVoted: votecount > 0,
        lastActivity: lastactivity || null,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /voters — admin registers a voter with a temp password
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await db.get('SELECT id FROM voters WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'A voter with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const voter = { id: makeId('voter'), name, email: email.toLowerCase() };
    await db.run(
      'INSERT INTO voters (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [voter.id, voter.name, voter.email, passwordHash]
    );

    const row = await db.get('SELECT id, name, email, created_at FROM voters WHERE id = ?', [voter.id]);
    res.status(201).json({ id: row.id, name: row.name, email: row.email, createdAt: row.created_at });
  } catch (err) {
    next(err);
  }
});

// DELETE /voters/:id — admin only
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.get('SELECT id FROM voters WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Voter not found.' });
    await db.run('DELETE FROM votes WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM voters WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
