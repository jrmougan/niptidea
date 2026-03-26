/** Maximum number of questions a player can ask per game (default) */
export const MAX_ATTEMPTS = 15;

/** Attempts allowed per difficulty level */
export const MAX_ATTEMPTS_BY_DIFFICULTY: Record<string, number> = {
  facil: 15,
  medio: 15,
  dificil: 10,
};

/** Control messages sent to the AI to manage game flow */
export const GAME_SIGNALS = {
  START: "start_game",
  PLAYER_LOST: "__PLAYER_LOST__",
  HINT_REQUESTED: "__HINT_REQUESTED__",
} as const;

/** Maximum number of entries kept in the scoreboard */
export const SCOREBOARD_SIZE = 10;

/** Maximum character length for a player name */
export const MAX_NAME_LENGTH = 16;


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
    "El concepto debe ser conocido pero más específico: personajes históricos o culturales reconocibles para aficionados, obras o hitos que no son los primeros que vienen a la mente, o conceptos académicos de secundaria (Revolución Francesa, fotosíntesis, Julio César). El reto viene de los pocos intentos, no de la oscuridad del concepto.",
};

/** Default difficulty used if none is specified */
export const DEFAULT_DIFFICULTY = "facil" as const;

/** Shared difficulty list used across pages and API validation */
export const DIFFICULTIES = [
  { key: "facil",   label: "FÁCIL",   desc: "conceptos muy conocidos" },
  { key: "medio",   label: "MEDIO",   desc: "algo más específico"     },
  { key: "dificil", label: "DIFÍCIL", desc: "solo 10 intentos"        },
] as const;

export type DifficultyKey = typeof DIFFICULTIES[number]["key"];

/** Medal colors for top-3 scoreboard positions */
export const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;


/** Rate limiting for game init endpoint */
export const MAX_GAMES_PER_WINDOW = 30;
export const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** OpenRouter model ID used for concept generation and chat */
export const AI_MODEL = "google/gemini-3.1-flash-lite-preview";

/** Seconds at which the AI injects a taunt into the chat */
export const TAUNT_THRESHOLDS: { seconds: number; message: string }[] = [
  { seconds: 60,  message: "...¿Sigues ahí? Llevo esperando un minuto. Hasta el teclado se ha dormido." },
  { seconds: 120, message: "Dos minutos. Impresionante. Normalmente la gente se rinde antes de aburrirme tanto." },
  { seconds: 180, message: "Tres minutos y nada. Empiezo a sospechar que estás buscando la respuesta en Google. Qué triste." },
  { seconds: 240, message: "Cuatro minutos. Oye, ¿necesitas que llame a alguien? A estas alturas ya debería preocuparme tu estado." },
];
