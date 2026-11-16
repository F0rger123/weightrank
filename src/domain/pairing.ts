export type Player = { id: string; name: string; rating: number; t: number };

/** Deterministic pairing everyone in the queue agrees on: oldest first, in twos. */
export function pairFor(members: Player[], myId: string): Player | null {
  const sorted = [...members].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const i = sorted.findIndex((m) => m.id === myId);
  if (i < 0) return null;
  const j = i % 2 === 0 ? i + 1 : i - 1;
  return sorted[j] ?? null;
}
