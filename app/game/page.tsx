"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuBrain, LuSend, LuTimer, LuUsers, LuBox, LuLightbulb } from "react-icons/lu";
import type { IconType } from "react-icons";
import ChatMessage from "@/components/ChatMessage";
import ResultScreen from "@/components/ResultScreen";
import { MAX_ATTEMPTS, TAUNT_THRESHOLDS } from "@/lib/constants";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const CATEGORY_ICONS: Record<string, IconType> = {
  persona: LuUsers,
  objeto: LuBox,
  concepto: LuLightbulb,
};

function parseCategory(messages: ReturnType<typeof Array.prototype.filter>): string | null {
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const textPart = msg.parts?.find((p: { type: string }) => p.type === "text");
    const text: string = textPart && "text" in textPart ? textPart.text : "";
    const match = text.match(/CATEGOR[ÍI]A:\s*(\w+)/i);
    if (match) return match[1];
  }
  return null;
}

async function fetchGameResponse(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullContent += decoder.decode(value, { stream: true });
  }

  return fullContent;
}

function GameSession({ onRestart }: { onRestart: () => void }) {
  const transport = useMemo(() => new TextStreamChatTransport({ api: "/api/chat" }), []);

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
      const textPart = message.parts?.find((p) => p.type === "text");
      const content = (textPart && "text" in textPart ? textPart.text : "") as string;

      if (/CORRECTO:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedSeconds;
        const match = content.match(/CORRECTO:\s*(.+)/i);
        if (match) setRevealedConcept(match[1].trim());
        setGameOver("win");
      } else if (/ERA:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedSeconds;
        const match = content.match(/ERA:\s*(.+)/i);
        if (match) setRevealedConcept(match[1].trim());
        setGameOver("lose");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-start on mount (once)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    fetchGameResponse([{ role: "user", content: "start_game" }]).then((intro) => {
      setMessages([
        { id: "msg-start", role: "user", parts: [{ type: "text", text: "start_game" }] },
        { id: "msg-intro", role: "assistant", parts: [{ type: "text", text: intro }] },
      ]);
      setIsStarting(false);
      startTimer();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => stopTimer(), []);

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
      if (lastMsg?.role === "assistant") {
        loseTriggeredRef.current = true;
        sendMessage({ text: "__PLAYER_LOST__" });
      }
    }
  }, [attempts, isLoading, messages, gameOver, sendMessage]);

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
    const textPart = m.parts?.find((p) => p.type === "text");
    const text = textPart && "text" in textPart ? textPart.text : "";
    return text !== "start_game" && text !== "__PLAYER_LOST__";
  });

  return (
    <div className="flex flex-col h-screen bg-[#141414]">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-[#2e2e2e] bg-[#141414]">
        <Link href="/" className="text-[#e05a2b] font-bold text-sm tracking-wide text-glow-orange">
          NiP_t_aIdea
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-[#888]">
          <span>
            {"// q: "}
            <span className="text-[#f0f0f0]">{String(MAX_ATTEMPTS - attempts).padStart(2, "0")}</span>
            {"/"}<span className="text-[#e05a2b]">{MAX_ATTEMPTS}</span>
          </span>
          <span className="flex items-center gap-1">
            <LuTimer size={12} className={elapsedSeconds > 0 && !isStarting ? "text-[#26a69a]" : "text-[#555]"} />
            <span className={elapsedSeconds > 0 && !isStarting ? "text-[#26a69a]" : "text-[#555]"}>
              {formatTime(elapsedSeconds)}
            </span>
          </span>
        </div>

        <button
          onClick={onRestart}
          className="px-3 py-1 border border-[#e05a2b] text-[#e05a2b] text-xs font-mono tracking-widest hover:bg-[#e05a2b] hover:text-[#141414] transition-all"
        >
          [ restart ]
        </button>
      </header>

      {/* Category badge */}
      {(() => {
        const cat = parseCategory(messages);
        if (!cat) return null;
        const Icon = CATEGORY_ICONS[cat.toLowerCase()];
        return (
          <div className="relative z-10 flex justify-center py-2 border-b border-[#2e2e2e]/50">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#26a69a]/10 border border-[#26a69a]/30 text-[#26a69a] text-[11px] font-bold font-mono tracking-widest uppercase leading-none">
              {Icon && <span className="flex items-center"><Icon size={11} /></span>}
              <span>{cat}</span>
            </span>
          </div>
        );
      })()}

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isStarting ? (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#26a69a]/50 bg-[#1e1e1e] flex items-center justify-center text-[#26a69a]">
              <LuBrain size={16} />
            </div>
            <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-4 py-3 text-sm text-[#888]">
              <span className="cursor-blink">inicializando</span>
            </div>
          </div>
        ) : (
          visibleMessages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#26a69a]/50 bg-[#1e1e1e] flex items-center justify-center text-[#26a69a]">
              <LuBrain size={16} />
            </div>
            <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-4 py-3 text-sm text-[#888]">
              <span className="cursor-blink">pensando</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-2">
        <div className="flex justify-between text-[10px] text-[#555] mb-1">
          <span>intentos</span>
          <span className={attempts <= 3 ? "text-[#e05a2b]" : "text-[#888]"}>
            {attempts} restantes
          </span>
        </div>
        <div className="h-1 bg-[#2e2e2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: attempts <= 3 ? "#e05a2b" : "#26a69a",
            }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-[#2e2e2e] bg-[#141414] px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-3 py-2 focus-within:border-[#26a69a] transition-colors">
            <span className="text-[#555] text-xs select-none">{"//"}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="pregunta o adivina..."
              disabled={isLoading || attempts === 0 || isStarting}
              className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder-[#555] outline-none font-mono"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || attempts === 0 || isStarting}
            className="px-4 py-2 bg-[#e05a2b] text-[#141414] text-xs font-bold font-mono tracking-wider disabled:opacity-40 hover:bg-[#c94e22] transition-colors"
          >
            <LuSend size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [gameKey, setGameKey] = useState(0);
  return <GameSession key={gameKey} onRestart={() => setGameKey((k) => k + 1)} />;
}
