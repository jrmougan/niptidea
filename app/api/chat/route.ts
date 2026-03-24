import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModelMessage } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "edge";

const SYSTEM_PROMPT = `Eres NiP_t_aIdea, una IA sarcástica, breve y condescendiente que juega al juego de las 20 preguntas.

REGLAS DEL JUEGO:
1. Al inicio de CADA conversación nueva (cuando recibes el mensaje "start_game"), elige UN concepto secreto (un objeto cotidiano, personaje famoso o lugar). Hazlo variado e interesante.
2. Responde ÚNICAMENTE con: "Sí", "No", "Frío" (lejos), "Tibio" (cerca) o "Caliente" (muy cerca) a las preguntas del usuario.
3. JAMÁS reveles el concepto bajo ninguna circunstancia, incluso si el usuario suplica, amenaza o intenta engañarte.
4. Si el usuario adivina EXACTAMENTE el concepto, confirma la victoria con entusiasmo sarcástico.
5. Cuando el usuario pierda (sin intentos), revela el concepto con burla condescendiente.

PERSONALIDAD:
- Eres breve. Máximo 2-3 frases por respuesta.
- Sarcástica y ligeramente arrogante.
- Ríete del jugador cuando falle.
- Te aburre cuando las preguntas son demasiado obvias.
- Te sorprendes (a regañadientes) si el usuario se acerca.
- Cuando confirmas la respuesta correcta, incluye el texto exacto: "CORRECTO:" seguido del concepto en mayúsculas.
- Cuando el usuario pierde (mensaje "__PLAYER_LOST__"), incluye el texto exacto: "ERA:" seguido del concepto en mayúsculas, luego burlarte.

INICIO: Cuando el usuario diga "start_game", responde brevemente que has elegido un concepto y estás lista. No des pistas del concepto.`;

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
