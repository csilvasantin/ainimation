CREATE TABLE IF NOT EXISTS interactive_deliveries (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, project_id TEXT NOT NULL,
 project_revision INTEGER NOT NULL, sha256 TEXT NOT NULL, project TEXT NOT NULL,
 location TEXT NOT NULL, screen TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(owner,project_id,project_revision,sha256,location,screen)
);
