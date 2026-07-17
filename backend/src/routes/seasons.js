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
router.get('/', async (req, res, next) => {
  try {
    const rows = await db.all('SELECT * FROM seasons ORDER BY archived_at DESC');
    res.status(200).json(rows.map(toApi));
  } catch (err) {
    next(err);
  }
});

// POST /seasons — archive current season in a single transaction:
// 1. read roles/participants/votes, 2. build snapshot, 3. store season,
// 4. clear votes, 5. reset status to "ongoing", 6. clear dates.
router.post('/', async (req, res, next) => {
  const { label } = req.body || {};
  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'A season label is required.' });
  }

  try {
    const row = await db.withTransaction(async (tx) => {
      const roles = await tx.all('SELECT * FROM roles ORDER BY created_at ASC');

      const snapshot = [];
      for (const role of roles) {
        const participants = await tx.all(
          'SELECT * FROM participants WHERE role_id = ? ORDER BY created_at ASC',
          [role.id]
        );
        const candidates = [];
        for (const c of participants) {
          const { count } = await tx.get(
            'SELECT COUNT(*)::int AS count FROM votes WHERE participant_id = ?',
            [c.id]
          );
          candidates.push({ id: c.id, name: c.name, photoUrl: c.photo_url, votes: count });
        }
        snapshot.push({
          roleId: role.id,
          roleName: role.name,
          totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
          candidates,
        });
      }

      const { count: totalVotesCast } = await tx.get('SELECT COUNT(*)::int AS count FROM votes');

      const season = {
        id: makeId('season'),
        label: label.trim(),
        totalVotesCast,
        snapshot: JSON.stringify(snapshot),
      };

      await tx.run(
        'INSERT INTO seasons (id, label, total_votes_cast, snapshot) VALUES (?, ?, ?, ?)',
        [season.id, season.label, season.totalVotesCast, season.snapshot]
      );

      await tx.run('DELETE FROM votes');

      await tx.run(
        "INSERT INTO election_config (key, value) VALUES ('status', 'ongoing') ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      );
      await tx.run(
        "INSERT INTO election_config (key, value) VALUES ('starts_at', NULL) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      );
      await tx.run(
        "INSERT INTO election_config (key, value) VALUES ('ends_at', NULL) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      );

      return tx.get('SELECT * FROM seasons WHERE id = ?', [season.id]);
    });

    res.status(201).json(toApi(row));
  } catch (err) {
    next(err);
  }
});

// DELETE /seasons/:id — permanently remove a historical season
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.get('SELECT id FROM seasons WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Season not found.' });
    await db.run('DELETE FROM seasons WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
