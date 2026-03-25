"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuBrain, LuSend, LuTimer, LuUsers, LuMapPin, LuPawPrint, LuClapperboard, LuLightbulb } from "react-icons/lu";
import type { IconType } from "react-icons";
import ChatMessage from "@/components/ChatMessage";
import ResultScreen from "@/components/ResultScreen";
import { MAX_ATTEMPTS, TAUNT_THRESHOLDS, GAME_SIGNALS } from "@/lib/constants";
import { formatTime, getMessageText } from "@/lib/utils";


const CATEGORY_ICONS: Record<string, IconType> = {
  persona:  LuUsers,
  lugar:    LuMapPin,
  animal:   LuPawPrint,
  obra:     LuClapperboard,
  concepto: LuLightbulb,
};


async function fetchGameResponse(
  messages: { role: string; content: string }[],
  token?: string,
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...(token && { token }) }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
}

function GameSession({ onRestart, token, category }: { onRestart: () => void; token: string; category: string }) {
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/chat", body: { token } }),
    [token],
  );

  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [revealedConcept, setRevealedConcept] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const loseTriggeredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTimeRef = useRef(0);
  const shownTauntsRef = useRef<Set<number>>(new Set());

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      setIdleSeconds((s) => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onFinish({ message }) {
      const content = getMessageText(message);

      if (/CORRECTO:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedSeconds;
        const match = content.match(/CORRECTO:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        setGameOver("win");
      } else if (/ERA:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedSeconds;
        const match = content.match(/ERA:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        setGameOver("lose");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

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
      })
      .catch(() => setIsStarting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => stopTimer(), []);

  // Scroll to bottom when virtual keyboard opens/closes
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    vv.addEventListener("resize", handler);
    return () => vv.removeEventListener("resize", handler);
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

  // Inject taunts based on idle time
  useEffect(() => {
    if (isStarting || gameOver) return;

    for (const taunt of TAUNT_THRESHOLDS) {
      if (idleSeconds >= taunt.seconds && !shownTauntsRef.current.has(taunt.seconds)) {
        shownTauntsRef.current.add(taunt.seconds);
        setMessages((prev) => [
          ...prev,
          {
            id: `taunt-${taunt.seconds}-${Date.now()}`,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: taunt.message }],
          },
        ]);
      }
    }
  }, [idleSeconds, isStarting, gameOver, setMessages]);

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
          return t !== GAME_SIGNALS.START && t !== GAME_SIGNALS.PLAYER_LOST;
        })
        .map((m) => ({ role: m.role as string, content: getMessageText(m) }));

      fetchGameResponse(
        [...history, { role: "user", content: GAME_SIGNALS.PLAYER_LOST }],
        token,
      )
        .then((response) => {
          stopTimer();
          finalTimeRef.current = elapsedSeconds;
          const match = response.match(/ERA:\s*(.+)/i);
          if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
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
    setAttempts((prev) => prev - 1);
    setIdleSeconds(0);
    shownTauntsRef.current = new Set();
    sendMessage({ text: msg });
  };

  if (gameOver) {
    return (
      <ResultScreen
        result={gameOver}
        concept={revealedConcept}
        attemptsUsed={MAX_ATTEMPTS - attempts}
        timeSeconds={finalTimeRef.current}
        onRestart={onRestart}
      />
    );
  }

  const progressPct = ((MAX_ATTEMPTS - attempts) / MAX_ATTEMPTS) * 100;
  const visibleMessages = messages.filter((m) => {
    const text = getMessageText(m);
    return text !== GAME_SIGNALS.START && text !== GAME_SIGNALS.PLAYER_LOST;
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-primary">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-border-default bg-bg-primary">
        <Link href="/" className="text-accent-orange font-bold text-sm tracking-wide text-glow-orange">
          NiP_t<span className="text-accent-teal [text-shadow:none]">aI</span>dea
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-content-muted">
          <span>
            {"// q: "}
            <span className="text-content-primary">{String(MAX_ATTEMPTS - attempts).padStart(2, "0")}</span>
            {"/"}<span className="text-accent-orange">{MAX_ATTEMPTS}</span>
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

      {/* Category badge */}
      {!isStarting && (() => {
        const Icon = CATEGORY_ICONS[category.toLowerCase()];
        return (
          <div className="relative z-10 flex justify-center py-2 border-b border-border-default/50">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-[11px] font-bold font-mono tracking-widest uppercase leading-none">
              {Icon && <span className="flex items-center"><Icon size={11} /></span>}
              <span>{category}</span>
            </span>
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
            <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-muted">
              <span className="cursor-blink">inicializando</span>
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
          <div className="flex-1 flex items-center gap-2 bg-bg-secondary border border-border-default rounded-sm px-3 py-2 focus-within:border-accent-teal transition-colors">
            <span className="text-content-dim text-xs select-none">{"//"}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="pregunta o adivina..."
              disabled={isLoading || attempts === 0 || isStarting}
              className="flex-1 bg-transparent text-[16px] md:text-sm text-content-primary placeholder-content-dim outline-none font-mono"
              aria-label="Escribe una pregunta o tu respuesta"
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

const SEEN_KEY = "niptaidea_seen";
const SEEN_LIMIT = 20;

function getSeenConcepts(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"); } catch { return []; }
}

function addSeenConcept(concept: string) {
  try {
    const seen = getSeenConcepts().filter((c) => c !== concept);
    localStorage.setItem(SEEN_KEY, JSON.stringify([concept, ...seen].slice(0, SEEN_LIMIT)));
  } catch {}
}

async function initGame(): Promise<{ token: string; category: string }> {
  const r = await fetch("/api/game/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seenConcepts: getSeenConcepts() }),
  });
  const data = await r.json();
  return { token: data.token ?? "", category: data.category ?? "" };
}

export default function GamePage() {
  const [session, setSession] = useState<{ key: number; token: string; category: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    initGame()
      .then(({ token, category }) => { if (!cancelled) setSession({ key: 0, token, category }); })
      .catch(() => { if (!cancelled) setSession({ key: 0, token: "", category: "" }); });
    return () => { cancelled = true; };
  }, []);

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
    initGame()
      .then(({ token, category }) => setSession((s) => ({ key: (s?.key ?? 0) + 1, token, category })))
      .catch(() => setSession((s) => ({ key: (s?.key ?? 0) + 1, token: "", category: "" })));
  };

  return (
    <GameSession
      key={session.key}
      token={session.token}
      category={session.category}
      onRestart={handleRestart}
    />
  );
}
