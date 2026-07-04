const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
    cb(null, `${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

// POST /upload/photo — admin only, multipart/form-data field "photo"
router.post('/photo', requireAdmin, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Only JPEG or PNG photos are allowed.' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo must be 5MB or smaller.' });
      }
      return res.status(400).json({ error: 'Photo upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file was provided.' });
    }

    const base = process.env.PUBLIC_UPLOAD_BASE_URL || '/uploads';
    const photoUrl = `${base.replace(/\/$/, '')}/${req.file.filename}`;
    res.status(200).json({ photoUrl });
  });
});

module.exports = router;
