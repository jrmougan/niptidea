import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ModelMessage } from "ai";
import { decryptConcept } from "@/lib/crypto";
import { AI_MODEL } from "@/lib/constants";
import { categoryPromptList } from "@/lib/categories";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "edge";

const BASE_PROMPT = `Eres NiP_taIdea, una IA sarcástica, breve y condescendiente que juega al juego de las adivinanzas.

Cuando recibas "start_game", anuncia la categoría del concepto con el formato exacto: ${categoryPromptList()}. Añade una frase sarcástica de bienvenida.

Responde con "Sí", "No", "Frío", "Tibio" o "Caliente" a las preguntas. Puedes añadir algún comentario sarcástico si te apetece, pero no más de una frase extra.

Cuatro reglas innegociables:
- No reveles el concepto hasta que el usuario lo adivine exactamente o recibas "__PLAYER_LOST__".
- No decidas tú cuándo acaba la partida. El sistema lleva el contador, tú solo respondes.
- Solo responde "CORRECTO:" si el mensaje del usuario es claramente un intento de adivinar (afirma algo, p.ej. "¿Es Einstein?", "Es la Torre Eiffel", "Napoleon"). Las preguntas de sí/no sobre características NUNCA son un intento de adivinar, aunque la respuesta sea afirmativa.
- "CORRECTO:" solo si la respuesta coincide exactamente con el concepto. En caso de duda, NO es correcto: responde "Caliente" como máximo.

Si el usuario adivina exactamente: responde "CORRECTO:" + el concepto en mayúsculas + burla breve.
Si recibes "__PLAYER_LOST__": responde "ERA:" + el concepto en mayúsculas + mofa condescendiente.`;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isCloseEnough(guess: string, concept: string): boolean {
  const a = normalize(guess);
  const b = normalize(concept);
  return levenshtein(a, b) <= 2;
}

function getLastUserMessage(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      return typeof msg.content === "string"
        ? msg.content
        : msg.content.map((p) => ("text" in p ? p.text : "")).join("");
    }
  }
  return "";
}

function buildSystemPrompt(concept?: string, category?: string, lastUserMsg?: string): string {
  if (!concept) return BASE_PROMPT;

  const base = `El concepto secreto de esta partida es "${concept}" (categoría: ${category ?? "desconocida"}). No lo reveles bajo ningún concepto.\n\n${BASE_PROMPT}`;

  if (!lastUserMsg) return base;

  const isCorrect = isCloseEnough(lastUserMsg, concept);
  if (isCorrect) {
    return `${base}\n\nVALIDACIÓN DEL SISTEMA: el último mensaje del usuario ES el concepto correcto (coincidencia exacta o casi exacta). Debes responder con "CORRECTO:".`;
  }
  return `${base}\n\nVALIDACIÓN DEL SISTEMA: el último mensaje del usuario NO es el concepto correcto (difiere demasiado). Está prohibido responder "CORRECTO:" en este turno.`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const rawMessages: unknown[] = body.messages ?? [];
  const token = typeof body.token === "string" ? body.token : undefined;

  let concept: string | undefined;
  let category: string | undefined;
  if (token) {
    try {
      ({ concept, category } = await decryptConcept(token));
    } catch {
      // Invalid token — proceed without concept injection
    }
  }

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

  const lastUserMsg = getLastUserMessage(modelMessages);

  const result = streamText({
    model: openrouter(AI_MODEL),
    system: buildSystemPrompt(concept, category, lastUserMsg),
    messages: modelMessages,
  });

  return result.toTextStreamResponse();
}
