import { ExerciseId } from "./exercises";
import { rankFor, RankId } from "./rating";
import { gaussian, pick, rng } from "./rng";

/**
 * Bot opponents for 60-second duels.
 *
 * Fairness rules (the main complaint about other apps):
 * - Bot reps scale with rating: about 11 push-ups at 1000, +3 per 100 rating.
 * - Every rank has a hard cap, so a low-rank bot can never post a superhuman score.
 * - Bots tire: their pace slows through the round on a stamina curve, like a person.
 */

export const DUEL_SECONDS = 60;

/** Max push-ups a bot of this rank may ever score in one round. */
export const RANK_CAP: Record<RankId, number> = {
  bronze: 10,
  silver: 16,
  gold: 22,
  platinum: 28,
  emerald: 34,
  diamond: 45,
};

/** Other moves are harder or easier than push-ups; scale bot targets to match. */
const EXERCISE_SCALE: Record<Exclude<ExerciseId, "plank">, number> = {
  pushup: 1,
  squat: 1.4,
  dip: 0.8,
  pullup: 0.4,
};

export type Bot = {
  name: string;
  rating: number;
  /** Reps the bot will finish this round. */
  target: number;
  /** Seconds into the round at which each rep lands, ascending. */
  repTimes: number[];
};

const FIRST = ["Iron", "Quick", "Steady", "Lazy", "Mighty", "Calm", "Wild", "Brave", "Sly", "Lucky"];
const LAST = ["Otter", "Badger", "Falcon", "Moose", "Gecko", "Panda", "Lynx", "Heron", "Yak", "Wolf"];

export function meanReps(rating: number): number {
  return 11 + (rating - 1000) * 0.03;
}

export function botCap(rating: number, exercise: ExerciseId = "pushup"): number {
  const scale = exercise === "plank" ? 1 : EXERCISE_SCALE[exercise];
  return Math.max(1, Math.floor(RANK_CAP[rankFor(rating).id] * scale));
}

/** Pick an opponent near the player's rating. */
export function matchBot(playerRating: number, seed: number, exercise: ExerciseId = "pushup"): Bot {
  const r = rng(seed);
  const rating = Math.round(playerRating + (r() * 2 - 1) * 80);
  return makeBot(rating, seed, exercise);
}

export function makeBot(rating: number, seed: number, exercise: ExerciseId = "pushup"): Bot {
  const r = rng(seed ^ 0x9e3779b9);
  const scale = exercise === "plank" ? 1 : EXERCISE_SCALE[exercise];
  const mean = meanReps(rating) * scale;
  // Spread of about +/-2 reps, clipped at +/-4 so bots don't have freak rounds.
  const noise = Math.max(-4, Math.min(4, gaussian(r) * 2)) * scale;
  const target = Math.max(1, Math.min(botCap(rating, exercise), Math.round(mean + noise)));
  return {
    name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
    rating,
    target,
    repTimes: staminaSchedule(target, r),
  };
}

/** Stamina time constant in seconds: smaller = tires faster. */
const TAU = 35;

/**
 * Spread `target` reps over the round so the pace starts fast and slows down.
 * Cumulative reps follow N(t) = target * (1 - e^(-t/TAU)) / (1 - e^(-T/TAU)).
 */
export function staminaSchedule(target: number, r: () => number): number[] {
  const T = DUEL_SECONDS - 1.5; // leave a moment at the end
  const start = 1.5 + r(); // reaction time at "go"
  const norm = 1 - Math.exp(-(T - start) / TAU);
  const times: number[] = [];
  for (let i = 1; i <= target; i++) {
    const frac = (i / target) * norm;
    const base = start - TAU * Math.log(1 - frac);
    const jitter = (r() - 0.5) * 0.6;
    times.push(Math.min(T, Math.max(start, base + jitter)));
  }
  times.sort((a, b) => a - b);
  // Keep at least 0.7 s between reps: nobody does faster honest reps.
  for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.7);
  return times.map((t) => Math.min(DUEL_SECONDS - 0.2, t));
}

/** Reps the bot has finished `seconds` into the round. */
export function botRepsAt(bot: Bot, seconds: number): number {
  let n = 0;
  for (const t of bot.repTimes) if (t <= seconds) n++;
  return n;
}
