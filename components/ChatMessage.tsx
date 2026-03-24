import type { UIMessage } from "ai";
import { LuBrain, LuUser } from "react-icons/lu";

interface ChatMessageProps {
  message: UIMessage;
}

function getTextContent(message: UIMessage): string {
  if (message.parts) {
    const textPart = message.parts.find((p) => p.type === "text");
    if (textPart && "text" in textPart) return String(textPart.text);
  }
  return "";
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant";
  const text = getTextContent(message);

  if (isAI) {
    return (
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#26a69a]/50 bg-[#1e1e1e] flex items-center justify-center text-[#26a69a]">
          <LuBrain size={16} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[#26a69a] font-mono">NiP_t_aIdea</span>
          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-sm px-4 py-3 text-sm text-[#f0f0f0] leading-relaxed font-mono whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-[80%] ml-auto flex-row-reverse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[#e05a2b]/30 bg-[#1e1e1e] flex items-center justify-center text-[#e05a2b]/60">
        <LuUser size={16} />
      </div>
      <div className="flex flex-col gap-1 items-end">
        <span className="text-[10px] text-[#e05a2b]/70 font-mono">tú</span>
        <div className="bg-[#242424] border border-[#3a3a3a] rounded-sm px-4 py-3 text-sm text-[#f0f0f0] leading-relaxed font-mono">
          {text}
        </div>
      </div>
    </div>
  );
}
