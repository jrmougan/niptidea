import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import { AI_MODEL, DIFFICULTY_PROMPTS, DEFAULT_DIFFICULTY, MAX_GAMES_PER_WINDOW, RATE_WINDOW_MS } from "@/lib/constants";
import { CATEGORIES, pickCategory } from "@/lib/categories";
import { checkRateLimit } from "@/lib/ratelimit";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

function getIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const ip = getIP(req);
  const { allowed, remaining } = checkRateLimit(ip, MAX_GAMES_PER_WINDOW, RATE_WINDOW_MS);

  if (!allowed) {
    return Response.json(
      { error: "Demasiadas partidas. Vuelve en un rato." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const seenConcepts: string[] = Array.isArray(body.seenConcepts)
    ? body.seenConcepts.slice(0, 20).map((c: unknown) => String(c).slice(0, 80).replace(/[\n\r]/g, " "))
    : [];
  const requestedCategory = typeof body.category === "string" && body.category in CATEGORIES
    ? body.category
    : null;
  const category = requestedCategory ?? pickCategory();
  const requestedSubcategory = typeof body.subcategory === "string"
    && requestedCategory !== null
    && CATEGORIES[requestedCategory]?.subcategories?.[body.subcategory] !== undefined
    ? body.subcategory as string
    : null;

  const avoidClause = seenConcepts.length > 0
    ? `\nConceptos ya vistos que NO puedes usar ni similares: ${seenConcepts.join(", ")}.`
    : "";

  // Random seeds to break LLM bias toward "canonical" concepts
  const seed = Math.floor(Math.random() * 10000);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const startLetter = letters[Math.floor(Math.random() * letters.length)];
  const regions = ["Europa", "Asia", "América Latina", "África", "Norteamérica", "Oceanía", "Oriente Medio"];
  const region = regions[Math.floor(Math.random() * regions.length)];

  const categoryDescription = requestedSubcategory
    ? CATEGORIES[category].subcategories![requestedSubcategory]
    : CATEGORIES[category].description;
  const categoryLabel = requestedSubcategory ? `${category} › ${requestedSubcategory}` : category;

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 1.3,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Dificultad: ${difficultyPrompt}
Categoría: ${categoryLabel} (${categoryDescription})${avoidClause}

Semilla interna: ${seed}. Usa esta semilla para guiar tu elección de forma impredecible.
Preferencia: conceptos cuyo nombre empiece por "${startLetter}" o relacionados con ${region} (no obligatorio, solo como guía de variedad).

Elige UN concepto concreto de esa categoría. NUNCA elijas los más típicos u obvios. Sorpréndeme.
Responde ÚNICAMENTE con el nombre canónico del concepto, sin explicaciones ni puntuación extra.`,
  });

  const concept = text.trim().replace(/^["']|["']$/g, "");

  const token = await encryptConcept({ concept, category });
  return Response.json({ category, subcategory: requestedSubcategory ?? undefined, token });
}
