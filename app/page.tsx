import Link from "next/link";
import { LuBrain, LuMessageCircle, LuTarget, LuTrophy } from "react-icons/lu";
import { MAX_ATTEMPTS } from "@/lib/constants";

const steps = [
  { num: "01", icon: LuBrain,          text: "La IA piensa en algo" },
  { num: "02", icon: LuMessageCircle,  text: "Haz preguntas de sí/no" },
  { num: "03", icon: LuTarget,         text: `Adivínalo antes de agotar ${MAX_ATTEMPTS} preguntas` },
];

export default function Home() {
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
        <div className="flex items-center justify-center w-16 h-16 rounded-full border border-accent-teal/40 bg-bg-secondary text-accent-teal glow-teal">
          <LuBrain size={32} />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-accent-orange text-glow-orange">
            NiP_t_aIdea
          </h1>
          <p className="text-sm text-content-muted font-mono tracking-widest">
            // ¿puedes adivinar en qué está pensando la IA?
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <Link
            href="/game"
            className="px-8 py-3 border-2 border-accent-orange text-accent-orange font-mono text-sm tracking-widest uppercase hover:bg-accent-orange hover:text-bg-primary transition-all duration-200 glow-orange"
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
                className="flex flex-col items-center gap-2 p-4 border border-border-default bg-bg-secondary rounded-sm"
              >
                <span className="text-accent-orange text-lg font-bold">{num}</span>
                <Icon size={24} className="text-accent-teal" />
                <p className="text-content-muted text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-content-dim mt-4">
          © NiP_t_aIdea — powered by DeepSeek V3
        </p>
      </div>
    </main>
  );
}
