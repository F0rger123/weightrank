import { EXERCISES, ExerciseId } from "./exercises";

/** Adventure mode: every rep is a hit on the creature in front of you. */

export type Creature = {
  stage: number;
  name: string;
  emoji: string;
  hp: number;
  /** Seconds you have to beat it. */
  timeLimit: number;
  boss: boolean;
};

const ROSTER: { name: string; emoji: string }[] = [
  { name: "Puddle Slime", emoji: "🟢" },
  { name: "Grumpy Mushroom", emoji: "🍄" },
  { name: "Sock Goblin", emoji: "👺" },
  { name: "Moss Golem", emoji: "🪨" },
  { name: "Thunder Crab", emoji: "🦀" },
  { name: "Night Owlbear", emoji: "🦉" },
  { name: "Ember Wyrm", emoji: "🐉" },
  { name: "Frost Yeti", emoji: "❄️" },
  { name: "Shadow Kraken", emoji: "🦑" },
];

/** Creature for a stage (1-based). Every 5th stage is a boss. */
export function creatureFor(stage: number): Creature {
  const boss = stage % 5 === 0;
  const base = ROSTER[(stage - 1) % ROSTER.length];
  const hp = Math.round(60 * Math.pow(1.18, stage - 1) * (boss ? 2 : 1));
  return {
    stage,
    name: boss ? `Boss ${base.name}` : base.name,
    emoji: base.emoji,
    hp,
    timeLimit: boss ? 120 : 75,
    boss,
  };
}

/** Damage for one rep. Perfect-depth reps crit for 1.5x. Player level adds 4% per level. */
export function repDamage(exercise: ExerciseId, level: number, perfect: boolean): number {
  const base = 10 * EXERCISES[exercise].power;
  return Math.round(base * (1 + (level - 1) * 0.04) * (perfect ? 1.5 : 1));
}

/** Plank damage per full second held. */
export function holdDamagePerSecond(level: number): number {
  return Math.round(4 * (1 + (level - 1) * 0.04));
}
