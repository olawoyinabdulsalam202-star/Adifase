const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { makeId } = require('../utils/id');
const { signVoterToken, signAdminToken } = require('../utils/jwt');

const router = express.Router();
const BCRYPT_COST = 12;

// 5 attempts per IP per 15 minutes on login endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /auth/signup — voter self-registration
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !isValidEmail(email) || !password || password.length < 6) {
      return res.status(400).json({ error: 'Name, a valid email, and a password (min 6 characters) are required.' });
    }

    const existing = await db.get('SELECT id FROM voters WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'A voter with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const voter = {
      id: makeId('voter'),
      name,
      email: email.toLowerCase(),
    };
    await db.run(
      'INSERT INTO voters (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [voter.id, voter.name, voter.email, passwordHash]
    );

    const token = signVoterToken(voter);
    res.status(201).json({ token, voter });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login — voter login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email) || !password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const row = await db.get('SELECT * FROM voters WHERE email = ?', [email.toLowerCase()]);
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const voter = { id: row.id, name: row.name, email: row.email };
    const token = signVoterToken(voter);
    res.status(200).json({ token, voter });
  } catch (err) {
    next(err);
  }
});

// POST /auth/admin/login — admin login against env vars only
router.post('/admin/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.toLowerCase() === String(adminEmail || '').toLowerCase() &&
    password === adminPassword
  ) {
    const token = signAdminToken();
    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: 'Invalid admin credentials.' });
});

module.exports = router;
