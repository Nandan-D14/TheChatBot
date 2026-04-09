PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_session_created
  ON messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_memory_user
  ON memory (user_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  latency_ms INTEGER,
  tokens_used INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_created
  ON analytics_events (user_id, created_at DESC);
