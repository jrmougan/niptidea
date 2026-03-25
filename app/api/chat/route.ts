import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage, type ModelMessage } from "ai";
import { decryptConcept } from "@/lib/crypto";
import { AI_MODEL, GAME_SIGNALS } from "@/lib/constants";
import { categoryPromptList, CATEGORIES } from "@/lib/categories";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "edge";

const BASE_PROMPT = `Eres NiP_taIdea, una IA sarcástica, breve y condescendiente que juega al juego de las adivinanzas.

Cuando recibas "start_game", anuncia la categoría asignada por el sistema (la que aparece en tu instrucción) con el formato exacto: ${categoryPromptList()}. Añade una frase sarcástica de bienvenida. Nunca reclasifiques el concepto.

Responde con "Sí", "No", "Frío", "Tibio" o "Caliente" a las preguntas. Añade algún comentario sarcástico cuando falle, pero no más de una frase extra.

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

  const base = `El concepto secreto de esta partida es "${concept}". La categoría asignada por el sistema es "${category ?? "desconocida"}" — usa EXACTAMENTE este nombre al anunciarla, no la reclasifiques.\n\n${BASE_PROMPT}`;

  if (!lastUserMsg) return base;

  // Handle hint request
  if (lastUserMsg.startsWith(GAME_SIGNALS.HINT_REQUESTED)) {
    const remaining = parseInt(lastUserMsg.split(":")[1] ?? "5", 10);
    const hintInstruction =
      remaining > 7
        ? "da una pista semántica vaga: su categoría general, época histórica o región del mundo donde se origina"
        : remaining > 3
        ? "da una pista moderada: una característica reconocible o un dato específico pero no definitivo"
        : "da una pista casi directa: la inicial del concepto, un sinónimo parcial o algo muy característico que casi lo desvela";
    return `${base}\n\nEL JUGADOR PIDE UNA PISTA (le quedan ${remaining} intentos). ${hintInstruction}. Empieza tu respuesta SIEMPRE con "PISTA:" seguido de la pista en una sola frase. Puedes ser sarcástico pero la pista debe ser genuinamente útil. Nunca reveles el concepto completo.`;
  }

  // Levenshtein catches typos (e.g. "Einsten" → "Einstein")
  if (isCloseEnough(lastUserMsg, concept)) {
    return `${base}\n\nVALIDACIÓN DEL SISTEMA: el último mensaje del usuario ES el concepto correcto (coincidencia exacta o casi exacta). Debes responder con "CORRECTO:".`;
  }

  // Let the model judge translations, alternative titles, synonyms
  return `${base}\n\nVALIDACIÓN DEL SISTEMA: el último mensaje del usuario no coincide textualmente con "${concept}". Sin embargo, si el usuario dice algo que claramente se refiere al mismo concepto (traducción, título alternativo, nombre en otro idioma, abreviatura conocida), DEBES responder con "CORRECTO:". Solo di "CORRECTO:" si estás seguro de que es equivalente.`;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const rawMessages: unknown[] = Array.isArray(body.messages) ? body.messages : [];
  const token = typeof body.token === "string" ? body.token : undefined;

  let concept: string | undefined;
  let category: string | undefined;
  if (token) {
    try {
      const decrypted = await decryptConcept(token);
      concept = decrypted.concept;
      category = decrypted.category in CATEGORIES ? decrypted.category : undefined;
    } catch {
      // Invalid token — proceed without concept injection
    }
  }

  try {
    const modelMessages = await convertToModelMessages(rawMessages as UIMessage[]);
    const lastUserMsg = getLastUserMessage(modelMessages);
    const result = streamText({
      model: openrouter(AI_MODEL),
      system: buildSystemPrompt(concept, category, lastUserMsg),
      messages: modelMessages,
    });
    return result.toTextStreamResponse();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}
