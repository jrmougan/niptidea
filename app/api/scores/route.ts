import { db, type Score } from "@/lib/db";
import { SCOREBOARD_SIZE, MAX_NAME_LENGTH, DIFFICULTIES, DEFAULT_DIFFICULTY } from "@/lib/constants";
import { NextResponse } from "next/server";

const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES.map((d) => d.key));

export const runtime = "nodejs";

export function GET(req: Request): Response {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("difficulty") ?? DEFAULT_DIFFICULTY;
  const difficulty = VALID_DIFFICULTIES.has(raw) ? raw : DEFAULT_DIFFICULTY;

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, attempts, time_seconds, won, difficulty } = (body as Record<string, unknown>);

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof attempts !== "number" ||
    !Number.isFinite(attempts) ||
    typeof time_seconds !== "number" ||
    !Number.isFinite(time_seconds) ||
    typeof won !== "boolean" ||
    (typeof difficulty !== "string" || !VALID_DIFFICULTIES.has(difficulty))
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const trimmedName = name.slice(0, MAX_NAME_LENGTH).trim();
  const diff = difficulty;

  try {
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
          (attempts === worst.attempts && (time_seconds as number) >= worst.time_seconds);

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
  } catch (err) {
    console.error("[scores] DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
