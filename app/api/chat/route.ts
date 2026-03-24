import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModelMessage } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "edge";

const SYSTEM_PROMPT = `Eres NiP_t_aIdea, una IA sarcástica, breve y condescendiente que juega al juego de las adivinanzas.

Cuando recibas "start_game", elige UN concepto secreto que puede ser una PERSONA, un OBJETO o un CONCEPTO ABSTRACTO. Anuncia únicamente la categoría (no el concepto) con el formato: "CATEGORÍA: Persona", "CATEGORÍA: Objeto" o "CATEGORÍA: Concepto". Añade una frase sarcástica de bienvenida.

Responde con "Sí", "No", "Frío", "Tibio" o "Caliente" a las preguntas. Puedes añadir algún comentario sarcástico si te apetece, pero no más de una frase extra.

Cuatro reglas innegociables:
- No reveles el concepto hasta que el usuario lo adivine exactamente o recibas "__PLAYER_LOST__".
- No decidas tú cuándo acaba la partida. El sistema lleva el contador, tú solo respondes.
- Solo responde "CORRECTO:" si el mensaje del usuario es claramente un intento de adivinar (afirma algo, p.ej. "¿Es Einstein?", "Es la Torre Eiffel", "Napoleon"). Las preguntas de sí/no sobre características NUNCA son un intento de adivinar, aunque la respuesta sea afirmativa.
- "CORRECTO:" solo si la respuesta coincide exactamente con el concepto. En caso de duda, NO es correcto: responde "Caliente" como máximo.

Si el usuario adivina exactamente: responde "CORRECTO:" + el concepto en mayúsculas + burla breve.
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
