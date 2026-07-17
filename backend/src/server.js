require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const rolesRoutes = require('./routes/roles');
const participantsRoutes = require('./routes/participants');
const votersRoutes = require('./routes/voters');
const votesRoutes = require('./routes/votes');
const electionRoutes = require('./routes/election');
const seasonsRoutes = require('./routes/seasons');
const uploadRoutes = require('./routes/upload');
const { publicResultsRouter, adminResultsHandler } = require('./routes/results');
const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

// Fail fast if required secrets are missing
['JWT_VOTER_SECRET', 'JWT_ADMIN_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'].forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[warn] ${key} is not set — check your .env file.`);
  }
});

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Static serving for locally-stored uploaded photos (dev fallback; use a CDN in prod)
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/roles', rolesRoutes);
app.use('/participants', participantsRoutes);
app.use('/voters', votersRoutes);
app.use('/votes', votesRoutes);
app.use('/election', electionRoutes);
app.use('/seasons', seasonsRoutes);
app.use('/upload', uploadRoutes);
app.use('/results', publicResultsRouter);
app.get('/admin/results', ...adminResultsHandler);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Adifase '97 backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
