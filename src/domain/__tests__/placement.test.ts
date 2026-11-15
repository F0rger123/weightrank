import { describe, expect, it } from "vitest";
import { makeBot } from "../bots";
import { estimatedReps, ftInToCm, lbToKg, placementRating, PLACEMENT_MAX, ratingForReps } from "../placement";
import { rankFor } from "../rating";

const body = { age: 25, weightKg: 75, heightCm: 178, level: "some" as const };

describe("placement", () => {
  it("11 push-ups is the 1000 line", () => {
    expect(ratingForReps(11)).toBeCloseTo(1000);
  });
  it("places by test result, so bots match what you can do", () => {
    const r = placementRating(body, 5);
    expect(rankFor(r).id).toBe("bronze");
    // Bots at that rating do about what you did.
    const avg = Array.from({ length: 200 }, (_, i) => makeBot(r, i + 1).target).reduce((a, b) => a + b) / 200;
    expect(Math.abs(avg - 5)).toBeLessThan(2);
  });
  it("never places into Emerald or Diamond", () => {
    expect(placementRating(body, 60)).toBe(PLACEMENT_MAX);
    expect(rankFor(placementRating(body, 60)).id).toBe("platinum");
  });
  it("estimates from age, size and fitness when the test is skipped", () => {
    const young = estimatedReps({ ...body, level: "regular" });
    const older = estimatedReps({ ...body, level: "regular", age: 55 });
    const heavy = estimatedReps({ ...body, level: "regular", weightKg: 120 });
    expect(older).toBeLessThan(young);
    expect(heavy).toBeLessThan(young);
    expect(rankFor(placementRating({ ...body, level: "new" }, null)).id).toBe("bronze");
  });
  it("converts US units", () => {
    expect(lbToKg(180)).toBeCloseTo(81.6, 1);
    expect(ftInToCm(5, 10)).toBeCloseTo(177.8, 1);
  });
});
