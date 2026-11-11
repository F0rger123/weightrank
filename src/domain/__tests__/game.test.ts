import { describe, expect, it } from "vitest";
import { creatureFor, repDamage } from "../adventure";
import { botCap, botRepsAt, makeBot, matchBot, RANK_CAP } from "../bots";
import { EXERCISES, HoldExercise } from "../exercises";
import {
  ACHIEVEMENTS, currentStreak, dailyQuests, levelFor, questProgress, Session, xpForLevel,
} from "../progress";
import { rankFor, RANKS, ratingDelta } from "../rating";
import { HoldTimer } from "../repCounter";
import { pushupPose } from "../sim";

describe("rating", () => {
  it("has six ranks, Bronze to Diamond", () => {
    expect(RANKS.map((r) => r.name)).toEqual(["Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"]);
    expect(rankFor(1000).id).toBe("silver");
    expect(rankFor(899).id).toBe("bronze");
    expect(rankFor(1700).id).toBe("diamond");
  });
  it("moves 20 points for an even match with a new player", () => {
    expect(ratingDelta(1000, 1000, "win", 0)).toBe(20);
    expect(ratingDelta(1000, 1000, "loss", 0)).toBe(-20);
    expect(ratingDelta(1000, 1000, "draw", 0)).toBe(0);
  });
  it("rewards upsets more", () => {
    expect(ratingDelta(1000, 1200, "win", 50)).toBeGreaterThan(ratingDelta(1200, 1000, "win", 50));
  });
});

describe("bots", () => {
  it("a ~1000 bot does 7-15 push-ups, never 25+", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const bot = makeBot(1000, seed);
      expect(bot.target).toBeGreaterThanOrEqual(7);
      expect(bot.target).toBeLessThanOrEqual(15);
    }
  });
  it("never beats its rank cap", () => {
    for (let rating = 500; rating <= 2200; rating += 25) {
      for (let seed = 1; seed <= 100; seed++) {
        const bot = makeBot(rating, seed);
        expect(bot.target).toBeLessThanOrEqual(RANK_CAP[rankFor(rating).id]);
      }
    }
    expect(botCap(1050)).toBeLessThan(25);
  });
  it("matches near your rating", () => {
    for (let seed = 1; seed <= 200; seed++) expect(Math.abs(matchBot(1200, seed).rating - 1200)).toBeLessThanOrEqual(80);
  });
  it("tires: more reps in the first half than the second", () => {
    const bot = makeBot(1400, 7);
    const first = botRepsAt(bot, 30);
    expect(first).toBeGreaterThan(bot.target - first);
    expect(botRepsAt(bot, 60)).toBe(bot.target);
    for (let i = 1; i < bot.repTimes.length; i++) expect(bot.repTimes[i]).toBeGreaterThan(bot.repTimes[i - 1]);
  });
  it("scales for pull-ups", () => {
    expect(makeBot(1000, 3, "pullup").target).toBeLessThan(8);
  });
});

describe("progress", () => {
  const s = (at: string, extra: Partial<Session> = {}): Session => ({
    at, exercise: "pushup", amount: 10, perfect: 2, rejected: 0, mode: "train", ...extra,
  });
  it("levels up on a curve", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(xpForLevel(5)).level).toBe(5);
    expect(levelFor(xpForLevel(5) - 1).level).toBe(4);
  });
  it("counts streaks and keeps yesterday's alive", () => {
    const today = new Date(2026, 10, 11, 9);
    const sessions = [s(new Date(2026, 10, 8, 12).toISOString()), s(new Date(2026, 10, 9, 12).toISOString()), s(new Date(2026, 10, 10, 12).toISOString())];
    expect(currentStreak(sessions, today)).toBe(3);
    expect(currentStreak(sessions, new Date(2026, 10, 13))).toBe(0);
  });
  it("gives three distinct quests a day, the same for everyone", () => {
    const q = dailyQuests("2026-11-11");
    expect(q).toHaveLength(3);
    expect(new Set(q.map((x) => x.title)).size).toBe(3);
    expect(dailyQuests("2026-11-11")).toEqual(q);
  });
  it("tracks quest progress", () => {
    const q = { id: "x", kind: "reps" as const, exercise: "pushup" as const, goal: 30, title: "", xp: 0 };
    expect(questProgress(q, [s("2026-11-11T10:00:00Z"), s("2026-11-11T11:00:00Z", { amount: 25 })])).toBe(35);
  });
  it("unlocks achievements", () => {
    const stats = { sessions: [s("2026-11-11T10:00:00Z")], rating: 1000, peakRank: "silver" as const, adventureStage: 1 };
    const done = ACHIEVEMENTS.filter((a) => a.done(stats)).map((a) => a.id);
    expect(done).toContain("first_rep");
    expect(done).not.toContain("century");
  });
});

describe("adventure", () => {
  it("gets harder and has bosses every 5 stages", () => {
    expect(creatureFor(2).hp).toBeGreaterThan(creatureFor(1).hp);
    expect(creatureFor(5).boss).toBe(true);
    expect(creatureFor(4).boss).toBe(false);
  });
  it("crits on perfect reps", () => {
    expect(repDamage("pushup", 1, true)).toBeGreaterThan(repDamage("pushup", 1, false));
  });
});

describe("plank timer", () => {
  it("only counts good-form time", () => {
    const timer = new HoldTimer(EXERCISES.plank as HoldExercise);
    let t = 0;
    for (; t <= 10_000; t += 50) timer.push(pushupPose({ elbow: 165 }), t);
    for (; t <= 15_000; t += 50) timer.push(pushupPose({ elbow: 165, knee: 90 }), t);
    expect(timer.snapshot.seconds).toBeGreaterThan(9.5);
    expect(timer.snapshot.seconds).toBeLessThan(11);
  });
});
