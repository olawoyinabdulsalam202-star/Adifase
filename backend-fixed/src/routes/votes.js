const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireVoter, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getStatus() {
  const row = await db.get('SELECT value FROM election_config WHERE key = ?', ['status']);
  return row ? row.value : 'ongoing';
}

// POST /votes — cast a vote. Requires voter JWT.
router.post('/', requireVoter, async (req, res, next) => {
  try {
    const { participantId, roleId } = req.body || {};
    if (!participantId || !roleId) {
      return res.status(400).json({ error: 'participantId and roleId are required.' });
    }

    if ((await getStatus()) !== 'ongoing') {
      return res.status(400).json({ error: 'Voting is not currently open.' });
    }

    const participant = await db.get('SELECT * FROM participants WHERE id = ?', [participantId]);
    if (!participant || participant.role_id !== roleId) {
      return res.status(400).json({ error: 'That candidate is not valid for this role.' });
    }

    const alreadyVoted = await db.get(
      'SELECT id FROM votes WHERE user_id = ? AND role_id = ?',
      [req.voter.id, roleId]
    );
    if (alreadyVoted) {
      return res.status(400).json({ error: 'You have already voted for this position.' });
    }

    const vote = { id: makeId('vote') };
    try {
      await db.run(
        'INSERT INTO votes (id, user_id, participant_id, role_id) VALUES (?, ?, ?, ?)',
        [vote.id, req.voter.id, participantId, roleId]
      );
    } catch (err) {
      // Falls back on the DB-level UNIQUE(user_id, role_id) constraint
      // in case of a race between the check above and the insert.
      if (err.code === '23505') {
        return res.status(400).json({ error: 'You have already voted for this position.' });
      }
      throw err;
    }

    const row = await db.get('SELECT * FROM votes WHERE id = ?', [vote.id]);
    res.status(201).json({
      id: row.id,
      userId: row.user_id,
      participantId: row.participant_id,
      roleId: row.role_id,
      timestamp: row.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /votes/my — roles the current voter has already voted for
router.get('/my', requireVoter, async (req, res, next) => {
  try {
    const rows = await db.all('SELECT role_id FROM votes WHERE user_id = ?', [req.voter.id]);
    res.status(200).json({ votedRoleIds: rows.map((r) => r.role_id) });
  } catch (err) {
    next(err);
  }
});

// GET /votes/count/:participantId — admin only (counts hidden from voters until published)
router.get('/count/:participantId', requireAdmin, async (req, res, next) => {
  try {
    const { count } = await db.get(
      'SELECT COUNT(*)::int AS count FROM votes WHERE participant_id = ?',
      [req.params.participantId]
    );
    res.status(200).json({ participantId: req.params.participantId, count });
  } catch (err) {
    next(err);
  }
});

// GET /votes/total — admin only
router.get('/total', requireAdmin, async (req, res, next) => {
  try {
    const { count } = await db.get('SELECT COUNT(*)::int AS count FROM votes');
    res.status(200).json({ total: count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
