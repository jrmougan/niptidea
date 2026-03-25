/**
 * Category definitions for concept generation.
 * Add a new entry here to include it everywhere: weighted random pick,
 * init prompt, and chat system prompt.
 */
export interface CategoryDef {
  weight: number;
  description: string; // used in the generation prompt
}

export const CATEGORIES: Record<string, CategoryDef> = {
  Persona:  { weight: 25, description: "personajes históricos, famosos o ficticios" },
  Lugar:    { weight: 20, description: "ciudades, países, monumentos, accidentes geográficos" },
  Animal:   { weight: 15, description: "especies animales, reales o míticas" },
  Obra:     { weight: 20, description: "libros, películas, canciones, cuadros, videojuegos" },
  Concepto: { weight: 20, description: "ciencia, filosofía, emociones, fenómenos, inventos" },
};

/** Weighted random category pick */
export function pickCategory(): string {
  const total = Object.values(CATEGORIES).reduce((a, b) => a + b.weight, 0);
  let roll = Math.random() * total;
  for (const [name, { weight }] of Object.entries(CATEGORIES)) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return Object.keys(CATEGORIES)[0];
}

/**
 * Returns the category list formatted for prompts.
 * e.g. "CATEGORÍA: Persona", "CATEGORÍA: Lugar", ...
 */
export function categoryPromptList(): string {
  return Object.keys(CATEGORIES)
    .map((name) => `"CATEGORÍA: ${name}"`)
    .join(", ");
}
