-- SQLite schema. Column choices mirror the Postgres spec in the handoff doc
-- (VARCHAR -> TEXT, TIMESTAMP -> TEXT ISO8601, JSONB -> TEXT holding JSON).
-- Swapping to Postgres later just means translating these types 1:1.

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role_id     TEXT NOT NULL REFERENCES roles(id),
  manifesto   TEXT,
  photo_url   TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS voters (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES voters(id),
  participant_id  TEXT NOT NULL REFERENCES participants(id),
  role_id         TEXT NOT NULL REFERENCES roles(id),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS election_config (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
  id                TEXT PRIMARY KEY,
  label             TEXT NOT NULL,
  archived_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  total_votes_cast  INTEGER NOT NULL DEFAULT 0,
  snapshot          TEXT NOT NULL
);

-- Seed default election status if not present
INSERT OR IGNORE INTO election_config (key, value) VALUES ('status', 'ongoing');
INSERT OR IGNORE INTO election_config (key, value) VALUES ('starts_at', NULL);
INSERT OR IGNORE INTO election_config (key, value) VALUES ('ends_at', NULL);
