import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import { AI_MODEL, DIFFICULTY_PROMPTS, DEFAULT_DIFFICULTY } from "@/lib/constants";
import { CATEGORIES, pickCategory } from "@/lib/categories";
import { checkRateLimit } from "@/lib/ratelimit";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const RATE_LIMIT = 30;        // max games per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function getIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const ip = getIP(req);
  const { allowed, remaining } = checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW);

  if (!allowed) {
    return Response.json(
      { error: "Demasiadas partidas. Vuelve en un rato." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  console.log(`[init] IP=${ip} remaining=${remaining}`);
  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const seenConcepts: string[] = Array.isArray(body.seenConcepts) ? body.seenConcepts : [];
  const category = pickCategory();

  const avoidClause = seenConcepts.length > 0
    ? `\nConceptos ya vistos que NO puedes usar ni similares: ${seenConcepts.join(", ")}.`
    : "";

  // Random seeds to break LLM bias toward "canonical" concepts
  const seed = Math.floor(Math.random() * 10000);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const startLetter = letters[Math.floor(Math.random() * letters.length)];
  const regions = ["Europa", "Asia", "América Latina", "África", "Norteamérica", "Oceanía", "Oriente Medio"];
  const region = regions[Math.floor(Math.random() * regions.length)];

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 1.3,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Dificultad: ${difficultyPrompt}
Categoría: ${category} (${CATEGORIES[category].description})${avoidClause}

Semilla interna: ${seed}. Usa esta semilla para guiar tu elección de forma impredecible.
Preferencia: conceptos cuyo nombre empiece por "${startLetter}" o relacionados con ${region} (no obligatorio, solo como guía de variedad).

Elige UN concepto concreto de esa categoría. NUNCA elijas los más típicos u obvios. Sorpréndeme.
Responde ÚNICAMENTE con el nombre canónico del concepto, sin explicaciones ni puntuación extra.`,
  });

  const concept = text.trim().replace(/^["']|["']$/g, "");

  console.log(`Chosen concept: ${concept} (${category})`);

  const token = await encryptConcept({ concept, category });
  return Response.json({ category, token });
}
