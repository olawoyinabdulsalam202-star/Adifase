const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getStatus() {
  const row = db.prepare('SELECT value FROM election_config WHERE key = ?').get('status');
  return row ? row.value : 'ongoing';
}

function buildResults() {
  const roles = db.prepare('SELECT * FROM roles ORDER BY created_at ASC').all();
  const countStmt = db.prepare('SELECT COUNT(*) AS count FROM votes WHERE participant_id = ?');

  return roles.map((role) => {
    const candidates = db
      .prepare('SELECT * FROM participants WHERE role_id = ? ORDER BY created_at ASC')
      .all(role.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        photoUrl: c.photo_url,
        votes: countStmt.get(c.id).count,
      }));

    return {
      roleId: role.id,
      roleName: role.name,
      totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
      candidates,
    };
  });
}

// GET /results — public, only when status is "published"
router.get('/', (req, res) => {
  if (getStatus() !== 'published') {
    return res.status(403).json({ error: 'Results have not been published yet.' });
  }
  res.status(200).json(buildResults());
});

// Exposed separately so server.js can mount it at /admin/results
const adminResultsHandler = [requireAdmin, (req, res) => {
  res.status(200).json(buildResults());
}];

module.exports = { publicResultsRouter: router, adminResultsHandler };
