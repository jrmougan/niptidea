import type { UIMessage } from "ai";

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function getMessageText(message: UIMessage): string {
  const textPart = message.parts?.find((p) => p.type === "text");
  return textPart && "text" in textPart ? String(textPart.text) : "";
}
