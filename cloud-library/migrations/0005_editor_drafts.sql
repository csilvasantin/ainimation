CREATE TABLE IF NOT EXISTS editor_drafts (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 revision INTEGER NOT NULL,
 title TEXT NOT NULL,
 kind TEXT NOT NULL,
 project_key TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS editor_drafts_owner ON editor_drafts(owner, updated_at);

CREATE TABLE IF NOT EXISTS editor_draft_publications (
 id TEXT NOT NULL REFERENCES editor_drafts(id),
 content_hash TEXT NOT NULL,
 stock_id TEXT NOT NULL,
 confirmed_at TEXT NOT NULL,
 PRIMARY KEY(id, content_hash)
);
