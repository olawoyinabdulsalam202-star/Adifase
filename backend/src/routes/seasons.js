const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

function toApi(row) {
  return {
    id: row.id,
    label: row.label,
    archivedAt: row.archived_at,
    totalVotesCast: row.total_votes_cast,
    snapshot: JSON.parse(row.snapshot),
  };
}

// GET /seasons — newest first
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM seasons ORDER BY archived_at DESC').all();
  res.status(200).json(rows.map(toApi));
});

// POST /seasons — archive current season in a single transaction:
// 1. read roles/participants/votes, 2. build snapshot, 3. store season,
// 4. clear votes, 5. reset status to "ongoing", 6. clear dates.
router.post('/', (req, res, next) => {
  const { label } = req.body || {};
  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'A season label is required.' });
  }

  try {
    db.exec('BEGIN');

    const roles = db.prepare('SELECT * FROM roles ORDER BY created_at ASC').all();
    const countStmt = db.prepare('SELECT COUNT(*) AS count FROM votes WHERE participant_id = ?');

    const snapshot = roles.map((role) => {
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

    const totalVotesCast = db.prepare('SELECT COUNT(*) AS count FROM votes').get().count;

    const season = {
      id: makeId('season'),
      label: label.trim(),
      totalVotesCast,
      snapshot: JSON.stringify(snapshot),
    };

    db.prepare(
      'INSERT INTO seasons (id, label, total_votes_cast, snapshot) VALUES (?, ?, ?, ?)'
    ).run(season.id, season.label, season.totalVotesCast, season.snapshot);

    db.prepare('DELETE FROM votes').run();

    db.prepare(
      "INSERT INTO election_config (key, value) VALUES ('status', 'ongoing') ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run();
    db.prepare(
      "INSERT INTO election_config (key, value) VALUES ('starts_at', NULL) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run();
    db.prepare(
      "INSERT INTO election_config (key, value) VALUES ('ends_at', NULL) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run();

    const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(season.id);
    db.exec('COMMIT');
    res.status(201).json(toApi(row));
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackErr) {
      // ignore — nothing to roll back if BEGIN never took effect
    }
    next(err);
  }
});

// DELETE /seasons/:id — permanently remove a historical season
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM seasons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Season not found.' });
  db.prepare('DELETE FROM seasons WHERE id = ?').run(req.params.id);
  res.status(200).json({ success: true });
});

module.exports = router;
