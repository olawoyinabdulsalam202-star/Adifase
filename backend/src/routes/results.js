const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getStatus() {
  const row = await db.get('SELECT value FROM election_config WHERE key = ?', ['status']);
  return row ? row.value : 'ongoing';
}

async function buildResults() {
  const roles = await db.all('SELECT * FROM roles ORDER BY created_at ASC');

  const results = [];
  for (const role of roles) {
    const participants = await db.all(
      'SELECT * FROM participants WHERE role_id = ? ORDER BY created_at ASC',
      [role.id]
    );

    const candidates = [];
    for (const c of participants) {
      const { count } = await db.get(
        'SELECT COUNT(*)::int AS count FROM votes WHERE participant_id = ?',
        [c.id]
      );
      candidates.push({ id: c.id, name: c.name, photoUrl: c.photo_url, votes: count });
    }

    results.push({
      roleId: role.id,
      roleName: role.name,
      totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
      candidates,
    });
  }
  return results;
}

// GET /results — public, only when status is "published"
router.get('/', async (req, res, next) => {
  try {
    if ((await getStatus()) !== 'published') {
      return res.status(403).json({ error: 'Results have not been published yet.' });
    }
    res.status(200).json(await buildResults());
  } catch (err) {
    next(err);
  }
});

// Exposed separately so server.js can mount it at /admin/results
const adminResultsHandler = [
  requireAdmin,
  async (req, res, next) => {
    try {
      res.status(200).json(await buildResults());
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { publicResultsRouter: router, adminResultsHandler };
