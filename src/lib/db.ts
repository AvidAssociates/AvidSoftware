import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "avid.db");

declare global {
  var __avidDb: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS recruiters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sendouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      candidate TEXT NOT NULL,
      company TEXT NOT NULL,
      role TEXT,
      type TEXT,
      recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
      am_recruiter_id INTEGER REFERENCES recruiters(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS billings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
      amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'placement',
      personal INTEGER NOT NULL DEFAULT 1,
      candidate TEXT,
      company TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
      amount REAL NOT NULL,
      company TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const recruiterCount = db
    .prepare("SELECT COUNT(*) as c FROM recruiters")
    .get() as { c: number };
  if (recruiterCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO recruiters (name, sort_order) VALUES (?, ?)"
    );
    ["Brad", "Joe", "Reid", "Matt", "Justice"].forEach((name, i) =>
      insert.run(name, i)
    );
  }

  const goalRow = db
    .prepare("SELECT value FROM settings WHERE key = 'annual_goal'")
    .get();
  if (!goalRow) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('annual_goal', ?)").run(
      "1300000"
    );
  }

  return db;
}

export function getDb() {
  if (!global.__avidDb) {
    global.__avidDb = createConnection();
  }
  return global.__avidDb;
}
