const express = require('express');
const db = require('../db');
const { makeId } = require('../utils/id');
const { requireVoter, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getStatus() {
  const row = db.prepare('SELECT value FROM election_config WHERE key = ?').get('status');
  return row ? row.value : 'ongoing';
}

// POST /votes — cast a vote. Requires voter JWT.
router.post('/', requireVoter, (req, res) => {
  const { participantId, roleId } = req.body || {};
  if (!participantId || !roleId) {
    return res.status(400).json({ error: 'participantId and roleId are required.' });
  }

  if (getStatus() !== 'ongoing') {
    return res.status(400).json({ error: 'Voting is not currently open.' });
  }

  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
  if (!participant || participant.role_id !== roleId) {
    return res.status(400).json({ error: 'That candidate is not valid for this role.' });
  }

  const alreadyVoted = db
    .prepare('SELECT id FROM votes WHERE user_id = ? AND role_id = ?')
    .get(req.voter.id, roleId);
  if (alreadyVoted) {
    return res.status(400).json({ error: 'You have already voted for this position.' });
  }

  const vote = { id: makeId('vote') };
  try {
    db.prepare(
      'INSERT INTO votes (id, user_id, participant_id, role_id) VALUES (?, ?, ?, ?)'
    ).run(vote.id, req.voter.id, participantId, roleId);
  } catch (err) {
    // Falls back on the DB-level UNIQUE(user_id, role_id) constraint
    // in case of a race between the check above and the insert.
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'You have already voted for this position.' });
    }
    throw err;
  }

  const row = db.prepare('SELECT * FROM votes WHERE id = ?').get(vote.id);
  res.status(201).json({
    id: row.id,
    userId: row.user_id,
    participantId: row.participant_id,
    roleId: row.role_id,
    timestamp: row.created_at,
  });
});

// GET /votes/my — roles the current voter has already voted for
router.get('/my', requireVoter, (req, res) => {
  const rows = db.prepare('SELECT role_id FROM votes WHERE user_id = ?').all(req.voter.id);
  res.status(200).json({ votedRoleIds: rows.map((r) => r.role_id) });
});

// GET /votes/count/:participantId — admin only (counts hidden from voters until published)
router.get('/count/:participantId', requireAdmin, (req, res) => {
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM votes WHERE participant_id = ?')
    .get(req.params.participantId);
  res.status(200).json({ participantId: req.params.participantId, count });
});

// GET /votes/total — admin only
router.get('/total', requireAdmin, (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM votes').get();
  res.status(200).json({ total: count });
});

module.exports = router;
