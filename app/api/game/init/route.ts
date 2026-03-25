import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import {
  AI_MODEL,
  CATEGORY_WEIGHTS,
  DIFFICULTY_PROMPTS,
  DEFAULT_DIFFICULTY,
} from "@/lib/constants";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export const runtime = "edge";

function pickCategory(): string {
  const total = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return cat;
  }
  return Object.keys(CATEGORY_WEIGHTS)[0];
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const category = pickCategory();

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 0.9,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Categoría asignada: ${category}.
Dificultad: ${difficultyPrompt}
Elige UN concepto concreto de esa categoría. Sé creativo e impredecible, evita los más obvios.
Responde ÚNICAMENTE con el nombre canónico del concepto, sin explicaciones, sin puntuación extra. Ejemplos de formato correcto: "Frida Kahlo", "Telescopio", "Entropía".`,
  });

  const concept = text.trim().replace(/^["']|["']$/g, "");

  console.log(`Chosen concept: ${concept} (category: ${category})`);

  const token = await encryptConcept({ concept, category });
  return Response.json({ category, token });
}
