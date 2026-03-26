import type { UIMessage } from "ai";
import { LuBrain, LuUser } from "react-icons/lu";
import { getMessageText } from "@/lib/utils";

interface ChatMessageProps {
  message: UIMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant";
  const raw = getMessageText(message);
  const text = raw.replace(/CATEGOR[ÍI]A:\s*[^\s.,!?]+[.\s]*/gi, "").trim();

  if (!text) return null;

  if (isAI) {
    return (
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-teal/50 bg-bg-secondary flex items-center justify-center text-accent-teal">
          <LuBrain size={16} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-accent-teal font-mono">NiPt<span className="text-accent-teal">AI</span>dea</span>
          <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-primary leading-relaxed font-mono whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-[80%] ml-auto flex-row-reverse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-orange/30 bg-bg-secondary flex items-center justify-center text-accent-orange/60">
        <LuUser size={16} />
      </div>
      <div className="flex flex-col gap-1 items-end">
        <span className="text-[10px] text-accent-orange/70 font-mono">tú</span>
        <div className="bg-bg-card border border-bg-input rounded-sm px-4 py-3 text-sm text-content-primary leading-relaxed font-mono">
          {text}
        </div>
      </div>
    </div>
  );
}
