# Adifase '97 Backend

Express API that replaces the localStorage data layer in the Adifase '97
election frontend. Implements every route in the handoff doc's spec exactly,
including request/response shapes and error message wording (the frontend
displays those strings directly in toasts).

## Stack

- **Node.js + Express**
- **SQLite** via Node's built-in `node:sqlite` module (no native build step,
  no external DB server to run). The schema (`src/db/schema.sql`) mirrors the
  Postgres tables in the handoff doc column-for-column, so migrating to
  Postgres later is a straight port — swap `src/db/index.js` for a `pg` pool
  and keep every route file as-is (they only use `db.prepare/get/all/run`).
- **JWT** (`jsonwebtoken`) — separate secrets/claims for voter vs admin tokens
- **bcryptjs** — pure-JS bcrypt, cost factor 12, no native compile step
- **multer** — local-disk photo uploads (swap for S3/Cloudinary in prod by
  changing only `src/routes/upload.js`)
- **express-rate-limit** — 5 attempts / 15 min on both login endpoints

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set real JWT secrets and admin credentials
npm start          # or: npm run dev  (auto-restart on change)
```

Server listens on `PORT` (default `4000`). SQLite file is created at
`DATABASE_FILE` (default `./data/adifase.db`) on first run — no migration
step needed, the schema is applied automatically on boot.

Point the frontend's `VITE_API_BASE_URL` at wherever this is deployed, and
set `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` to match this server's
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (the frontend UI itself no longer checks
these — only the server does, per the doc's security requirement).

## Project layout

```
src/
  server.js              Express app, route mounting, CORS, error handler
  db/
    schema.sql            Table definitions (+ seeds election_config)
    index.js               Opens/creates the SQLite file, applies schema
  middleware/
    auth.js                 requireVoter / requireAdmin JWT guards
    errorHandler.js          Catches uncaught errors -> { error } JSON
  routes/
    auth.js                 /auth/signup /auth/login /auth/admin/login
    roles.js                /roles CRUD
    participants.js         /participants CRUD
    voters.js                /voters (admin) — list w/ hasVoted, register, delete
    votes.js                 /votes cast + /votes/my + /votes/count + /votes/total
    election.js              /election/status /election/dates
    seasons.js                /seasons archive (transactional) + history
    results.js                 /results (public, gated) + /admin/results
    upload.js                  /upload/photo (multer, 5MB, jpeg/png only)
  utils/
    id.js                     Prefixed ids: role_, p_, voter_, vote_, season_
    jwt.js                     sign/verify helpers for both token types
```

## Notable implementation details

- **UNIQUE(user_id, role_id) on votes** is a real SQLite table constraint
  (`schema.sql`), not just an application check — `POST /votes` also has an
  app-level pre-check for a friendly error message, with the DB constraint as
  the actual race-safe backstop.
- **`POST /seasons`** runs its six steps (snapshot → store → clear votes →
  reset status → clear dates) inside a single `BEGIN/COMMIT` transaction with
  `ROLLBACK` on any failure, exactly as the doc requires. Tested in isolation
  before wiring — see the smoke test below.
- **Vote counts are never present in any response** unless the caller is an
  admin (`/votes/count/:id`, `/votes/total`, `/admin/results`) or the election
  status is `published` (`/results`). `GET /results` returns `403` otherwise.
- **Admin credentials** are compared only against `process.env.ADMIN_EMAIL`
  / `ADMIN_PASSWORD` inside `routes/auth.js` — never touch the `voters` table
  and are never sent to the browser.
- **Passwords**: client sends plaintext over HTTPS, server hashes with
  bcrypt(cost 12) before storing. No pre-hashed passwords are ever accepted.
- **Role deletion** is blocked with `400` + the exact message the doc
  specifies if any participant still references that role.
- **Photo uploads** are validated by MIME type (not just extension) and
  capped at 5MB; files are written to `UPLOAD_DIR` and served statically at
  `/uploads/<filename>`, with `PUBLIC_UPLOAD_BASE_URL` controlling the URL
  returned to the frontend (point this at a CDN/bucket URL in production
  instead of using local disk).

## Verified against the doc's integration checklist

Every endpoint in the checklist was run end-to-end during development,
including the full lifecycle: create role → add candidate → voter signs up →
casts vote → duplicate vote rejected → results hidden pre-publish → publish →
results visible → role-delete blocked while participant exists → season
archived (votes cleared, status reset to `ongoing`, dates cleared) → history
retains the frozen snapshot.

## Moving to Postgres later

Only `src/db/index.js` needs to change (swap `node:sqlite` for a `pg` Pool
and adjust the two `PRAGMA` lines, which have no Postgres equivalent). Every
route file uses `db.prepare(sql).get/all/run(...)`, so if you use a thin
wrapper with the same method names on top of `pg`, route files don't change.
`schema.sql` maps 1:1 to the Postgres DDL already spelled out in the handoff
doc (`TEXT` → `VARCHAR`, ISO string timestamps → `TIMESTAMP`, JSON string →
`JSONB`).
