import * as Speech from "expo-speech";
import { useCallback, useMemo, useRef, useState } from "react";
import { EXERCISES, ExerciseId, HoldExercise, REJECT_TEXT, RepExercise } from "@/domain/exercises";
import { Pose } from "@/domain/pose";
import { CounterState, HoldState, HoldTimer, RepCounter, RepEvent } from "@/domain/repCounter";
import { haptic } from "./haptics";

export type TrackerView = {
  kind: "reps" | "hold";
  tracking: boolean;
  /** reps counted, or whole seconds held */
  amount: number;
  perfect: number;
  rejected: number;
  rom: number;
  romPeak: number;
  holding: boolean;
  issues: CounterState["issues"];
  /** Latest rep/reject, kept for ~1.5 s for the on-screen flash. */
  flash: RepEvent | null;
};

/** UI refresh cap; the counter itself sees every frame. */
const UI_MS = 50;

/**
 * Wraps the pure rep counter for a screen: feeds frames, throttles re-renders,
 * fires haptics + voice on each rep, and reports events to the caller.
 */
export function useTracker(
  exerciseId: ExerciseId,
  opts: { voice: boolean; enabled: boolean; onRep?: (e: RepEvent) => void; onHoldSecond?: (s: number) => void },
) {
  const ex = EXERCISES[exerciseId];
  const counter = useRef<RepCounter | HoldTimer | null>(null);
  if (!counter.current) counter.current = ex.kind === "reps" ? new RepCounter(ex as RepExercise) : new HoldTimer(ex as HoldExercise);
  const lastUi = useRef(0);
  const flash = useRef<{ e: RepEvent; until: number } | null>(null);
  const lastWholeSecond = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [pose, setPose] = useState<Pose | null>(null);
  const [view, setView] = useState<TrackerView>(() => toView(counter.current!, null));

  const feed = useCallback((p: Pose | null, t: number) => {
    const c = counter.current!;
    const o = optsRef.current;
    if (!o.enabled) {
      // Not counting (e.g. before "go"), but still show live form feedback.
      if (t - lastUi.current > UI_MS) {
        lastUi.current = t;
        setPose(p);
        const issues = p ? (ex.kind === "reps" ? (ex as RepExercise).measure(p)?.issues : (ex as HoldExercise).check(p)) : null;
        setView((v) => ({ ...v, tracking: !!issues, issues: issues ?? ["body_hidden"] }));
      }
      return;
    }
    const s = c.push(p, t);
    if ("lastEvent" in s && s.lastEvent) {
      flash.current = { e: s.lastEvent, until: t + 1500 };
      if (s.lastEvent.type === "rep") {
        haptic.rep(s.lastEvent.quality === "perfect");
        if (o.voice) {
          Speech.stop();
          Speech.speak(String(s.reps), { rate: 1.15 });
        }
      } else {
        haptic.reject();
      }
      if (s.lastEvent.type === "reject" && o.voice) {
        Speech.stop();
        Speech.speak(REJECT_TEXT[s.lastEvent.reason].split(":")[0], { rate: 1.1 });
      }
      o.onRep?.(s.lastEvent);
    }
    if ("seconds" in s) {
      const whole = Math.floor(s.seconds);
      if (whole > lastWholeSecond.current) {
        lastWholeSecond.current = whole;
        o.onHoldSecond?.(whole);
        if (whole % 5 === 0) haptic.tick();
        if (o.voice && whole % 10 === 0) Speech.speak(`${whole}`, { rate: 1.1 });
      }
    }
    if (t - lastUi.current > UI_MS || ("lastEvent" in s && s.lastEvent)) {
      lastUi.current = t;
      if (flash.current && t > flash.current.until) flash.current = null;
      setPose(p);
      setView(toView(c, flash.current?.e ?? null));
    }
  }, [ex]);

  const reset = useCallback(() => {
    const c = counter.current!;
    if (c instanceof RepCounter) c.reset();
    else counter.current = new HoldTimer(ex as HoldExercise);
    lastWholeSecond.current = 0;
    flash.current = null;
    setView(toView(counter.current!, null));
  }, [ex]);

  return useMemo(() => ({ exercise: ex, pose, view, feed, reset }), [ex, pose, view, feed, reset]);
}

function toView(c: RepCounter | HoldTimer, flash: RepEvent | null): TrackerView {
  if (c instanceof RepCounter) {
    const s = c.snapshot;
    return {
      kind: "reps", tracking: s.tracking, amount: s.reps, perfect: s.perfect, rejected: s.rejected,
      rom: s.rom, romPeak: s.romPeak, holding: false, issues: s.issues, flash,
    };
  }
  const s: HoldState = c.snapshot;
  return {
    kind: "hold", tracking: s.tracking, amount: Math.floor(s.seconds), perfect: 0, rejected: 0,
    rom: 0, romPeak: 0, holding: s.holding, issues: s.issues, flash,
  };
}
