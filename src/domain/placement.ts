import { meanReps } from "./bots";
import { RATING_FLOOR } from "./rating";

/**
 * Starting rank. Your rating describes what you can do *now* (push-ups in 60 s),
 * because that's what decides fair matches. Age, body size and self-rated fitness
 * only estimate it when you skip the test.
 */

export type FitnessLevel = "new" | "some" | "regular" | "athlete";

export type Body = { age: number; weightKg: number; heightCm: number; level: FitnessLevel };

export const LEVEL_TEXT: Record<FitnessLevel, { title: string; detail: string }> = {
  new: { title: "Just starting", detail: "I rarely work out" },
  some: { title: "Getting there", detail: "I work out now and then" },
  regular: { title: "Regular", detail: "I train most weeks" },
  athlete: { title: "Athlete", detail: "I train hard, most days" },
};

const LEVEL_REPS: Record<FitnessLevel, number> = { new: 5, some: 12, regular: 22, athlete: 34 };

/** Placement never puts anyone straight into Emerald or Diamond: earn those. */
export const PLACEMENT_MAX = 1450;
export const PLACEMENT_MIN = 600;

export function ageFactor(age: number): number {
  if (age < 30) return 1;
  if (age < 40) return 0.9;
  if (age < 50) return 0.8;
  if (age < 60) return 0.7;
  return 0.6;
}

export function bmi(b: Pick<Body, "weightKg" | "heightCm">): number {
  const m = b.heightCm / 100;
  return m > 0 ? b.weightKg / (m * m) : 22;
}

/** Push-ups we'd expect in 60 s when there's no test result. */
export function estimatedReps(b: Body): number {
  const size = bmi(b) >= 32 ? 0.75 : bmi(b) >= 28 ? 0.88 : 1;
  return LEVEL_REPS[b.level] * ageFactor(b.age) * size;
}

/** Inverse of the bot pace curve: the rating at which a bot does `reps` on average. */
export function ratingForReps(reps: number): number {
  const slope = meanReps(1100) - meanReps(1000); // reps per 100 rating
  return 1000 + ((reps - meanReps(1000)) / slope) * 100;
}

export function placementRating(b: Body, testReps: number | null): number {
  const reps = testReps ?? estimatedReps(b);
  const r = Math.round(ratingForReps(reps) / 10) * 10;
  return Math.max(Math.max(PLACEMENT_MIN, RATING_FLOOR), Math.min(PLACEMENT_MAX, r));
}

export const lbToKg = (lb: number) => lb * 0.453592;
export const kgToLb = (kg: number) => kg / 0.453592;
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54;
