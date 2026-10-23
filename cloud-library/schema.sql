CREATE TABLE IF NOT EXISTS interactive_projects (
 owner TEXT NOT NULL,
 id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision > 0),
 project TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 source_device TEXT,
 PRIMARY KEY(owner,id)
);
