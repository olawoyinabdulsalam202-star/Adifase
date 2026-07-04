const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const VALID_STATUSES = ['ongoing', 'closed', 'published'];

function getConfig(key) {
  const row = db.prepare('SELECT value FROM election_config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  db.prepare(
    'INSERT INTO election_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

// GET /election/status — public
router.get('/status', (req, res) => {
  res.status(200).json({ status: getConfig('status') || 'ongoing' });
});

// PUT /election/status — admin only
router.put('/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }
  setConfig('status', status);
  res.status(200).json({ status });
});

// GET /election/dates — public
router.get('/dates', (req, res) => {
  res.status(200).json({
    startsAt: getConfig('starts_at') || null,
    endsAt: getConfig('ends_at') || null,
  });
});

// PUT /election/dates — admin only
router.put('/dates', requireAdmin, (req, res) => {
  const { startsAt, endsAt } = req.body || {};
  setConfig('starts_at', startsAt ?? null);
  setConfig('ends_at', endsAt ?? null);
  res.status(200).json({ startsAt: startsAt ?? null, endsAt: endsAt ?? null });
});

module.exports = router;
