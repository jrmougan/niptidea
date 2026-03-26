"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuBrain, LuSend, LuTimer, LuClapperboard, LuTv, LuMusic, LuUsers, LuGlobe, LuPawPrint, LuUtensils, LuShuffle, LuCircleHelp, LuMessageCircle, LuTarget, LuChevronDown, LuChevronUp, LuMapPin } from "react-icons/lu";
import type { IconType } from "react-icons";
import ChatMessage from "@/components/ChatMessage";
import ResultScreen from "@/components/ResultScreen";
import { MAX_ATTEMPTS, MAX_ATTEMPTS_BY_DIFFICULTY, GAME_SIGNALS, DIFFICULTIES } from "@/lib/constants";
import { formatTime, getMessageText } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useTaunts } from "@/hooks/useTaunts";
import { getSeenConcepts, addSeenConcept } from "@/lib/seenConcepts";
import { trackEvent } from "@/lib/analytics";

const HOW_TO_PLAY_KEY = "niptaidea_howtoplay_seen";

function useHowToPlaySeen() {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    setSeen(localStorage.getItem(HOW_TO_PLAY_KEY) === "1");
  }, []);

  const markSeen = () => {
    localStorage.setItem(HOW_TO_PLAY_KEY, "1");
    setSeen(true);
  };

  return { seen, markSeen };
}


const CATEGORY_ICONS: Record<string, IconType> = {
  película:  LuClapperboard,
  serie:     LuTv,
  canción:   LuMusic,
  personaje: LuUsers,
  país:      LuGlobe,
  animal:    LuPawPrint,
  plato:     LuUtensils,
  lugar:     LuMapPin,
};


