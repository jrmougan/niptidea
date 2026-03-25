"use client";

import Link from "next/link";
import { useState } from "react";
import { LuCheck, LuX, LuRefreshCw, LuTrophy, LuTimer } from "react-icons/lu";
import { MAX_ATTEMPTS, MAX_NAME_LENGTH, SCOREBOARD_SIZE } from "@/lib/constants";
import { formatTime } from "@/lib/utils";

interface ResultScreenProps {
  result: "win" | "lose";
  concept: string;
  attemptsUsed: number;
  timeSeconds: number;
  onRestart: () => void;
}

export default function ResultScreen({
  result,
  concept,
  attemptsUsed,
  timeSeconds,
  onRestart,
}: ResultScreenProps) {
  const isWin = result === "win";
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving || saved !== null) return;

    setSaving(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), attempts: attemptsUsed, time_seconds: timeSeconds, won: isWin }),
      });
      const data = await res.json();
      setSaved(data.saved === true);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen bg-bg-primary items-center justify-center px-4">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border-default">
        <Link href="/" className="text-accent-orange font-bold text-sm tracking-wide text-glow-orange">
          NiP_t<span className="text-accent-teal [text-shadow:none]">aI</span>dea
        </Link>
        <div className="flex gap-2">
          <Link
            href="/scoreboard"
            className="px-3 py-1 border border-accent-teal text-accent-teal text-xs font-mono tracking-widest hover:bg-accent-teal hover:text-bg-primary transition-all"
          >
            [ scores ]
          </Link>
          <button
            onClick={onRestart}
            className="px-3 py-1 border border-accent-orange text-accent-orange text-xs font-mono tracking-widest hover:bg-accent-orange hover:text-bg-primary transition-all"
          >
            [ restart ]
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md w-full">
        {/* Status icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
            isWin
              ? "border-accent-teal bg-accent-teal/10 glow-teal"
              : "border-accent-orange bg-accent-orange/10 glow-orange"
          }`}
        >
          {isWin ? <LuCheck size={32} /> : <LuX size={32} />}
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold font-mono tracking-wide ${isWin ? "text-content-primary" : "text-accent-orange"}`}>
          {isWin ? "lo_has_adivinado()" : "fin_del_juego()"}
        </h1>

        {/* Concept reveal */}
        <div className="w-full bg-bg-secondary border border-border-default rounded-sm px-6 py-4">
          <p className="text-xs text-content-dim mb-2 font-mono">
            {isWin ? "// la respuesta era..." : "// era..."}
          </p>
          <p className="text-xl font-bold text-accent-orange text-glow-orange uppercase font-mono">
            {concept || "???"}
          </p>
          <p className="text-xs text-content-dim mt-2 font-mono">
            {isWin
              ? "Vaya, parece que no eres tan torpe después de todo."
              : `Patético. Ni siquiera pudiste adivinarlo con ${MAX_ATTEMPTS} intentos.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="bg-bg-secondary border border-border-default rounded-sm px-3 py-3">
            <p className="text-[10px] text-content-dim mb-1 font-mono uppercase tracking-wider">preguntas</p>
            <p className="text-xl font-bold text-content-primary font-mono">
              {String(attemptsUsed).padStart(2, "0")}<span className="text-content-dim text-sm">/{MAX_ATTEMPTS}</span>
            </p>
          </div>
          <div className="bg-bg-secondary border border-border-default rounded-sm px-3 py-3">
            <p className="text-[10px] text-content-dim mb-1 font-mono uppercase tracking-wider flex items-center gap-1 justify-center">
              <LuTimer size={10} />tiempo
            </p>
            <p className="text-xl font-bold text-accent-teal font-mono">{formatTime(timeSeconds)}</p>
          </div>
          <div className="bg-bg-secondary border border-border-default rounded-sm px-3 py-3">
            <p className="text-[10px] text-content-dim mb-1 font-mono uppercase tracking-wider">resultado</p>
            <p className={`text-xl font-bold font-mono ${isWin ? "text-accent-teal" : "text-accent-orange"}`}>
              {isWin ? "GANADO" : "PERDIDO"}
            </p>
          </div>
        </div>

        {/* Save to scoreboard (winners only) */}
        {isWin && (
          <div className="w-full bg-bg-secondary border border-accent-teal/30 rounded-sm px-4 py-4">
            {saved === true ? (
              <div className="flex items-center justify-center gap-2 text-accent-teal font-mono text-sm">
                <LuCheck size={14} />
                <span>guardado en la clasificación</span>
              </div>
            ) : saved === false ? (
              <div className="flex items-center justify-center gap-2 text-content-dim font-mono text-sm">
                <LuX size={14} />
                <span>no alcanza para el top {SCOREBOARD_SIZE}</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-accent-teal mb-3 font-mono uppercase tracking-wider">
                  // escribe tu nombre
                </p>
                <form onSubmit={handleSave} className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="AAA"
                    autoFocus
                    aria-label="Tu nombre para la clasificación"
                    className="flex-1 bg-bg-primary border border-border-default focus:border-accent-teal px-3 py-2 text-sm text-content-primary font-mono outline-none tracking-widest uppercase transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim() || saving}
                    className="px-4 py-2 bg-accent-teal text-bg-primary text-xs font-bold font-mono disabled:opacity-40 hover:bg-accent-teal-dim transition-colors"
                  >
                    {saving ? "..." : "GUARDAR"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-accent-orange text-bg-primary text-sm font-bold font-mono tracking-wider hover:bg-accent-orange-hover transition-colors"
          >
            <LuRefreshCw size={14} className="inline mr-2" />jugar_de_nuevo()
          </button>
          <Link
            href="/scoreboard"
            className="flex-1 py-3 border border-border-default text-content-muted text-sm font-mono tracking-wider hover:border-accent-teal hover:text-accent-teal transition-all text-center"
          >
            <LuTrophy size={14} className="inline mr-2" />clasificación
          </Link>
        </div>
      </div>
    </div>
  );
}
