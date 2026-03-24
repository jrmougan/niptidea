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

/** Seconds at which the AI injects a taunt into the chat */
export const TAUNT_THRESHOLDS: { seconds: number; message: string }[] = [
  { seconds: 60,  message: "...¿Sigues ahí? Llevo esperando un minuto. Hasta el teclado se ha dormido." },
  { seconds: 120, message: "Dos minutos. Impresionante. Normalmente la gente se rinde antes de aburrirme tanto." },
  { seconds: 180, message: "Tres minutos y nada. Empiezo a sospechar que estás buscando la respuesta en Google. Qué triste." },
  { seconds: 240, message: "Cuatro minutos. Oye, ¿necesitas que llame a alguien? A estas alturas ya debería preocuparme tu estado." },
];
