import "server-only";
import { db, type Score } from "@/lib/db";
import { SCOREBOARD_SIZE, DIFFICULTIES, DEFAULT_DIFFICULTY } from "@/lib/constants";

const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES.map((d) => d.key));

/**
 * Query the scoreboard for a given difficulty directly from the database.
 * Returns an empty array on any error.
 */
export function fetchScores(difficulty: string): Score[] {
  const diff = VALID_DIFFICULTIES.has(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
  try {
    return db
      .prepare(
        `SELECT id, name, attempts, time_seconds, won, difficulty, created_at
         FROM scores
         WHERE won = 1 AND difficulty = ?
         ORDER BY attempts ASC, time_seconds ASC, created_at ASC
         LIMIT ?`
      )
      .all(diff, SCOREBOARD_SIZE) as Score[];
  } catch {
    return [];
  }
}
