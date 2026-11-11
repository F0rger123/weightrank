/** Elo rating and ranks. */

export const START_RATING = 1000;

export type RankId = "bronze" | "silver" | "gold" | "platinum" | "emerald" | "diamond";

export type Rank = { id: RankId; name: string; min: number; color: string };

/** Six ranks. Everyone starts at 1000, which is low Silver. */
export const RANKS: Rank[] = [
  { id: "bronze", name: "Bronze", min: 0, color: "#B07A4A" },
  { id: "silver", name: "Silver", min: 900, color: "#A8B0B8" },
  { id: "gold", name: "Gold", min: 1100, color: "#D9A925" },
  { id: "platinum", name: "Platinum", min: 1300, color: "#5FC4C0" },
  { id: "emerald", name: "Emerald", min: 1500, color: "#2FBF71" },
  { id: "diamond", name: "Diamond", min: 1700, color: "#6EA8FF" },
];

export function rankFor(rating: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (rating >= rank.min) r = rank;
  return r;
}

/** Progress through the current rank, 0..1 (Diamond fills over 300 points). */
export function rankProgress(rating: number): number {
  const i = RANKS.indexOf(rankFor(rating));
  const lo = RANKS[i].min;
  const hi = RANKS[i + 1]?.min ?? lo + 300;
  return Math.max(0, Math.min(1, (rating - lo) / (hi - lo)));
}

export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/** Bigger swings while a new player finds their level. */
export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed < 30) return 32;
  return 24;
}

export type Outcome = "win" | "loss" | "draw";

export function outcomeOf(myReps: number, theirReps: number): Outcome {
  return myReps > theirReps ? "win" : myReps < theirReps ? "loss" : "draw";
}

/** Rating change for the player, rounded to a whole number. */
export function ratingDelta(mine: number, theirs: number, outcome: Outcome, gamesPlayed: number): number {
  const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  return Math.round(kFactor(gamesPlayed) * (score - expectedScore(mine, theirs)));
}

/** Ratings never drop below this, so a bad week can't bury you. */
export const RATING_FLOOR = 100;

export function applyDelta(rating: number, delta: number): number {
  return Math.max(RATING_FLOOR, rating + delta);
}
