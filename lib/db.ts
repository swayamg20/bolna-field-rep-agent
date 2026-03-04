import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'fieldpulse.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bolna_agent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reps (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      territory TEXT NOT NULL,
      performance_score REAL NOT NULL DEFAULT 0,
      total_calls INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      rep_id TEXT NOT NULL REFERENCES reps(id),
      team_id TEXT NOT NULL REFERENCES teams(id),
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      last_order_date TEXT,
      last_order_value REAL,
      days_since_order INTEGER NOT NULL DEFAULT 0,
      flag TEXT NOT NULL DEFAULT 'normal' CHECK(flag IN ('normal', 'at_risk', 'lost')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      rep_id TEXT NOT NULL REFERENCES reps(id),
      team_id TEXT NOT NULL REFERENCES teams(id),
      bolna_execution_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'calling', 'completed', 'failed')),
      call_summary TEXT,
      transcript TEXT,
      stores_visited_count INTEGER,
      store_reports TEXT,
      competitor_activity TEXT,
      challenges TEXT,
      rep_engagement_score INTEGER,
      follow_up_needed TEXT,
      raw_extraction TEXT,
      called_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS processing_logs (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      call_id TEXT REFERENCES calls(id),
      rep_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      category TEXT NOT NULL DEFAULT 'info' CHECK(category IN ('info', 'extraction', 'scoring', 'store_health', 'alert', 'competitor')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id),
      type TEXT NOT NULL CHECK(type IN ('at_risk_store', 'low_engagement', 'competitor_threat', 'missed_visits')),
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      title TEXT NOT NULL,
      description TEXT,
      related_rep_id TEXT REFERENCES reps(id),
      related_store_id TEXT REFERENCES stores(id),
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}
