-- Ascension 999 notification server storage (Cloudflare D1).
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,        -- a hash of the phone's push address
  sub TEXT NOT NULL,          -- the push address
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  at INTEGER NOT NULL,        -- when to send (ms)
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notes_due ON notes (sent, at);
CREATE INDEX IF NOT EXISTS notes_device ON notes (device);

-- 👪 Family (v0.0.1.55): small groups joined by an invite link. No accounts — each member gets a secret token.
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,        -- long random id (it's in the invite link)
  name TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  token TEXT NOT NULL,        -- secret, kept in that player's save
  name TEXT NOT NULL,
  snap TEXT NOT NULL DEFAULT '{}', -- a small summary of their adventurer (town, levels, idle…)
  device TEXT,                -- their phone's push id, if notifications are on
  updated INTEGER NOT NULL,
  joined INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS members_family ON members (family);
CREATE TABLE IF NOT EXISTS feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family TEXT NOT NULL,
  member TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS feed_family ON feed (family, at);
CREATE TABLE IF NOT EXISTS cheers (
  feed INTEGER NOT NULL,
  member TEXT NOT NULL,
  PRIMARY KEY (feed, member)
);
CREATE TABLE IF NOT EXISTS nudges (
  from_m TEXT NOT NULL,
  to_m TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (from_m, to_m, day)
);
-- 👪 Weekly family goal (v0.0.1.56): each member's counts for the week (logs chopped, monsters defeated…).
CREATE TABLE IF NOT EXISTS goals (
  member TEXT NOT NULL,
  family TEXT NOT NULL,
  week TEXT NOT NULL,         -- the Monday the week started, e.g. 2026-10-26
  counts TEXT NOT NULL,       -- {"woodcutting": 1200, "kills": 40, "any": 3000, …}
  updated INTEGER NOT NULL,
  PRIMARY KEY (member, week)
);
CREATE INDEX IF NOT EXISTS goals_family ON goals (family, week);
