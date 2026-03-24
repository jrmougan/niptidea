import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "scores.db");

// Singleton — reuse the same connection across hot reloads in dev
const globalForDb = globalThis as unknown as { db: Database.Database };

export const db = globalForDb.db ?? new Database(DB_PATH);

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    attempts   INTEGER NOT NULL,
    won        INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`);

export interface Score {
  id: number;
  name: string;
  attempts: number;
  won: number;
  created_at: string;
}
