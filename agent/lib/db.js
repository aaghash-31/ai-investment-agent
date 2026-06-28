// agent/lib/db.js
import { createClient } from "@libsql/client";

let client;
let initialized = false;

export function getDb() {
  if (client) return client;

  // Turso in production, local SQLite file in development
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    // Local fallback — uses embedded SQLite via libsql
    client = createClient({
      url: "file:data/investiq.db",
    });
  }

  return client;
}

// ─────────────────────────────────────────────────────────
// Initialize tables — idempotent, safe to call on every request
// ─────────────────────────────────────────────────────────
export async function initDb() {
  if (initialized) return getDb();

  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS track_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      verdict TEXT NOT NULL,
      confidence INTEGER,
      entry_price REAL,
      current_price REAL,
      fa_score REAL,
      ta_score REAL,
      news_score REAL,
      rationale TEXT,
      analyst_summary TEXT,
      entry_date TEXT NOT NULL,
      is_backtest INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS paper_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      entry_price REAL NOT NULL,
      current_price REAL,
      verdict TEXT NOT NULL,
      reasoning TEXT,
      entry_date TEXT NOT NULL,
      last_updated TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      added_at TEXT NOT NULL,
      last_verdict TEXT,
      last_price REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  initialized = true;
  return db;
}