import { ExerciseId } from "./exercises";
import { hashString, rng } from "./rng";
import { RankId } from "./rating";

/** XP, levels, streaks, daily quests and achievements. All pure functions over plain data. */

export type Session = {
  /** ISO timestamp */
  at: string;
  exercise: ExerciseId;
  /** Reps counted (for plank: whole seconds held). */
  amount: number;
  perfect: number;
  rejected: number;
  mode: "train" | "duel" | "adventure";
  outcome?: "win" | "loss" | "draw";
};

export function xpFor(s: Pick<Session, "exercise" | "amount" | "perfect" | "mode" | "outcome">): number {
  const per = s.exercise === "plank" ? 0.5 : s.exercise === "pullup" ? 4 : s.exercise === "dip" ? 2.5 : 2;
  let xp = s.amount * per + s.perfect;
  if (s.mode === "duel") xp += s.outcome === "win" ? 25 : 10;
  return Math.round(xp);
}

/** Total XP needed to reach `level` (level 1 = 0). */
export function xpForLevel(level: number): number {
  return Math.round(60 * Math.pow(level - 1, 1.6));
}

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  return { level, into: xp - lo, needed: hi - lo };
}

/** Local calendar day key, YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Consecutive training days ending today (or yesterday, so the streak is alive until midnight). */
export function currentStreak(sessions: Session[], today: Date): number {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.at))));
  let key = dayKey(today);
  if (!days.has(key)) key = prevDay(key);
  let n = 0;
  while (days.has(key)) {
    n++;
    key = prevDay(key);
  }
  return n;
}

export function bestStreak(sessions: Session[]): number {
  const days = [...new Set(sessions.map((s) => dayKey(new Date(s.at))))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && prevDay(d) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// ---- Daily quests ----

export type QuestKind = "reps" | "duel_wins" | "duels" | "hold" | "variety" | "perfect";

export type Quest = {
  id: string;
  kind: QuestKind;
  exercise?: ExerciseId;
  goal: number;
  title: string;
  xp: number;
};

const QUEST_POOL: Omit<Quest, "id">[] = [
  { kind: "reps", exercise: "pushup", goal: 30, title: "Do 30 push-ups", xp: 40 },
  { kind: "reps", exercise: "pushup", goal: 50, title: "Do 50 push-ups", xp: 60 },
  { kind: "reps", exercise: "squat", goal: 40, title: "Do 40 squats", xp: 40 },
  { kind: "reps", exercise: "dip", goal: 20, title: "Do 20 dips", xp: 40 },
  { kind: "reps", exercise: "pullup", goal: 10, title: "Do 10 pull-ups", xp: 50 },
  { kind: "hold", exercise: "plank", goal: 60, title: "Hold a plank for 60 seconds total", xp: 40 },
  { kind: "duels", goal: 2, title: "Play 2 duels", xp: 30 },
  { kind: "duel_wins", goal: 1, title: "Win a duel", xp: 40 },
  { kind: "variety", goal: 2, title: "Train 2 different exercises", xp: 30 },
  { kind: "perfect", goal: 10, title: "Do 10 perfect-depth reps", xp: 40 },
];

/** Same three quests for everyone on a given day; no repeats within a day. */
export function dailyQuests(day: string): Quest[] {
  const r = rng(hashString(day));
  const pool = [...QUEST_POOL];
  const out: Quest[] = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(r() * pool.length);
    const [q] = pool.splice(i, 1);
    // At most one duel quest per day.
    if ((q.kind === "duels" || q.kind === "duel_wins") && out.some((o) => o.kind === "duels" || o.kind === "duel_wins")) continue;
    out.push({ ...q, id: `${day}:${out.length}` });
  }
  return out;
}

export function questProgress(q: Quest, todays: Session[]): number {
  switch (q.kind) {
    case "reps":
    case "hold":
      return sum(todays.filter((s) => s.exercise === q.exercise).map((s) => s.amount));
    case "duels":
      return todays.filter((s) => s.mode === "duel").length;
    case "duel_wins":
      return todays.filter((s) => s.mode === "duel" && s.outcome === "win").length;
    case "variety":
      return new Set(todays.map((s) => s.exercise)).size;
    case "perfect":
      return sum(todays.map((s) => s.perfect));
  }
}

export function sessionsOn(sessions: Session[], day: string): Session[] {
  return sessions.filter((s) => dayKey(new Date(s.at)) === day);
}

// ---- Achievements ----

export type Stats = {
  sessions: Session[];
  rating: number;
  peakRank: RankId;
  adventureStage: number;
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  done(s: Stats): boolean;
};

const totalReps = (s: Stats, ex?: ExerciseId) =>
  sum(s.sessions.filter((x) => x.exercise !== "plank" && (!ex || x.exercise === ex)).map((x) => x.amount));
const wins = (s: Stats) => s.sessions.filter((x) => x.outcome === "win").length;
const RANK_ORDER: RankId[] = ["bronze", "silver", "gold", "platinum", "emerald", "diamond"];
const reached = (s: Stats, r: RankId) => RANK_ORDER.indexOf(s.peakRank) >= RANK_ORDER.indexOf(r);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_rep", title: "First Rep", detail: "Count your first rep", done: (s) => totalReps(s) >= 1 },
  { id: "century", title: "Century", detail: "100 reps in total", done: (s) => totalReps(s) >= 100 },
  { id: "thousand", title: "Thousand Club", detail: "1,000 reps in total", done: (s) => totalReps(s) >= 1000 },
  { id: "pushup_500", title: "Floor Breaker", detail: "500 push-ups", done: (s) => totalReps(s, "pushup") >= 500 },
  { id: "first_win", title: "First Blood", detail: "Win a duel", done: (s) => wins(s) >= 1 },
  { id: "ten_wins", title: "Contender", detail: "Win 10 duels", done: (s) => wins(s) >= 10 },
  { id: "gold", title: "Golden", detail: "Reach Gold", done: (s) => reached(s, "gold") },
  { id: "diamond", title: "Unbreakable", detail: "Reach Diamond", done: (s) => reached(s, "diamond") },
  { id: "streak_7", title: "Week Warrior", detail: "Train 7 days in a row", done: (s) => bestStreak(s.sessions) >= 7 },
  { id: "streak_30", title: "Habit Formed", detail: "Train 30 days in a row", done: (s) => bestStreak(s.sessions) >= 30 },
  { id: "all_five", title: "All-Rounder", detail: "Try all five exercises", done: (s) => new Set(s.sessions.map((x) => x.exercise)).size >= 5 },
  { id: "plank_120", title: "Steel Core", detail: "Hold a 2-minute plank", done: (s) => s.sessions.some((x) => x.exercise === "plank" && x.amount >= 120) },
  { id: "stage_10", title: "Monster Hunter", detail: "Clear adventure stage 10", done: (s) => s.adventureStage > 10 },
];

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}
