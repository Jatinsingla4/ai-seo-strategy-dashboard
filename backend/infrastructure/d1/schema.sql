CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  google_sub TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_filename TEXT,
  competitor_filename TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_keywords (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  volume INTEGER NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  cpc REAL NOT NULL DEFAULT 0,
  priority REAL NOT NULL DEFAULT 0,
  pillar_topic TEXT,
  suggested_title TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS serp_snapshots (
  id TEXT PRIMARY KEY,
  keyword_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  rank INTEGER,
  title TEXT,
  url TEXT,
  competitors_json TEXT NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES project_keywords(id)
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS competitor_imports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS link_suggestions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_pillar TEXT NOT NULL,
  target_cluster TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  pillar TEXT NOT NULL,
  total_volume INTEGER NOT NULL DEFAULT 0,
  avg_difficulty REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS cluster_keywords (
  cluster_id TEXT NOT NULL,
  keyword_id TEXT NOT NULL,
  PRIMARY KEY (cluster_id, keyword_id),
  FOREIGN KEY (cluster_id) REFERENCES clusters(id),
  FOREIGN KEY (keyword_id) REFERENCES project_keywords(id)
);

CREATE TABLE IF NOT EXISTS content_ideas (
  id TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (cluster_id) REFERENCES clusters(id)
);

CREATE TABLE IF NOT EXISTS gap_analysis_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  in_primary_csv INTEGER NOT NULL,
  in_competitor_csv INTEGER NOT NULL,
  opportunity_score REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prompt_template_id TEXT,
  provider TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (prompt_template_id) REFERENCES prompt_templates(id)
);

CREATE TABLE IF NOT EXISTS project_history (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
