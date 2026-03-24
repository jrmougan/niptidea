"use client";

import Link from "next/link";
import { useState } from "react";

interface ResultScreenProps {
  result: "win" | "lose";
  concept: string;
  attemptsUsed: number;
  onRestart: () => void;
}

export default function ResultScreen({
  result,
  concept,
  attemptsUsed,
  onRestart,
}: ResultScreenProps) {
  const isWin = result === "win";
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<boolean | null>(null); // null=pending, true=saved, false=not qualified
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving || saved !== null) return;

    setSaving(true);
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), attempts: attemptsUsed, won: isWin }),
    });
    const data = await res.json();
    setSaved(data.saved === true);
    setSaving(false);
  };

  return (
    <div className="relative flex flex-col h-screen bg-[#141414] items-center justify-center px-4">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[#2e2e2e]">
        <Link href="/" className="text-[#e05a2b] font-bold text-sm tracking-wide text-glow-orange">
          NiP_t_aIdea
        </Link>
        <div className="flex gap-2">
          <Link
            href="/scoreboard"
            className="px-3 py-1 border border-[#26a69a] text-[#26a69a] text-xs font-mono tracking-widest hover:bg-[#26a69a] hover:text-[#141414] transition-all"
          >
            [ scores ]
          </Link>
          <button
            onClick={onRestart}
            className="px-3 py-1 border border-[#e05a2b] text-[#e05a2b] text-xs font-mono tracking-widest hover:bg-[#e05a2b] hover:text-[#141414] transition-all"
          >
            [ restart ]
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md w-full">
        {/* Status icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl border-2 ${
            isWin
              ? "border-[#26a69a] bg-[#26a69a]/10 glow-teal"
              : "border-[#e05a2b] bg-[#e05a2b]/10 glow-orange"
          }`}
        >
          {isWin ? "✓" : "✗"}
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold font-mono tracking-wide ${isWin ? "text-[#f0f0f0]" : "text-[#e05a2b]"}`}>
          {isWin ? "you_guessed_it()" : "game_over()"}
        </h1>

        {/* Concept reveal */}
        <div className="w-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-6 py-4">
          <p className="text-xs text-[#555] mb-2 font-mono">
            {isWin ? "// the answer was..." : "// it was..."}
          </p>
          <p className="text-xl font-bold text-[#e05a2b] text-glow-orange uppercase font-mono">
            {concept || "???"}
          </p>
          <p className="text-xs text-[#555] mt-2 font-mono">
            {isWin
              ? "Vaya, parece que no eres tan torpe después de todo."
              : "Patético. Ni siquiera pudiste adivinarlo con 15 intentos."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-4 py-3">
            <p className="text-[10px] text-[#555] mb-1 font-mono uppercase tracking-wider">preguntas usadas</p>
            <p className="text-2xl font-bold text-[#f0f0f0] font-mono">
              {String(attemptsUsed).padStart(2, "0")}/15
            </p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-4 py-3">
            <p className="text-[10px] text-[#555] mb-1 font-mono uppercase tracking-wider">resultado</p>
            <p className={`text-2xl font-bold font-mono ${isWin ? "text-[#26a69a]" : "text-[#e05a2b]"}`}>
              {isWin ? "WIN" : "LOSE"}
            </p>
          </div>
        </div>

        {/* Save to scoreboard (winners only) */}
        {isWin && (
          <div className="w-full bg-[#1e1e1e] border border-[#26a69a]/30 rounded-sm px-4 py-4">
            {saved === true ? (
              <div className="flex items-center justify-center gap-2 text-[#26a69a] font-mono text-sm">
                <span>✓</span>
                <span>guardado en el scoreboard</span>
              </div>
            ) : saved === false ? (
              <div className="flex items-center justify-center gap-2 text-[#555] font-mono text-sm">
                <span>✗</span>
                <span>no alcanza para el top 10</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-[#26a69a] mb-3 font-mono uppercase tracking-wider">
                  // enter your name
                </p>
                <form onSubmit={handleSave} className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={16}
                    placeholder="AAA"
                    autoFocus
                    className="flex-1 bg-[#141414] border border-[#2e2e2e] focus:border-[#26a69a] px-3 py-2 text-sm text-[#f0f0f0] font-mono outline-none tracking-widest uppercase transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim() || saving}
                    className="px-4 py-2 bg-[#26a69a] text-[#141414] text-xs font-bold font-mono disabled:opacity-40 hover:bg-[#1a7a71] transition-colors"
                  >
                    {saving ? "..." : "SAVE"}
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
            className="flex-1 py-3 bg-[#e05a2b] text-[#141414] text-sm font-bold font-mono tracking-wider hover:bg-[#c94e22] transition-colors"
          >
            ↺ play_again()
          </button>
          <Link
            href="/scoreboard"
            className="flex-1 py-3 border border-[#2e2e2e] text-[#888] text-sm font-mono tracking-wider hover:border-[#26a69a] hover:text-[#26a69a] transition-all text-center"
          >
            ◆ scoreboard
          </Link>
        </div>
      </div>
    </div>
  );
}
