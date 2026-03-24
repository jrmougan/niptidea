import Link from "next/link";
import type { Score } from "@/lib/db";
import { LuTrophy, LuMedal, LuRefreshCw, LuArrowLeft, LuTimer } from "react-icons/lu";
import { MAX_ATTEMPTS, SCOREBOARD_SIZE } from "@/lib/constants";
import { formatTime } from "@/lib/utils";

async function getScores(): Promise<Score[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/scores`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Error cargando clasificación: ${res.status}`);
  return res.json();
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];


export default async function ScoreboardPage() {
  const scores = await getScores();

  return (
    <main className="relative flex flex-col min-h-screen bg-bg-primary items-center justify-start pt-16 pb-12 px-4">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Subtle grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#26a69a 1px, transparent 1px), linear-gradient(90deg, #26a69a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <LuTrophy size={40} className="text-accent-orange" />
          <h1 className="text-3xl font-bold font-mono text-accent-orange text-glow-orange tracking-wider">
            CLASIFICACIÓN
          </h1>
          <p className="text-xs text-content-dim font-mono tracking-widest">
            {`// top ${SCOREBOARD_SIZE} — menos preguntas gana`}
          </p>
        </div>

        {/* Scoreboard table */}
        <div className="w-full border border-border-default bg-bg-secondary">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_4rem_4rem_5rem] gap-3 px-4 py-2 border-b border-border-default bg-bg-card">
            <span className="text-[10px] text-content-dim font-mono uppercase tracking-wider">#</span>
            <span className="text-[10px] text-content-dim font-mono uppercase tracking-wider">nombre</span>
            <span className="text-[10px] text-content-dim font-mono uppercase tracking-wider text-right">pregs</span>
            <span className="text-[10px] text-content-dim font-mono uppercase tracking-wider text-right flex items-center justify-end gap-1"><LuTimer size={10} />tiempo</span>
            <span className="text-[10px] text-content-dim font-mono uppercase tracking-wider text-right">fecha</span>
          </div>

          {scores.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-content-dim font-mono text-sm">// no hay scores todavía</p>
              <p className="text-content-dim/60 font-mono text-xs mt-1">sé el primero en jugar</p>
            </div>
          ) : (
            scores.map((score, i) => (
              <div
                key={score.id}
                className={`grid grid-cols-[2rem_1fr_4rem_4rem_5rem] gap-3 px-4 py-3 border-b border-border-default/50 last:border-0 transition-colors ${
                  i === 0 ? "bg-accent-teal/5" : ""
                }`}
              >
                {/* Rank */}
                <span className="font-mono text-sm self-center flex items-center justify-center">
                  {i < 3 ? (
                    <LuMedal size={18} style={{ color: MEDAL_COLORS[i] }} />
                  ) : (
                    <span className="text-content-dim">{String(i + 1).padStart(2, "0")}</span>
                  )}
                </span>

                {/* Name */}
                <span
                  className={`font-mono text-sm uppercase tracking-wider self-center truncate ${
                    i === 0 ? "text-accent-teal text-glow-teal" : "text-content-primary"
                  }`}
                >
                  {score.name}
                </span>

                {/* Attempts */}
                <span className="font-mono text-sm text-right self-center">
                  <span className={i === 0 ? "text-accent-orange" : "text-content-muted"}>
                    {score.attempts}
                  </span>
                  <span className="text-content-dim">/{MAX_ATTEMPTS}</span>
                </span>

                {/* Time */}
                <span className="font-mono text-sm text-right self-center text-accent-teal">
                  {formatTime(score.time_seconds)}
                </span>

                {/* Date */}
                <span className="font-mono text-[11px] text-content-dim text-right self-center">
                  {new Date(score.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <Link
            href="/game"
            className="flex-1 py-3 bg-accent-orange text-bg-primary text-sm font-bold font-mono tracking-wider hover:bg-accent-orange-hover transition-colors text-center"
          >
            <LuRefreshCw size={14} className="inline mr-2" />jugar_de_nuevo()
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 border border-border-default text-content-muted text-sm font-mono tracking-wider hover:border-content-dim hover:text-content-primary transition-all text-center"
          >
            <LuArrowLeft size={14} className="inline mr-2" />inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
