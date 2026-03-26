# NiP_taIdea

Juego de adivinanza con IA sarcástica. La IA piensa en un concepto secreto y tú tienes 15 preguntas para descubrirlo. Basado en la idea de Akinator pero con una personalidad condescendiente que te insulta si tardas demasiado.

## Cómo funciona

- Elige una categoría (Película, Serie, Canción, Personaje, País, Animal o Plato) y una dificultad (Fácil, Medio, Difícil)
- La IA elige un concepto secreto dentro de esa categoría
- Tienes **15 preguntas** para adivinarlo
- Puedes hacer preguntas de sí/no o intentar adivinar directamente
- La IA responde: Sí, No, Frío, Tibio o Caliente
- Si aciertas: `CORRECTO: <concepto>`
- Si se acaban los intentos: `ERA: <concepto>`
- Los ganadores pueden guardar su puntuación en el top 10 por dificultad (ordenado por intentos usados, luego por tiempo)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19 + Tailwind CSS v4 |
| IA | Gemini Flash 3 via OpenRouter (`@openrouter/ai-sdk-provider`) |
| Streaming | Vercel AI SDK v6 (`useChat`, `streamText`) |
| Base de datos | SQLite (`better-sqlite3`) |
| Despliegue | Docker + Coolify |
| Analíticas | Umami (self-hosted) |

## Estructura

```
app/
  page.tsx                  # Landing con top 3 por dificultad
  game/page.tsx             # Selector de categoría/dificultad + partida
  scoreboard/page.tsx       # Top 10 filtrado por dificultad (?d=facil|medio|dificil)
  api/
    game/init/route.ts      # POST — genera concepto, devuelve token cifrado
    chat/route.ts           # POST — respuestas IA en streaming
    scores/route.ts         # GET/POST — scoreboard por dificultad
lib/
  constants.ts              # Configuración (intentos, modelo, taunts)
  categories.ts             # Categorías y descripciones para el prompt
  crypto.ts                 # AES-GCM para cifrar el concepto
  ratelimit.ts              # Rate limiter fixed-window en memoria
  db.ts                     # Conexión SQLite y schema (con migraciones no destructivas)
  utils.ts                  # Helpers (formatTime, getMessageText)
components/
  ChatMessage.tsx           # Burbuja de mensaje (IA / usuario)
  ResultScreen.tsx          # Pantalla de fin de partida + guardar puntuación
```

## Variables de entorno

```env
OPENROUTER_API_KEY=   # Requerido — clave de API de OpenRouter
GAME_SECRET=          # Opcional — clave para cifrar conceptos (mín. 32 chars)
DB_PATH=              # Opcional — ruta al archivo SQLite (default: ./data/scores.db)
```

## Desarrollo local

```bash
npm install

# Crear .env.local con las variables anteriores
npm run dev
# http://localhost:3000
```

La base de datos se crea automáticamente en el primer arranque.

## Despliegue con Docker

```bash
docker build -t niptaidea .
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=<key> \
  -e GAME_SECRET=<secret> \
  -v niptaidea-data:/app/data \
  niptaidea
```

El volumen en `/app/data` persiste la base de datos entre reinicios.

### Con Coolify

1. Crear servicio **Application** apuntando al repositorio GitHub
2. Coolify detecta el `Dockerfile` automáticamente
3. Añadir variables de entorno en la configuración del servicio
4. Montar volumen persistente en `/app/data`
5. Configurar webhook en GitHub (`Settings → Webhooks`) con la URL que proporciona Coolify para auto-despliegue en cada push a `main`

## Detalles de implementación

**Rate limiting** — 30 partidas por IP por hora (fixed-window, en memoria). Solo funciona en despliegue de instancia única.

**Cifrado del concepto** — El concepto se cifra con AES-GCM antes de enviarlo al cliente como token opaco, impidiendo que el jugador lo lea en las DevTools. La clave se deriva de `GAME_SECRET`.

**Selector de categoría y dificultad** — Antes de cada partida el jugador elige la categoría (Película, Serie, Canción, Personaje, País, Animal, Plato) o pulsa "Sorpréndeme" para una aleatoria, y selecciona la dificultad (Fácil / Medio / Difícil). La dificultad se pasa al prompt de generación y se guarda junto a la puntuación.

**Validación de respuestas** — Primera capa: distancia de Levenshtein (≤ 2) para errores tipográficos. Segunda capa: si no hay coincidencia literal, el modelo juzga si la respuesta es una traducción o título alternativo válido (ej. "Memorias de África" → "Out of Africa").

**Conceptos sin repetición** — Los últimos 20 conceptos vistos se guardan en `localStorage` y se envían al endpoint `/api/game/init` para que el modelo los evite. Se añaden también semillas aleatorias (número, letra inicial, región) al prompt para maximizar la entropía entre partidas.

**Taunts automáticos** — Si el jugador lleva 60, 120, 180 o 240 segundos sin escribir, la IA inyecta un mensaje de burla automáticamente.

**Scoreboard por dificultad** — Top 10 independiente por cada nivel de dificultad, ordenado por intentos (ascendente) y luego por tiempo. La landing muestra el top 3 de cada dificultad en paralelo. Si el marcador está lleno y la nueva puntuación es peor que la última, se descarta.

**Analíticas con Umami** — Se usa Umami (self-hosted) para registrar eventos de juego sin almacenar datos personales. Los eventos trackeados incluyen: inicio de partida por categoría y dificultad, aciertos (`game_win`) y fallos (`game_lose`) con los intentos usados, solicitudes de pista, y puntuaciones guardadas en el scoreboard. Permite analizar qué categorías resultan más difíciles, la tasa de acierto por dificultad y el uso de pistas.
