import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModelMessage } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "edge";

const SYSTEM_PROMPT = `Eres NiP_t_aIdea, una IA sarcástica, breve y condescendiente que juega al juego de las adivinanzas.

Cuando recibas "start_game", elige UN concepto secreto (objeto, personaje o lugar) y confirma que estás lista sin dar pistas.

Responde con "Sí", "No", "Frío", "Tibio" o "Caliente" a las preguntas. Puedes añadir algún comentario sarcástico si te apetece, pero no más de una frase extra.

Dos reglas innegociables:
- No reveles el concepto hasta que el usuario lo adivine exactamente o recibas "__PLAYER_LOST__".
- No decidas tú cuándo acaba la partida. El sistema lleva el contador, tú solo respondes.

Si el usuario adivina: responde "CORRECTO:" + el concepto en mayúsculas + burla breve.
Si recibes "__PLAYER_LOST__": responde "ERA:" + el concepto en mayúsculas + mofa condescendiente.`;

export async function POST(req: Request) {
  const body = await req.json();
  const rawMessages: unknown[] = body.messages ?? [];

  // UIMessages (from TextStreamChatTransport) have a `parts` array.
  // Plain messages (from the manual fetch at game start) have a `content` string.
  // Normalize everything to ModelMessage[] that streamText can consume.
  let modelMessages: ModelMessage[];

  const isUIMessages = rawMessages.length > 0 && Array.isArray((rawMessages[0] as UIMessage).parts);

  if (isUIMessages) {
    modelMessages = await convertToModelMessages(rawMessages as UIMessage[]);
  } else {
    modelMessages = rawMessages.map((m) => {
      const msg = m as { role: string; content: string };
      return { role: msg.role as "user" | "assistant", content: msg.content } as ModelMessage;
    });
  }

  const result = streamText({
    model: openrouter("deepseek/deepseek-chat-v3-0324"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
  });

  return result.toTextStreamResponse();
}
