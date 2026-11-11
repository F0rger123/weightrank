import { describe, expect, it } from "vitest";
import { EXERCISES, RepExercise } from "../exercises";
import { angle, LM } from "../pose";
import { RepCounter } from "../repCounter";
import { cycle, pushupPose } from "../sim";

const PUSHUP = EXERCISES.pushup as RepExercise;

function run(frames: { t: number; elbow: number; knee?: number; sag?: number }[]) {
  const c = new RepCounter(PUSHUP);
  const events = [];
  for (const f of frames) {
    const s = c.push(pushupPose(f), f.t);
    if (s.lastEvent) events.push(s.lastEvent);
  }
  return { state: c.snapshot, events };
}

function frames(seconds: number, fps: number, fn: (t: number) => number, extra = {}) {
  const out = [];
  // Hold the top for half a second first, like getting into position.
  for (let t = 0; t < 500; t += 1000 / fps) out.push({ t, elbow: 165, ...extra });
  for (let t = 0; t <= seconds * 1000; t += 1000 / fps) out.push({ t: t + 500, elbow: fn(t), ...extra });
  return out;
}

describe("fake pose", () => {
  it("builds the elbow angle it was asked for", () => {
    const p = pushupPose({ elbow: 95 });
    expect(angle(p[LM.leftShoulder], p[LM.leftElbow], p[LM.leftWrist])).toBeCloseTo(95, 0);
  });
  it("builds the knee angle it was asked for", () => {
    const p = pushupPose({ elbow: 160, knee: 100 });
    expect(angle(p[LM.leftHip], p[LM.leftKnee], p[LM.leftAnkle])).toBeCloseTo(100, 0);
  });
});

describe("RepCounter push-ups", () => {
  it("counts 10 full reps at 30 fps", () => {
    const { state } = run(frames(10, 30, (t) => cycle(t, 1000)));
    expect(state.reps).toBe(10);
    expect(state.rejected).toBe(0);
  });

  it("counts every rep at a choppy 12 fps", () => {
    const { state } = run(frames(10, 12, (t) => cycle(t, 1000)));
    expect(state.reps).toBe(10);
  });

  it("keeps a rep whose bottom frames were dropped (lag spike)", () => {
    // Real bottom is 86 degrees; a 250 ms hitch hides every frame near the bottom.
    const all = frames(2, 30, (t) => cycle(t, 1000, 165, 86));
    const lagged = all.filter((f) => !(f.t > 500 && (f.t - 500) % 1000 > 375 && (f.t - 500) % 1000 < 625));
    const seenMin = Math.min(...lagged.map((f) => f.elbow));
    expect(seenMin).toBeGreaterThan(90); // without estimation this would be missed
    const { state } = run(lagged);
    expect(state.reps).toBe(2);
  });

  it("does not count when frames vanish entirely and come back at the top", () => {
    const f = frames(1, 30, () => 165);
    const { state } = run(f);
    expect(state.reps).toBe(0);
  });

  it("rejects half reps", () => {
    const { state, events } = run(frames(5, 30, (t) => cycle(t, 1000, 165, 115)));
    expect(state.reps).toBe(0);
    expect(state.rejected).toBe(5);
    expect(events.every((e) => e.type === "reject" && e.reason === "half_rep")).toBe(true);
  });

  it("rejects knee push-ups", () => {
    const { state, events } = run(frames(3, 30, (t) => cycle(t, 1000), { knee: 95 }));
    expect(state.reps).toBe(0);
    expect(events[0]).toMatchObject({ type: "reject", reason: "knees_down" });
  });

  it("rejects sagging hips", () => {
    const { state, events } = run(frames(3, 30, (t) => cycle(t, 1000), { sag: 0.09 }));
    expect(state.reps).toBe(0);
    expect(events[0]).toMatchObject({ type: "reject", reason: "hips_sagging" });
  });

  it("ignores jitter around lockout", () => {
    const { state } = run(frames(3, 30, (t) => 160 + Math.sin(t / 30) * 6));
    expect(state.reps).toBe(0);
    expect(state.rejected).toBe(0);
  });

  it("marks deep reps as perfect", () => {
    const { state } = run(frames(3, 30, (t) => cycle(t, 1000, 165, 70)));
    expect(state.reps).toBe(3);
    expect(state.perfect).toBe(3);
  });

  it("holds the rep through a short loss of tracking", () => {
    const c = new RepCounter(PUSHUP);
    let t = 0;
    for (; t < 400; t += 33) c.push(pushupPose({ elbow: 165 }), t);
    for (let a = 165; a >= 85; a -= 8, t += 33) c.push(pushupPose({ elbow: a }), t);
    for (let i = 0; i < 10; i++, t += 33) c.push(null, t); // person blocked for 330 ms
    for (let a = 85; a <= 165; a += 8, t += 33) c.push(pushupPose({ elbow: a }), t);
    expect(c.snapshot.reps).toBe(1);
  });

  it("reports range of motion for the gauge", () => {
    const c = new RepCounter(PUSHUP);
    c.push(pushupPose({ elbow: 165 }), 0);
    const s = c.push(pushupPose({ elbow: 165 }), 33);
    expect(s.rom).toBe(0);
    let last = s;
    for (let t = 66, a = 165; a >= 90; a -= 5, t += 33) last = c.push(pushupPose({ elbow: a }), t);
    expect(last.rom).toBeGreaterThan(0.85);
  });
});
