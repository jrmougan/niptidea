import Link from "next/link";
import { LuBrain, LuMessageCircle, LuTarget, LuTrophy, LuMedal, LuTimer } from "react-icons/lu";
import { AI_MODEL, MAX_ATTEMPTS } from "@/lib/constants";
import type { Score } from "@/lib/db";
import { formatTime } from "@/lib/utils";

const steps = [
  { num: "01", icon: LuBrain,          text: "La IA piensa en algo" },
  { num: "02", icon: LuMessageCircle,  text: "Haz preguntas de sí/no" },
  { num: "03", icon: LuTarget,         text: `Adivínalo antes de agotar ${MAX_ATTEMPTS} preguntas` },
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

const DIFFICULTIES = [
  { key: "facil",   label: "FÁCIL"   },
  { key: "medio",   label: "MEDIO"   },
  { key: "dificil", label: "DIFÍCIL" },
];

async function getTopScoresByDifficulty(): Promise<Record<string, Score[]>> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const results = await Promise.all(
    DIFFICULTIES.map(async ({ key }) => {
      try {
        const res = await fetch(`${base}/api/scores?difficulty=${key}`, { cache: "no-store" });
        if (!res.ok) return [key, []] as [string, Score[]];
        const scores: Score[] = await res.json();
        return [key, scores.slice(0, 3)] as [string, Score[]];
      } catch {
        return [key, []] as [string, Score[]];
      }
    }),
  );
  return Object.fromEntries(results);
}

export default async function Home() {
  const topScoresByDifficulty = await getTopScoresByDifficulty();
  return (
    <main className="relative flex flex-col flex-1 items-center justify-center min-h-screen overflow-hidden">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#26a69a 1px, transparent 1px), linear-gradient(90deg, #26a69a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-2xl w-full">
        {/* Brain icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full border border-accent-teal/40 bg-bg-secondary text-accent-teal brain-pulse">
          <LuBrain size={32} />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-accent-orange neon-flicker">
            NiP_t<span className="text-accent-teal [text-shadow:none]">aI</span>dea
          </h1>
          <p className="text-sm text-content-muted font-mono tracking-widest">
            // Akinator te encontraba. NiP_t<span className="text-accent-teal">aI</span>dea te humilla.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <Link
            href="/game"
            className="px-8 py-3 border-2 border-accent-orange text-accent-orange font-mono text-sm tracking-widest uppercase hover:bg-accent-orange/10 hover:shadow-[0_0_28px_rgba(224,90,43,0.55)] transition-all duration-300 glow-orange"
          >
            [ start_game ]
          </Link>
          <Link
            href="/scoreboard"
            className="px-4 py-3 border border-border-default text-content-muted font-mono text-sm tracking-widest hover:border-accent-teal hover:text-accent-teal transition-all duration-200 flex items-center gap-2"
          >
            <LuTrophy size={16} />
            scores
          </Link>
        </div>

        {/* How to play */}
        <div className="mt-4 w-full">
          <p className="text-xs text-accent-teal tracking-[0.3em] uppercase mb-6 text-glow-teal">
            CÓMO_JUGAR
          </p>
          <div className="grid grid-cols-3 gap-4">
            {steps.map(({ num, icon: Icon, text }) => (
              <div
                key={num}
                className="flex flex-col items-center gap-2 p-4 border border-border-default bg-bg-secondary rounded-sm hover:border-accent-orange/40 hover:shadow-[0_0_16px_rgba(224,90,43,0.15)] transition-all duration-300"
              >
                <span className="text-accent-orange text-lg font-bold">{num}</span>
                <Icon size={24} className="text-accent-teal" />
                <p className="text-content-muted text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini scoreboards by difficulty */}
        <div className="w-full mt-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-accent-teal tracking-[0.3em] uppercase text-glow-teal flex items-center gap-2">
              <LuTrophy size={12} />TOP_3
            </p>
            <Link href="/scoreboard" className="text-[10px] text-content-dim font-mono hover:text-accent-teal transition-colors tracking-wider">
              ver todo →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTIES.map(({ key, label }) => {
              const scores = topScoresByDifficulty[key] ?? [];
              return (
                <div key={key} className="flex flex-col border border-border-default">
                  <Link
                    href={`/scoreboard?d=${key}`}
                    className="px-3 py-1.5 border-b border-border-default bg-bg-card text-[10px] font-mono tracking-widest text-content-dim hover:text-accent-teal transition-colors text-center"
                  >
                    [{label}]
                  </Link>
                  {scores.length === 0 ? (
                    <p className="text-center text-content-dim text-[10px] font-mono py-4 px-2">
                      // vacío
                    </p>
                  ) : (
                    <div className="divide-y divide-border-default/50">
                      {scores.map((score, i) => (
                        <div key={score.id} className="flex items-center gap-2 px-2 py-1.5">
                          <LuMedal size={12} style={{ color: MEDAL_COLORS[i] }} className="flex-shrink-0" />
                          <span className="flex-1 font-mono text-[10px] uppercase tracking-wider text-content-primary truncate">
                            {score.name}
                          </span>
                          <span className="font-mono text-[10px] text-content-muted flex-shrink-0">
                            {score.attempts}<span className="text-content-dim">/{MAX_ATTEMPTS}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-content-dim mt-4">
          © NiP_taIdea — powered by {AI_MODEL}
        </p>
      </div>
    </main>
  );
}
