import { describe, expect, it } from "vitest";
import { challengeLink, decodeCode, decodeLinkData, encodeCode, encodeLinkData, ghostRepTimes, newRoomCode } from "../challenge";

describe("challenge codes", () => {
  it("round-trips every exercise and score", () => {
    for (const exercise of ["pushup", "squat", "dip", "pullup"] as const) {
      for (const reps of [0, 1, 17, 31, 99, 255]) {
        for (const nonce of [0, 13, 31]) {
          const code = encodeCode({ exercise, reps }, nonce);
          expect(code).toMatch(/^WR-[0-9A-Z]{4}$/);
          expect(decodeCode(code)).toEqual({ exercise, reps });
        }
      }
    }
  });
  it("forgives case, dashes and look-alike letters", () => {
    const code = encodeCode({ exercise: "pushup", reps: 31 }, 5);
    expect(decodeCode(code.toLowerCase().replace("-", " "))).toEqual({ exercise: "pushup", reps: 31 });
  });
  it("rejects typos", () => {
    const code = encodeCode({ exercise: "squat", reps: 40 }, 2);
    const last = code.at(-1)!;
    const typo = code.slice(0, -1) + (last === "Z" ? "Y" : "Z");
    expect(decodeCode(typo)).toBeNull();
    expect(decodeCode("WR-12")).toBeNull();
  });
});

describe("challenge links", () => {
  it("round-trips name and score", () => {
    const c = { exercise: "dip" as const, reps: 22, name: "Luke K" };
    expect(decodeLinkData(encodeLinkData(c))).toEqual(c);
  });
  it("rejects junk", () => {
    expect(decodeLinkData("bench.10.x")).toBeNull();
    expect(decodeLinkData("pushup.999.x")).toBeNull();
  });
  it("prefers the web link when hosted", () => {
    const c = { exercise: "pushup" as const, reps: 5, name: "A" };
    expect(challengeLink(c)).toMatch(/^weightrank:\/\/challenge\?d=/);
    expect(challengeLink(c, "https://wr.example/")).toBe("https://wr.example/challenge?d=pushup.5.A");
  });
  it("spreads a ghost's reps over the round", () => {
    const t = ghostRepTimes(30);
    expect(t).toHaveLength(30);
    expect(t.at(-1)!).toBeLessThan(60);
    expect(newRoomCode()).toMatch(/^[0-9A-Z]{6}$/);
  });
});

import { vi } from "vitest";
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));

describe("online pairing", () => {
  it("pairs oldest players two by two, and both sides agree", async () => {
    const { pairFor } = await import("../pairing");
    const m = [
      { id: "c", name: "", rating: 1000, t: 3 },
      { id: "a", name: "", rating: 1000, t: 1 },
      { id: "b", name: "", rating: 1000, t: 2 },
    ];
    expect(pairFor(m, "a")?.id).toBe("b");
    expect(pairFor(m, "b")?.id).toBe("a");
    expect(pairFor(m, "c")).toBeNull();
  });
});
