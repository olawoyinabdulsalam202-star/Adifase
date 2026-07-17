const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const VALID_STATUSES = ['ongoing', 'closed', 'published'];

async function getConfig(key) {
  const row = await db.get('SELECT value FROM election_config WHERE key = ?', [key]);
  return row ? row.value : null;
}

async function setConfig(key, value) {
  await db.run(
    'INSERT INTO election_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// GET /election/status — public
router.get('/status', async (req, res, next) => {
  try {
    res.status(200).json({ status: (await getConfig('status')) || 'ongoing' });
  } catch (err) {
    next(err);
  }
});

// PUT /election/status — admin only
router.put('/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }
    await setConfig('status', status);
    res.status(200).json({ status });
  } catch (err) {
    next(err);
  }
});

// GET /election/dates — public
router.get('/dates', async (req, res, next) => {
  try {
    res.status(200).json({
      startsAt: (await getConfig('starts_at')) || null,
      endsAt: (await getConfig('ends_at')) || null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /election/dates — admin only
router.put('/dates', requireAdmin, async (req, res, next) => {
  try {
    const { startsAt, endsAt } = req.body || {};
    await setConfig('starts_at', startsAt ?? null);
    await setConfig('ends_at', endsAt ?? null);
    res.status(200).json({ startsAt: startsAt ?? null, endsAt: endsAt ?? null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
