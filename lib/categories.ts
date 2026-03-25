/**
 * Category definitions for concept generation.
 * Add a new entry here to include it everywhere: random pick,
 * init prompt, and chat system prompt.
 */
export interface CategoryDef {
  description: string; // used in the generation prompt
}

export const CATEGORIES: Record<string, CategoryDef> = {
  Película:  { description: "largometrajes de cualquier género y época" },
  Serie:     { description: "series de televisión, streaming o anime" },
  Canción:   { description: "canciones o temas musicales de cualquier género" },
  Personaje: { description: "personas reales o personajes ficticios de cualquier época o medio" },
  País:      { description: "países o naciones del mundo" },
  Animal:    { description: "especies animales reales o míticas" },
  Plato:     { description: "platos, comidas o bebidas del mundo" },
};

/** Uniform random category pick (used for "Sorpréndeme") */
export function pickCategory(): string {
  const keys = Object.keys(CATEGORIES);
  return keys[Math.floor(Math.random() * keys.length)];
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
