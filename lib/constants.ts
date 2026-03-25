/** Maximum number of questions a player can ask per game */
export const MAX_ATTEMPTS = 15;

/** Control messages sent to the AI to manage game flow */
export const GAME_SIGNALS = {
  START: "start_game",
  PLAYER_LOST: "__PLAYER_LOST__",
} as const;

/** Maximum number of entries kept in the scoreboard */
export const SCOREBOARD_SIZE = 10;

/** Maximum character length for a player name */
export const MAX_NAME_LENGTH = 16;

/**
 * Category weights for concept generation (must sum to 100).
 * Adjust to control how often each category appears.
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  Persona:  40,   // personajes históricos, famosos, ficticios
  Objeto:   40,   // objetos cotidianos, tecnología, comida...
  Concepto: 20,   // ciencia, filosofía, emociones, fenómenos...
};

/**
 * Difficulty levels for concept generation.
 * Controls how well-known or obscure the chosen concept will be.
 */
export const DIFFICULTY_PROMPTS: Record<string, string> = {
  facil:
    "El concepto debe ser muy conocido por cualquier hispanohablante: figuras muy populares (Messi, Einstein, Don Quijote), objetos del día a día (silla, teléfono, pan) o conceptos básicos (amor, democracia, gravedad).",
  medio:
    "El concepto debe ser conocido pero no trivial: personajes históricos o culturales relevantes, objetos específicos pero reconocibles, o conceptos moderadamente abstractos (fotosíntesis, renaissance, capitalismo).",
  dificil:
    "El concepto puede ser más oscuro o técnico: figuras históricas menos conocidas, objetos especializados, o conceptos filosóficos/científicos complejos (entropía, nihilismo, efecto Doppler).",
};

/** Default difficulty used if none is specified */
export const DEFAULT_DIFFICULTY = "facil" as const;

/** OpenRouter model ID used for concept generation and chat */
export const AI_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";

/** Seconds at which the AI injects a taunt into the chat */
export const TAUNT_THRESHOLDS: { seconds: number; message: string }[] = [
  { seconds: 60,  message: "...¿Sigues ahí? Llevo esperando un minuto. Hasta el teclado se ha dormido." },
  { seconds: 120, message: "Dos minutos. Impresionante. Normalmente la gente se rinde antes de aburrirme tanto." },
  { seconds: 180, message: "Tres minutos y nada. Empiezo a sospechar que estás buscando la respuesta en Google. Qué triste." },
  { seconds: 240, message: "Cuatro minutos. Oye, ¿necesitas que llame a alguien? A estas alturas ya debería preocuparme tu estado." },
];
