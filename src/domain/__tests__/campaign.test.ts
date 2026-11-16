import { describe, expect, it } from "vitest";
import { ALL_LEVELS, CAMPAIGN, isUnlocked, nextLevel, starsFor, unitsOf } from "../campaign";

describe("campaign", () => {
  it("has 5 worlds of 6 levels, a boss closing each world", () => {
    expect(CAMPAIGN).toHaveLength(5);
    for (const w of CAMPAIGN) {
      expect(w.levels).toHaveLength(6);
      expect(w.levels[5].boss).toBe(true);
      expect(w.levels.slice(0, 5).every((l) => !l.boss)).toBe(true);
    }
  });
  it("gets harder: more work and combos later", () => {
    const first = ALL_LEVELS[0];
    const last = ALL_LEVELS[ALL_LEVELS.length - 1];
    expect(unitsOf(last)).toBeGreaterThan(unitsOf(first) * 4);
    expect(first.rounds).toHaveLength(1);
    expect(last.rounds.length).toBeGreaterThanOrEqual(3);
    expect(new Set(last.rounds.map((r) => r.exercise)).size).toBeGreaterThan(1);
  });
  it("demands a faster pace in later worlds", () => {
    const pace = (i: number) => ALL_LEVELS[i].timeLimit / unitsOf(ALL_LEVELS[i]);
    expect(pace(25)).toBeLessThan(pace(1));
  });
  it("unlocks in order", () => {
    expect(isUnlocked(ALL_LEVELS[0], {})).toBe(true);
    expect(isUnlocked(ALL_LEVELS[1], {})).toBe(false);
    expect(isUnlocked(ALL_LEVELS[1], { "1-1": 2 })).toBe(true);
    expect(nextLevel({ "1-1": 3 }).id).toBe("1-2");
  });
  it("awards stars for speed", () => {
    expect(starsFor(60, 100)).toBe(3);
    expect(starsFor(30, 100)).toBe(2);
    expect(starsFor(5, 100)).toBe(1);
  });
});
