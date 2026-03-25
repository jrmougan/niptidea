import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import { AI_MODEL, CONCEPT_POOL_SIZE, DIFFICULTY_PROMPTS, DEFAULT_DIFFICULTY } from "@/lib/constants";
import { CATEGORIES, pickCategory } from "@/lib/categories";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const usedConcepts: string[] = Array.isArray(body.usedConcepts) ? body.usedConcepts : [];

  const categories = Array.from({ length: CONCEPT_POOL_SIZE }, () => pickCategory());
  const categoryLines = categories
    .map((c, i) => `${i + 1}. ${c} (${CATEGORIES[c].description})`)
    .join("\n");

  const avoidClause = usedConcepts.length > 0
    ? `\nConceptos ya usados que NO puedes repetir ni usar conceptos similares: ${usedConcepts.join(", ")}.`
    : "";

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 1.1,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Dificultad: ${difficultyPrompt}${avoidClause}
Genera exactamente ${CONCEPT_POOL_SIZE} conceptos únicos y variados. Categorías asignadas en orden:
${categoryLines}

Reglas:
- Un concepto por línea, en el mismo orden que las categorías
- Sin numeración, sin explicaciones, solo el nombre canónico
- Todos distintos entre sí, con variedad geográfica, temporal y temática
- Mezcla épocas, culturas y campos del conocimiento
- Evita siempre los conceptos más obvios y populares
- Formato: "Frida Kahlo", "Telescopio", "Entropía"`,
  });

  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.replace(/^\d+[.)]\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .slice(0, CONCEPT_POOL_SIZE);

  console.log("Generated pool:", lines);

  const pool = await Promise.all(
    lines.map(async (concept, i) => {
      const category = categories[i] ?? categories[0];
      const token = await encryptConcept({ concept, category });
      return { category, token, concept };
    }),
  );

  return Response.json({ pool });
}
