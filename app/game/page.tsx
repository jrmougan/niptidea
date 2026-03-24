"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuBrain, LuSend, LuArrowLeft, LuDiamond, LuRefreshCw } from "react-icons/lu";
import ChatMessage from "@/components/ChatMessage";
import ResultScreen from "@/components/ResultScreen";
import { MAX_ATTEMPTS } from "@/lib/constants";

// Singleton transport — must live outside the component to avoid re-instantiation on each render
const transport = new TextStreamChatTransport({ api: "/api/chat" });

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

export default function GamePage() {
  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [revealedConcept, setRevealedConcept] = useState<string>("");
  const [isGuessMode, setIsGuessMode] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const loseTriggeredRef = useRef(false);

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onFinish({ message }) {
      // Extract text from parts
      const textPart = message.parts?.find((p) => p.type === "text");
      const content = (textPart && "text" in textPart ? textPart.text : "") as string;

      if (/CORRECTO:/i.test(content)) {
        const match = content.match(/CORRECTO:\s*(.+)/i);
        if (match) setRevealedConcept(match[1].trim());
        setGameOver("win");
      } else if (/ERA:/i.test(content)) {
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
        {
          id: "msg-start",
          role: "user",
          parts: [{ type: "text", text: "start_game" }],
        },
        {
          id: "msg-intro",
          role: "assistant",
          parts: [{ type: "text", text: intro }],
        },
      ]);
      setIsStarting(false);
    });
  }, [setMessages]);

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
    setIsGuessMode(false);
    sendMessage({ text: msg });
  };

  const doRestart = (newStartId: number) => {
    fetchGameResponse([{ role: "user", content: "start_game" }]).then((intro) => {
      setMessages([
        {
          id: `msg-start-${newStartId}`,
          role: "user",
          parts: [{ type: "text", text: "start_game" }],
        },
        {
          id: `msg-intro-${newStartId}`,
          role: "assistant",
          parts: [{ type: "text", text: intro }],
        },
      ]);
      setIsStarting(false);
      startedRef.current = true;
    });
  };

  const handleRestart = () => {
    setAttempts(MAX_ATTEMPTS);
    setGameOver(null);
    setRevealedConcept("");
    setIsGuessMode(false);
    setIsStarting(true);
    setInputValue("");
    startedRef.current = false;
    loseTriggeredRef.current = false;
    const ts = Date.now();
    doRestart(ts);
  };

  if (gameOver) {
    return (
      <ResultScreen
        result={gameOver}
        concept={revealedConcept}
        attemptsUsed={MAX_ATTEMPTS - attempts}
        onRestart={handleRestart}
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
        <span className="text-xs text-[#888] font-mono">
          {"// questions_asked: "}
          <span className="text-[#f0f0f0]">{String(MAX_ATTEMPTS - attempts).padStart(2, "0")}</span>
          {"/"}
          <span className="text-[#e05a2b]">{MAX_ATTEMPTS}</span>
        </span>
        <button
          onClick={handleRestart}
          className="px-3 py-1 border border-[#e05a2b] text-[#e05a2b] text-xs font-mono tracking-widest hover:bg-[#e05a2b] hover:text-[#141414] transition-all"
        >
          [ restart ]
        </button>
      </header>

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
            <span className="text-[#555] text-xs select-none">{isGuessMode ? ">" : "//"}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isGuessMode ? "escribe tu respuesta exacta..." : "haz una pregunta de sí/no..."
              }
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

        <div className="mt-2 text-center">
          <button
            onClick={() => {
              setIsGuessMode(!isGuessMode);
              inputRef.current?.focus();
            }}
            disabled={isLoading || attempts === 0 || isStarting}
            className="text-xs text-[#26a69a] hover:text-[#f0f0f0] transition-colors disabled:opacity-40 font-mono tracking-wide"
          >
            {isGuessMode
              ? <><LuArrowLeft size={12} className="inline mr-1" />volver a preguntas</>
              : <><LuDiamond size={12} className="inline mr-1" />make a guess()</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