async function fetchGameResponse(
  messages: { role: string; content: string }[],
  token?: string,
): Promise<string> {
  const uiMessages = messages.map((m, i) => ({
    id: `plain-${i}`,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: uiMessages, ...(token && { token }) }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
}

function GameSession({ onRestart, token, category, difficulty }: { onRestart: () => void; token: string; category: string; difficulty: string }) {
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/chat", body: { token } }),
    [token],
  );

  const maxAttempts = MAX_ATTEMPTS_BY_DIFFICULTY[difficulty] ?? MAX_ATTEMPTS;
  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(maxAttempts);
  const [lastPlayerMessage, setLastPlayerMessage] = useState<string>("");
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [revealedConcept, setRevealedConcept] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const loseTriggeredRef = useRef(false);
  const finalTimeRef = useRef(0);

  const { elapsed: elapsedSeconds, elapsedRef, idle: idleSeconds, start: startTimer, stop: stopTimer, resetIdle } = useGameTimer();

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onFinish({ message }) {
      const content = getMessageText(message);

      if (/CORRECTO:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedRef.current;
        const match = content.match(/CORRECTO:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        trackEvent("game_win", { category, difficulty, attempts: maxAttempts - attempts, time_seconds: elapsedRef.current, concept: match?.[1].trim() ?? "" });
        setGameOver("win");
      } else if (/ERA:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedRef.current;
        const match = content.match(/ERA:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        trackEvent("game_lose", { category, difficulty, attempts: maxAttempts - attempts, concept: match?.[1].trim() ?? "" });
        setGameOver("lose");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const { reset: resetTaunts } = useTaunts(idleSeconds, !isStarting && !gameOver, setMessages);

  // Auto-start on mount (once)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    fetchGameResponse([{ role: "user", content: GAME_SIGNALS.START }], token)
      .then((intro) => {
        setMessages([
          { id: "msg-start", role: "user", parts: [{ type: "text", text: GAME_SIGNALS.START }] },
          { id: "msg-intro", role: "assistant", parts: [{ type: "text", text: intro }] },
        ]);
        setIsStarting(false);
        startTimer();
        trackEvent("game_start", { category, difficulty });
      })
      .catch(() => setIsStarting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync --app-height CSS variable with visual viewport (handles iOS Safari keyboard)
  useEffect(() => {
    document.documentElement.classList.add("game-active");
    const vv = window.visualViewport;
    const sync = () => {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
      window.scrollTo(0, 0);
    };
    sync();
    vv?.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      document.documentElement.classList.remove("game-active");
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);

  // Restore focus to input after each AI response
  useEffect(() => {
    if (!isLoading && !isStarting && !gameOver) {
      inputRef.current?.focus();
    }
  }, [isLoading, isStarting, gameOver]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStarting]);

  // Trigger lose when attempts hit 0
  useEffect(() => {
    if (
      attempts === 0 &&
      !isLoading &&
      !gameOver &&
      !loseTriggeredRef.current &&
      messages.length > 2
    ) {
      const lastMsg = messages[messages.length - 1];
      const isRealAIResponse = lastMsg?.role === "assistant" && !lastMsg.id.startsWith("taunt-");
      if (!isRealAIResponse) return;

      loseTriggeredRef.current = true;

      const history = messages
        .filter((m) => {
          const t = getMessageText(m);
          return t !== GAME_SIGNALS.START && t !== GAME_SIGNALS.PLAYER_LOST && !t.startsWith(GAME_SIGNALS.HINT_REQUESTED);
        })
        .map((m) => ({ role: m.role as string, content: getMessageText(m) }));

      fetchGameResponse(
        [...history, { role: "user", content: GAME_SIGNALS.PLAYER_LOST }],
        token,
      )
        .then((response) => {
          stopTimer();
          finalTimeRef.current = elapsedRef.current;
          const match = response.match(/ERA:\s*(.+)/i);
          if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
          trackEvent("game_lose", { category, difficulty, attempts: maxAttempts, concept: match?.[1].trim() ?? "" });
          setMessages((prev) => [
            ...prev,
            { id: "msg-game-over", role: "assistant" as const, parts: [{ type: "text" as const, text: response }] },
          ]);
          setGameOver("lose");
        })
        .catch(() => setGameOver("lose"));
    }
  }, [attempts, isLoading, messages, gameOver, token, elapsedSeconds, stopTimer, setMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || gameOver || attempts === 0) return;

    const msg = inputValue.trim();
    setInputValue("");
    setLastPlayerMessage(msg);
    setAttempts((prev) => prev - 1);
    resetIdle();
    resetTaunts();
    sendMessage({ text: msg });
  };

  const handleHint = () => {
    if (isLoading || gameOver || attempts <= 1 || isStarting) return;
    const remaining = attempts - 1;
    setAttempts((prev) => prev - 1);
    resetIdle();
    resetTaunts();
    trackEvent("hint_used", { difficulty, attempts_remaining: remaining });
    sendMessage({ text: `${GAME_SIGNALS.HINT_REQUESTED}:${remaining}` });
  };

  if (gameOver) {
    return (
      <ResultScreen
        result={gameOver}
        concept={revealedConcept}
        attemptsUsed={maxAttempts - attempts}
        timeSeconds={finalTimeRef.current}
        difficulty={difficulty}
        onRestart={onRestart}
        lastPlayerGuess={lastPlayerMessage}
      />
    );
  }

  const progressPct = ((maxAttempts - attempts) / maxAttempts) * 100;
  const visibleMessages = messages.filter((m) => {
    const text = getMessageText(m);
    return text !== GAME_SIGNALS.START && text !== GAME_SIGNALS.PLAYER_LOST && !text.startsWith(GAME_SIGNALS.HINT_REQUESTED);
  });

  return (
    <div className="flex flex-col bg-bg-primary fixed inset-x-0 top-0 overflow-hidden h-[var(--app-height,100dvh)]">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border-default bg-bg-primary">
        <Link href="/" className="text-accent-orange font-bold text-sm tracking-wide text-glow-orange">
          NiPt<span className="text-accent-teal [text-shadow:none]">AI</span>dea
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-content-muted">
          <span>
            {"// q: "}
            <span className="text-content-primary">{String(maxAttempts - attempts).padStart(2, "0")}</span>
            {"/"}<span className="text-accent-orange">{maxAttempts}</span>
          </span>
          <span className="flex items-center gap-1">
            <LuTimer size={12} className={elapsedSeconds > 0 && !isStarting ? "text-accent-teal" : "text-content-dim"} />
            <span className={elapsedSeconds > 0 && !isStarting ? "text-accent-teal" : "text-content-dim"}>
              {formatTime(elapsedSeconds)}
            </span>
          </span>
        </div>

        <button
          onClick={onRestart}
          className="px-3 py-1 border border-accent-orange text-accent-orange text-xs font-mono tracking-widest hover:bg-accent-orange hover:text-bg-primary transition-all"
        >
          [ restart ]
        </button>
      </header>

      {/* Category banner */}
      {(() => {
        const Icon = CATEGORY_ICONS[category.toLowerCase()] ?? LuBrain;
        return (
          <div className="relative z-10 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 px-4 py-4 border-b border-accent-teal/30 bg-accent-teal/5">
            <div className="flex items-center gap-3">
              <Icon size={28} className="text-accent-teal drop-shadow-[0_0_8px_rgba(38,166,154,0.6)]" aria-hidden="true" />
              <span className="text-2xl font-bold font-mono tracking-widest uppercase text-accent-teal drop-shadow-[0_0_12px_rgba(38,166,154,0.5)]">
                {category}
              </span>
            </div>
            <p className="text-[10px] text-content-dim font-mono tracking-[0.2em]">
              // adivina haciendo preguntas de sí / no
            </p>
          </div>
        );
      })()}

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isStarting ? (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-teal/50 bg-bg-secondary flex items-center justify-center text-accent-teal brain-pulse">
              <LuBrain size={16} />
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-primary leading-relaxed max-w-xs sm:max-w-sm">
              <p>
                Estoy pensando en algo de <span className="text-accent-teal font-bold uppercase tracking-wider">{category}</span>...
              </p>
              <p className="mt-1 text-content-muted">
                Hazme preguntas de <span className="text-content-primary">sí/no</span> para descubrirlo. Tienes <span className="text-accent-orange font-bold">{maxAttempts} intentos</span>.
              </p>
              <p className="mt-2 text-[11px] text-content-dim tracking-wide">
                <span className="cursor-blink">preparando partida</span>
              </p>
            </div>
          </div>
        ) : (
          visibleMessages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-teal/50 bg-bg-secondary flex items-center justify-center text-accent-teal brain-pulse">
              <LuBrain size={16} />
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-muted">
              <span className="cursor-blink">pensando</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-2">
        <div className="flex justify-between text-[10px] text-content-dim mb-1">
          <span>intentos</span>
          <span className={attempts <= 3 ? "text-accent-orange" : "text-content-muted"}>
            {attempts} restantes
          </span>
        </div>
        <div className="h-1 bg-border-default rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${attempts <= 3 ? "bg-accent-orange" : "bg-accent-teal"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-border-default bg-bg-primary px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            onClick={handleHint}
            disabled={isLoading || attempts <= 1 || isStarting || !!gameOver}
            title="Pedir pista (cuesta 1 intento)"
            aria-label="Pedir pista (cuesta 1 intento)"
            className="px-3 py-2 border border-accent-teal text-accent-teal text-xs font-mono disabled:opacity-30 hover:bg-accent-teal hover:text-bg-primary transition-all flex items-center gap-1.5"
          >
            <LuCircleHelp size={14} />
            <span className="hidden sm:inline text-[10px] tracking-wider">pista <span className="text-accent-teal/60">(-1)</span></span>
          </button>
          <div className="flex-1 flex items-center gap-2 bg-bg-secondary border border-border-default rounded-sm px-3 py-2 focus-within:border-accent-teal transition-colors">
            <span className="text-content-dim text-xs select-none">{"//"}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="ej: ¿es una persona? / ¿es real?"
              disabled={isLoading || attempts === 0 || isStarting}
              className="flex-1 bg-transparent text-[16px] md:text-sm text-content-primary placeholder-content-muted outline-none font-mono"
              aria-label="Escribe una pregunta de sí/no o tu respuesta directa"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || attempts === 0 || isStarting}
            className="px-4 py-2 bg-accent-orange text-bg-primary text-xs font-bold font-mono tracking-wider disabled:opacity-40 hover:bg-accent-orange-hover transition-colors"
          aria-label="Enviar"
          >
            <LuSend size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

async function initGame(category?: string, subcategory?: string, difficulty?: string): Promise<{ token: string; category: string; subcategory?: string }> {
  const r = await fetch("/api/game/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seenConcepts: getSeenConcepts(),
      ...(category && { category }),
      ...(subcategory && { subcategory }),
      ...(difficulty && { difficulty }),
    }),
  });
  const data = await r.json();
  return { token: data.token ?? "", category: data.category ?? "", subcategory: data.subcategory };
}

const RANDOM_CATEGORY = "__random__";

export default function GamePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("medio");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ key: number; token: string; category: string; difficulty: string } | null>(null);
  const { seen: howToPlaySeen, markSeen: markHowToPlaySeen } = useHowToPlaySeen();
  // Controlled open state: starts open for first-timers, closed for returning users
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  // Sync open state once we know whether the user has seen it
  useEffect(() => {
    if (howToPlaySeen === false) setHowToPlayOpen(true);
  }, [howToPlaySeen]);

  const handleDismissHowToPlay = () => {
    markHowToPlaySeen();
    setHowToPlayOpen(false);
  };

  const handleToggleHowToPlay = () => {
    setHowToPlayOpen((prev) => !prev);
  };

  const startGame = () => {
    setLoading(true);
    const categoryArg = selectedCategory && selectedCategory !== RANDOM_CATEGORY ? selectedCategory : undefined;
    const subcategoryArg = categoryArg && selectedSubcategory ? selectedSubcategory : undefined;
    initGame(categoryArg, subcategoryArg, selectedDifficulty)
      .then(({ token, category, subcategory }) =>
        setSession((s) => ({ key: (s?.key ?? 0) + 1, token, category: subcategory ? `${category} › ${subcategory}` : category, difficulty: selectedDifficulty }))
      )
      .catch(() =>
        setSession((s) => ({ key: (s?.key ?? 0) + 1, token: "", category: "", difficulty: selectedDifficulty }))
      );
  };

  // Category + difficulty selector
  if (!loading && !session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg-primary px-4 py-8">
        <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6 font-mono text-center w-full max-w-md">

          {/* Logo */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold text-accent-orange neon-flicker tracking-wide">
              NiPt<span className="text-accent-teal [text-shadow:none]">AI</span>dea
            </h1>
            <p className="text-[11px] text-content-dim tracking-[0.25em]">// select_category</p>
          </div>

          {/* How-to-play panel — auto-expanded for first-timers, collapsible for returning users */}
          {howToPlaySeen !== null && (
            <div className="w-full border border-accent-teal/30 bg-accent-teal/5">
              <button
                onClick={handleToggleHowToPlay}
                aria-expanded={howToPlayOpen}
                aria-controls="how-to-play-body"
                className="w-full flex items-center justify-between px-4 py-2.5 text-accent-teal hover:bg-accent-teal/10 transition-colors"
              >
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase">cómo_jugar</span>
                {howToPlayOpen
                  ? <LuChevronUp size={13} aria-hidden="true" />
                  : <LuChevronDown size={13} aria-hidden="true" />}
              </button>

              {howToPlayOpen && (
                <div id="how-to-play-body" className="border-t border-accent-teal/20 px-4 pt-3 pb-4 flex flex-col gap-4">

                  {/* Step 1 — The AI picks a concept */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 mt-px flex items-center justify-center border border-accent-teal/40 text-accent-teal text-[10px] font-bold leading-none">1</span>
                    <div className="flex flex-col gap-1 text-left">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-accent-teal uppercase tracking-wider">
                        <LuBrain size={12} aria-hidden="true" />
                        La IA elige un concepto secreto
                      </p>
                      <p className="text-[11px] text-content-muted leading-relaxed">
                        De la categoría que selecciones — tú no sabes cuál es.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 — Ask yes/no questions */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 mt-px flex items-center justify-center border border-accent-teal/40 text-accent-teal text-[10px] font-bold leading-none">2</span>
                    <div className="flex flex-col gap-2 text-left">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-accent-teal uppercase tracking-wider">
                        <LuMessageCircle size={12} aria-hidden="true" />
                        Haz preguntas de sí / no
                      </p>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-content-dim tracking-wider uppercase">ejemplos:</p>
                        <ul className="flex flex-col gap-1" aria-label="Ejemplos de preguntas">
                          <li className="font-mono text-[11px] text-content-primary bg-bg-primary border border-border-default px-2 py-1">
                            // ¿es una persona real?
                          </li>
                          <li className="font-mono text-[11px] text-content-primary bg-bg-primary border border-border-default px-2 py-1">
                            // ¿ocurrió antes del siglo XX?
                          </li>
                          <li className="font-mono text-[11px] text-content-primary bg-bg-primary border border-border-default px-2 py-1">
                            // ¿lo puedes comer?
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 — Guess directly */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 mt-px flex items-center justify-center border border-accent-orange/60 text-accent-orange text-[10px] font-bold leading-none">3</span>
                    <div className="flex flex-col gap-1 text-left">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-accent-orange uppercase tracking-wider">
                        <LuTarget size={12} aria-hidden="true" />
                        Adivina cuando creas saberlo
                      </p>
                      <p className="text-[11px] text-content-muted leading-relaxed">
                        Escribe el nombre directamente en cualquier momento:
                      </p>
                      <p className="font-mono text-[11px] text-accent-orange bg-accent-orange/5 border border-accent-orange/30 px-2 py-1">
                        // ¿es el Titanic?
                      </p>
                      <p className="text-[10px] text-content-dim leading-relaxed mt-0.5">
                        Adivinar también consume 1 intento.
                      </p>
                    </div>
                  </div>

                  {/* Attempts + hint callout */}
                  <div className="border border-border-default bg-bg-primary px-3 py-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-content-dim uppercase tracking-wider">intentos por dificultad</span>
                    </div>
                    <div className="flex gap-2">
                      {DIFFICULTIES.map(({ key, label }) => {
                        const count = MAX_ATTEMPTS_BY_DIFFICULTY[key] ?? MAX_ATTEMPTS;
                        return (
                          <div key={key} className="flex-1 flex flex-col items-center gap-1 border border-border-default py-1.5">
                            <span className="text-[9px] text-content-dim uppercase tracking-wider">{label}</span>
                            <span className="font-mono text-sm font-bold text-accent-teal">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="flex items-center gap-1.5 text-[10px] text-content-muted leading-relaxed">
                      <LuCircleHelp size={11} className="flex-shrink-0 text-accent-teal" aria-hidden="true" />
                      El botón <span className="font-mono text-content-primary px-0.5">pista</span> revela una pista — cuesta 1 intento.
                    </p>
                  </div>

                  {!howToPlaySeen && (
                    <button
                      onClick={handleDismissHowToPlay}
                      className="self-end text-[10px] text-content-dim hover:text-accent-teal transition-colors tracking-wider"
                    >
                      [ entendido, no mostrar más ]
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-content-muted leading-relaxed max-w-xs">
            Elige una categoría para que la IA piense en algo<br />e intenta adivinarlo a base de preguntas.
          </p>

          {/* Category grid */}
          <div className="grid grid-cols-4 gap-2 w-full">
            {Object.entries(CATEGORIES).map(([name]) => {
              const Icon = CATEGORY_ICONS[name.toLowerCase()];
              const isSelected = selectedCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => { setSelectedCategory(isSelected ? null : name); setSelectedSubcategory(null); }}
                  className={`flex flex-col items-center gap-2 px-2 py-3 border transition-all ${
                    isSelected
                      ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                      : "border-border-default bg-bg-secondary text-content-muted hover:border-border-default/80 hover:text-content-primary"
                  }`}
                >
                  {Icon && <Icon size={18} />}
                  <span className="text-[10px] tracking-wider uppercase leading-none">{name}</span>
                </button>
              );
            })}
            {/* Sorpréndeme — ocupa el espacio restante en la última fila */}
            <button
              onClick={() => { setSelectedCategory(selectedCategory === RANDOM_CATEGORY ? null : RANDOM_CATEGORY); setSelectedSubcategory(null); }}
              className={`col-span-4 flex items-center justify-center gap-2 px-3 py-3 border transition-all text-xs tracking-wider ${
                selectedCategory === RANDOM_CATEGORY
                  ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                  : "border-border-default bg-bg-secondary text-content-muted hover:text-content-primary"
              }`}
            >
              <LuShuffle size={14} />
              Sorpréndeme
            </button>
          </div>

          {/* Subcategory chips — only when the selected category has subcategories */}
          {selectedCategory && selectedCategory !== RANDOM_CATEGORY && CATEGORIES[selectedCategory]?.subcategories && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-[11px] text-content-dim tracking-[0.25em]">// subcategory <span className="text-content-dim/50">(opcional)</span></p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORIES[selectedCategory].subcategories!).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
                    className={`px-3 py-1.5 border text-[10px] tracking-wider uppercase transition-all ${
                      selectedSubcategory === sub
                        ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                        : "border-border-default bg-bg-secondary text-content-muted hover:text-content-primary"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="w-full flex flex-col gap-3">
            <p className="text-[11px] text-content-dim tracking-[0.25em]">// difficulty_level</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 border transition-all ${
                    selectedDifficulty === key
                      ? "border-accent-teal text-accent-teal bg-accent-teal/5"
                      : "border-border-default text-content-muted hover:border-border-default/80 hover:text-content-primary"
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-widest">[{label}]</span>
                  <span className="text-[9px] text-content-dim leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            disabled={!selectedCategory}
            className="w-full py-3 bg-accent-orange text-bg-primary text-sm font-bold tracking-wider disabled:opacity-30 hover:bg-accent-orange-hover transition-colors"
          >
            {`> start_game(${!selectedCategory || selectedCategory === RANDOM_CATEGORY ? "random" : selectedCategory.toLowerCase()}${selectedSubcategory ? `›${selectedSubcategory.toLowerCase()}` : ""}, ${selectedDifficulty})`}
          </button>
        </div>
      </div>
    );
  }

  // Loading screen
  if (!session) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg-primary">
        <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
        <div className="flex flex-col items-center gap-6 font-mono text-center px-4">
          <div className="w-16 h-16 rounded-full border border-accent-teal/40 bg-bg-secondary text-accent-teal brain-pulse flex items-center justify-center">
            <LuBrain size={28} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-accent-teal tracking-[0.3em] uppercase">concepto seleccionado</p>
            <p className="text-2xl font-bold text-accent-orange neon-flicker tracking-widest">[ 🤔 ]</p>
            <p className="text-xs text-content-dim mt-1">¡No leas mi mente!</p>
          </div>
          <span className="text-content-muted text-sm cursor-blink">preparando partida</span>
        </div>
      </div>
    );
  }

  const handleRestart = () => {
    setSession(null);
    setSelectedCategory(null);
    setLoading(false);
  };

  return (
    <GameSession
      key={session.key}
      token={session.token}
      category={session.category}
      difficulty={session.difficulty}
      onRestart={handleRestart}
    />
  );
}
