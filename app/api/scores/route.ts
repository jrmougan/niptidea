import { db, type Score } from "@/lib/db";
import { SCOREBOARD_SIZE, MAX_NAME_LENGTH } from "@/lib/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(req: Request): Response {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty") ?? "facil";

  const rows = db
    .prepare(
      `SELECT id, name, attempts, time_seconds, won, difficulty, created_at
       FROM scores
       WHERE won = 1 AND difficulty = ?
       ORDER BY attempts ASC, time_seconds ASC, created_at ASC
       LIMIT ?`
    )
    .all(difficulty, SCOREBOARD_SIZE) as Score[];

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name, attempts, time_seconds, won, difficulty } = await req.json();

  if (!name || typeof attempts !== "number" || typeof time_seconds !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const trimmedName = String(name).slice(0, MAX_NAME_LENGTH).trim();
  const diff = typeof difficulty === "string" ? difficulty : "facil";

  const upsert = db.transaction(() => {
    const count = (db.prepare(`SELECT COUNT(*) as n FROM scores WHERE won = 1 AND difficulty = ?`).get(diff) as { n: number }).n;

    if (count >= SCOREBOARD_SIZE) {
      const worst = db.prepare(
        `SELECT id, attempts, time_seconds FROM scores WHERE won = 1 AND difficulty = ?
         ORDER BY attempts DESC, time_seconds DESC, created_at DESC LIMIT 1`
      ).get(diff) as { id: number; attempts: number; time_seconds: number } | undefined;

      if (!worst) return false;

      const isWorse =
        attempts > worst.attempts ||
        (attempts === worst.attempts && time_seconds >= worst.time_seconds);

      if (isWorse) return false;

      db.prepare(`DELETE FROM scores WHERE id = ?`).run(worst.id);
    }

    db.prepare(
      `INSERT INTO scores (name, attempts, time_seconds, won, difficulty) VALUES (?, ?, ?, ?, ?)`
    ).run(trimmedName, attempts, time_seconds, won ? 1 : 0, diff);

    return true;
  });

  const saved = upsert();
  return NextResponse.json({ ok: true, saved });
}
