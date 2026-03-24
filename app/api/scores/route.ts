import { db, type Score } from "@/lib/db";
import { SCOREBOARD_SIZE, MAX_NAME_LENGTH } from "@/lib/constants";
import { NextResponse } from "next/server";

// Node.js runtime — better-sqlite3 needs native Node, not edge
export const runtime = "nodejs";

export function GET() {
  const rows = db
    .prepare(
      `SELECT id, name, attempts, won, created_at
       FROM scores
       WHERE won = 1
       ORDER BY attempts ASC, created_at ASC
       LIMIT ${SCOREBOARD_SIZE}`
    )
    .all() as Score[];

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, attempts, won } = await req.json();

  if (!name || typeof attempts !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const trimmedName = String(name).slice(0, MAX_NAME_LENGTH).trim();

  // Run insert + prune atomically
  const upsert = db.transaction(() => {
    const count = (db.prepare(`SELECT COUNT(*) as n FROM scores WHERE won = 1`).get() as { n: number }).n;

    if (count >= SCOREBOARD_SIZE) {
      const worst = db.prepare(
        `SELECT id, attempts FROM scores WHERE won = 1 ORDER BY attempts DESC, created_at DESC LIMIT 1`
      ).get() as { id: number; attempts: number } | undefined;

      // Only save if better than the current worst
      if (!worst || attempts >= worst.attempts) {
        return false;
      }

      db.prepare(`DELETE FROM scores WHERE id = ?`).run(worst.id);
    }

    db.prepare(`INSERT INTO scores (name, attempts, won) VALUES (?, ?, ?)`).run(trimmedName, attempts, won ? 1 : 0);
    return true;
  });

  const saved = upsert();
  return NextResponse.json({ ok: true, saved });
}
