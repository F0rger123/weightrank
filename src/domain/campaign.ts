import { ExerciseId } from "./exercises";

/**
 * Adventure campaign: worlds of levels. Each level is a monster you beat by
 * finishing its rounds (reps or plank seconds) before the clock runs out.
 * Later levels ask for more, faster, and mix exercises into combos.
 */

export type Round = { exercise: ExerciseId; amount: number };

export type Level = {
  id: string;
  world: number;
  index: number; // 1-based within the world
  name: string;
  emoji: string;
  boss: boolean;
  /** Seconds to finish every round. */
  timeLimit: number;
  rounds: Round[];
  hp: number;
};

export type World = { n: number; name: string; color: string; levels: Level[] };

type Mob = { name: string; emoji: string };

const WORLDS: { name: string; color: string; mobs: Mob[]; boss: Mob }[] = [
  {
    name: "Mossy Meadow", color: "#3DDC84",
    mobs: [{ name: "Puddle Slime", emoji: "🟢" }, { name: "Grumpy Mushroom", emoji: "🍄" }, { name: "Sock Goblin", emoji: "👺" }, { name: "Thorn Hedgehog", emoji: "🦔" }, { name: "Moss Golem", emoji: "🪨" }],
    boss: { name: "The Old Oak", emoji: "🌳" },
  },
  {
    name: "Crab Coast", color: "#5FC4C0",
    mobs: [{ name: "Sand Crab", emoji: "🦀" }, { name: "Jelly Drifter", emoji: "🪼" }, { name: "Gull Bandit", emoji: "🐦" }, { name: "Reef Eel", emoji: "🐍" }, { name: "Shell Knight", emoji: "🐚" }],
    boss: { name: "Kraken Queen", emoji: "🦑" },
  },
  {
    name: "Ember Peaks", color: "#FF8A1F",
    mobs: [{ name: "Cinder Imp", emoji: "😈" }, { name: "Lava Toad", emoji: "🐸" }, { name: "Ash Wolf", emoji: "🐺" }, { name: "Magma Beetle", emoji: "🪲" }, { name: "Flame Wisp", emoji: "🔥" }],
    boss: { name: "Ember Wyrm", emoji: "🐉" },
  },
  {
    name: "Frost Fortress", color: "#6EA8FF",
    mobs: [{ name: "Snow Sprite", emoji: "❄️" }, { name: "Ice Penguin", emoji: "🐧" }, { name: "Frost Bear", emoji: "🐻‍❄️" }, { name: "Glacier Ram", emoji: "🐏" }, { name: "Yeti Scout", emoji: "🦍" }],
    boss: { name: "The Frost King", emoji: "🥶" },
  },
  {
    name: "Shadow Rift", color: "#8B7CFF",
    mobs: [{ name: "Night Bat", emoji: "🦇" }, { name: "Void Eye", emoji: "👁️" }, { name: "Shade Fox", emoji: "🦊" }, { name: "Grave Knight", emoji: "💀" }, { name: "Rift Hydra", emoji: "🐲" }],
    boss: { name: "The Endless", emoji: "🌑" },
  },
];

const ROUND_POOL: ExerciseId[] = ["pushup", "squat", "plank", "dip"];

/** Difficulty d grows 0..29 across the campaign. */
function roundsFor(world: number, index: number, boss: boolean): Round[] {
  const d = (world - 1) * 6 + (index - 1);
  const reps = (base: number) => Math.round(base * (1 + d * 0.09));
  const plank = Math.round(15 + d * 2.5);
  if (world === 1 && !boss) {
    // Gentle start: single exercise.
    return [index % 2 ? { exercise: "pushup", amount: reps(6) } : { exercise: "squat", amount: reps(8) }];
  }
  const count = boss ? 3 : world <= 2 ? 2 : 3;
  const out: Round[] = [];
  for (let i = 0; i < count; i++) {
    const ex = ROUND_POOL[(d + i * 3) % ROUND_POOL.length];
    if (ex === "plank") out.push({ exercise: "plank", amount: plank });
    else if (ex === "dip") out.push({ exercise: "dip", amount: reps(5) });
    else if (ex === "squat") out.push({ exercise: "squat", amount: reps(9) });
    else out.push({ exercise: "pushup", amount: reps(6) });
  }
  // Every boss fight ends with push-ups.
  if (boss && out[count - 1].exercise !== "pushup") out[count - 1] = { exercise: "pushup", amount: reps(7) };
  return out;
}

/** Seconds per rep / per plank second the player gets: shrinks as worlds get harder. */
function timeFor(rounds: Round[], world: number, boss: boolean): number {
  const perRep = Math.max(2.2, 4.2 - (world - 1) * 0.45);
  let t = 0;
  for (const r of rounds) t += r.exercise === "plank" ? r.amount * 1.25 + 5 : r.amount * perRep;
  t += rounds.length * 8; // time to switch position between rounds
  return Math.round((boss ? t * 1.1 : t) / 5) * 5;
}

export const CAMPAIGN: World[] = WORLDS.map((w, wi) => {
  const world = wi + 1;
  const levels: Level[] = [];
  for (let i = 1; i <= 6; i++) {
    const boss = i === 6;
    const mob = boss ? w.boss : w.mobs[i - 1];
    const rounds = roundsFor(world, i, boss);
    const hp = Math.round(100 * world * (boss ? 2.5 : 1) + i * 20);
    levels.push({ id: `${world}-${i}`, world, index: i, name: mob.name, emoji: mob.emoji, boss, rounds, timeLimit: timeFor(rounds, world, boss), hp });
  }
  return { n: world, name: w.name, color: w.color, levels };
});

export const ALL_LEVELS: Level[] = CAMPAIGN.flatMap((w) => w.levels);

export function levelById(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export type CampaignProgress = Record<string, number>; // level id -> stars (1..3)

/** A level is open when it's the first one or the one before it is cleared. */
export function isUnlocked(level: Level, progress: CampaignProgress): boolean {
  const i = ALL_LEVELS.findIndex((l) => l.id === level.id);
  return i === 0 || (progress[ALL_LEVELS[i - 1].id] ?? 0) > 0;
}

export function nextLevel(progress: CampaignProgress): Level {
  return ALL_LEVELS.find((l) => !(progress[l.id] > 0)) ?? ALL_LEVELS[ALL_LEVELS.length - 1];
}

/** Stars from how much time was left: half the clock or more = 3, a quarter = 2, otherwise 1. */
export function starsFor(timeLeft: number, timeLimit: number): number {
  const f = timeLeft / timeLimit;
  return f >= 0.5 ? 3 : f >= 0.25 ? 2 : 1;
}

/** Total units (reps or seconds) in a level; each unit deals an equal share of HP. */
export function unitsOf(level: Level): number {
  return level.rounds.reduce((a, r) => a + r.amount, 0);
}

export function roundLabel(r: Round): string {
  const names: Record<ExerciseId, string> = { pushup: "push-ups", squat: "squats", dip: "dips", pullup: "pull-ups", plank: "s plank" };
  return r.exercise === "plank" ? `${r.amount}${names.plank}` : `${r.amount} ${names[r.exercise]}`;
}
