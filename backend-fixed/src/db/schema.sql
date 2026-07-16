-- Postgres schema (migrated from SQLite).

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role_id     TEXT NOT NULL REFERENCES roles(id),
  manifesto   TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voters (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES voters(id),
  participant_id  TEXT NOT NULL REFERENCES participants(id),
  role_id         TEXT NOT NULL REFERENCES roles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS election_config (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
  id                TEXT PRIMARY KEY,
  label             TEXT NOT NULL,
  archived_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_votes_cast  INTEGER NOT NULL DEFAULT 0,
  snapshot          TEXT NOT NULL
);

-- Seed default election status if not present
INSERT INTO election_config (key, value) VALUES ('status', 'ongoing') ON CONFLICT (key) DO NOTHING;
INSERT INTO election_config (key, value) VALUES ('starts_at', NULL) ON CONFLICT (key) DO NOTHING;
INSERT INTO election_config (key, value) VALUES ('ends_at', NULL) ON CONFLICT (key) DO NOTHING;
