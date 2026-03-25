import "server-only";

const getKey = async (): Promise<CryptoKey> => {
  const secret = process.env.GAME_SECRET ?? process.env.OPENROUTER_API_KEY;
  if (!secret) throw new Error("Missing GAME_SECRET or OPENROUTER_API_KEY environment variable");
  const raw = new TextEncoder().encode(secret.slice(0, 32).padEnd(32, "0"));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export async function encryptConcept(data: object): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), 12);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a concept token produced by `encryptConcept`.
 *
 * IMPORTANT — silent degradation on key mismatch:
 * If the token was encrypted with a different key (e.g. because
 * `OPENROUTER_API_KEY` was rotated or `GAME_SECRET` changed since the token
 * was issued), `crypto.subtle.decrypt` will throw a `DOMException`. Callers
 * that catch this error and continue without the concept are intentionally
 * degrading gracefully: the game session proceeds but the AI will not receive
 * the pre-generated concept, which means the AI must re-derive one on the fly
 * or the round will lack server-side concept injection.
 */
export async function decryptConcept(token: string): Promise<{ concept: string; category: string }> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
