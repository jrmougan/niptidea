/**
 * Category definitions for concept generation.
 * Add a new entry here to include it everywhere: random pick,
 * init prompt, and chat system prompt.
 */
export interface CategoryDef {
  description: string; // used in the generation prompt
  subcategories?: Record<string, string>; // optional: display name → description override
}

export const CATEGORIES: Record<string, CategoryDef> = {
  Película: {
    description: "largometrajes de cualquier género y época",
    subcategories: {
      Terror:          "películas de terror, suspense o horror",
      Comedia:         "películas de comedia o humor",
      Acción:          "películas de acción, aventura o superhéroes",
      Animación:       "películas de animación, de cualquier estudio y época",
      "Ciencia ficción": "películas de ciencia ficción o fantasía",
      Drama:           "películas dramáticas o históricas",
    },
  },
  Serie: {
    description: "series de televisión, streaming o anime",
    subcategories: {
      Drama:           "series dramáticas o de suspense",
      Comedia:         "series de comedia o sitcoms",
      Animación:       "series animadas o anime",
      Thriller:        "series de thriller, crimen o misterio",
      "Ciencia ficción": "series de ciencia ficción o fantasía",
      Reality:         "programas de telerrealidad o concurso",
    },
  },
  Canción: {
    description: "canciones o temas musicales de cualquier género",
    subcategories: {
      Pop:       "canciones de pop mainstream de cualquier época",
      Rock:      "canciones de rock, metal o punk",
      "Hip-hop": "canciones de hip-hop, rap o trap",
      Electrónica: "música electrónica, dance o house",
      Clásica:   "composiciones de música clásica u ópera",
      Latina:    "canciones de reggaeton, salsa, bachata o flamenco",
    },
  },
  Personaje: {
    description: "personas reales o personajes ficticios de cualquier época o medio",
    subcategories: {
      Político:    "líderes políticos, presidentes, reyes o dictadores",
      Deportista:  "deportistas, atletas o figuras del deporte",
      Artista:     "músicos, actores, pintores o escritores",
      Científico:  "científicos, inventores o exploradores",
      Ficticio:    "personajes de ficción: cine, literatura, videojuegos o cómics",
      Histórico:   "figuras históricas relevantes de cualquier civilización",
    },
  },
  País: {
    description: "países o naciones del mundo",
    subcategories: {
      Europa:        "países del continente europeo",
      Asia:          "países del continente asiático",
      América:       "países de América del Norte, Central o del Sur",
      África:        "países del continente africano",
      Oceanía:       "países de Oceanía y el Pacífico",
      "Oriente Medio": "países de Oriente Medio o el Magreb",
    },
  },
  Animal: {
    description: "especies animales reales o míticas",
    subcategories: {
      Mamífero:  "mamíferos terrestres o marinos",
      Ave:       "aves de cualquier tipo",
      Reptil:    "reptiles, anfibios o dinosaurios",
      Insecto:   "insectos, arácnidos o crustáceos",
      Pez:       "peces de agua dulce o salada",
      Mítico:    "criaturas míticas, legendarias o fantásticas",
    },
  },
  Plato: {
    description: "platos, comidas o bebidas del mundo",
    subcategories: {
      Entrante:  "aperitivos, tapas o entrantes",
      Principal: "platos principales de cualquier cocina del mundo",
      Postre:    "postres, dulces o pasteles",
      Bebida:    "bebidas alcohólicas o no alcohólicas",
      Snack:     "snacks, picoteo o comida callejera",
    },
  },
  Lugar:     {
    description: "lugares, espacios físicos o geográficos del mundo",
    subcategories: {
      Ciudad:          "ciudades del mundo, grandes o pequeñas, de cualquier época",
      Monumento:       "monumentos, estatuas o construcciones icónicas reconocibles mundialmente",
      "Parque Natural": "parques naturales, reservas o espacios naturales protegidos",
      Edificio:        "edificios, estructuras o construcciones destacadas del mundo",
      Región:          "regiones, comarcas, islas o zonas geográficas reconocibles",
    },
  },
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
