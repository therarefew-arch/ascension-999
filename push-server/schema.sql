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
