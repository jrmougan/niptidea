/**
 * @client-only — this module uses `localStorage` directly.
 * Never import from a Server Component; it will throw at runtime.
 * The `typeof window` guards below make SSR imports safe, but they
 * will silently return empty results, which is incorrect behaviour.
 */

const SEEN_KEY = "niptaidea_seen";
const SEEN_LIMIT = 20;

export function getSeenConcepts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addSeenConcept(concept: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeenConcepts().filter((c) => c !== concept);
    localStorage.setItem(SEEN_KEY, JSON.stringify([concept, ...seen].slice(0, SEEN_LIMIT)));
  } catch {}
}
