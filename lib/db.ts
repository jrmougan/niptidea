import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "scores.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Singleton — reuse the same connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export const db = globalThis.__db ?? new Database(DB_PATH);

if (process.env.NODE_ENV !== "production") globalThis.__db = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    attempts     INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL DEFAULT 0,
    won          INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`);

// Non-destructive migrations
const cols = (db.prepare(`PRAGMA table_info(scores)`).all() as { name: string }[]).map(c => c.name);
if (!cols.includes("time_seconds")) {
  db.exec(`ALTER TABLE scores ADD COLUMN time_seconds INTEGER NOT NULL DEFAULT 0;`);
}
if (!cols.includes("difficulty")) {
  db.exec(`ALTER TABLE scores ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'facil';`);
}

export interface Score {
  id: number;
  name: string;
  attempts: number;
  time_seconds: number;
  won: number;
  difficulty: string;
  created_at: string;
}
