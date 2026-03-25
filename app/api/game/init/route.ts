import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import { AI_MODEL, DIFFICULTY_PROMPTS, DEFAULT_DIFFICULTY } from "@/lib/constants";
import { CATEGORIES, pickCategory } from "@/lib/categories";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const category = pickCategory();

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 1.1,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Dificultad: ${difficultyPrompt}
Categoría: ${category} (${CATEGORIES[category].description})

Elige UN concepto concreto de esa categoría. Sé creativo e impredecible, con variedad geográfica, temporal y temática. Evita los más obvios y populares.
Responde ÚNICAMENTE con el nombre canónico del concepto, sin explicaciones ni puntuación extra. Ejemplos: "Frida Kahlo", "Telescopio", "Entropía".`,
  });

  const concept = text.trim().replace(/^["']|["']$/g, "");

  console.log(`Chosen concept: ${concept} (${category})`);

  const token = await encryptConcept({ concept, category });
  return Response.json({ category, token });
}
