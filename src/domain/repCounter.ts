import { FormIssue, HoldExercise, RejectReason, RepExercise } from "./exercises";
import { OneEuroFilter } from "./filter";
import { Pose } from "./pose";

export type RepQuality = "good" | "perfect";

export type RepEvent =
  | { type: "rep"; quality: RepQuality; depth: number; t: number }
  | { type: "reject"; reason: RejectReason; t: number };

export type CounterState = {
  /** Joints needed for this exercise are in view. */
  tracking: boolean;
  phase: "waiting" | "top" | "moving";
  /** Smoothed main angle, null until first reading. */
  angle: number | null;
  /** Range of motion through the current rep, 0 = locked out, 1 = full depth. */
  rom: number;
  /** Deepest point reached in the current rep, same scale as rom (can exceed 1). */
  romPeak: number;
  reps: number;
  perfect: number;
  rejected: number;
  /** Form problems seen in the latest frame. */
  issues: FormIssue[];
  lastEvent: RepEvent | null;
};

/** Gap after which a half-finished rep is abandoned (person walked off). */
const LOST_TRACK_MS = 2500;
/** Share of a rep's frames that must show a form issue before the rep is rejected. */
const ISSUE_SHARE = 0.3;
/** Minimum frames of a form issue before it can reject a rep (one bad frame is noise). */
const ISSUE_MIN_FRAMES = 3;
/** Frame gap around the turnaround that triggers bottom estimation. */
const GAP_FOR_ESTIMATE_MS = 120;
/** The estimated bottom may be at most this many degrees deeper than what we saw. */
const MAX_ESTIMATE_DEG = 12;

/**
 * Turns a stream of poses into counted and rejected reps.
 *
 * Rules:
 * - A rep is lockout, down to full depth, back to lockout.
 * - Thresholds use hysteresis, so jitter around a line can't double count.
 * - Missing frames hold the state instead of resetting it, and when frames
 *   around the bottom were dropped the true bottom is estimated from the
 *   samples either side, so lag doesn't lose good reps.
 * - Form issues that persist through a rep reject it (knees down, sagging hips).
 */
export class RepCounter {
  private filter = new OneEuroFilter(1.5, 0.03);
  private state: CounterState;
  private lastSeen = -Infinity;
  private raw: { t: number; v: number }[] = [];
  private minV = Infinity;
  private reachedDepth = false;
  private depthOkSeen = false;
  private repFrames = 0;
  private issueFrames = new Map<FormIssue, number>();

  constructor(private ex: RepExercise) {
    this.state = initialState();
  }

  get snapshot(): CounterState {
    return this.state;
  }

  reset() {
    this.filter.reset();
    this.state = initialState();
    this.lastSeen = -Infinity;
    this.raw = [];
    this.endRep();
  }

  /** Feed one camera frame. @param t frame timestamp in ms */
  push(pose: Pose | null, t: number): CounterState {
    const ex = this.ex;
    const m = pose ? ex.measure(pose) : null;
    const s = { ...this.state, lastEvent: null as RepEvent | null };

    if (!m) {
      s.tracking = false;
      s.issues = ["body_hidden"];
      if (s.phase === "moving" && t - this.lastSeen > LOST_TRACK_MS) {
        s.phase = "top";
        this.endRep();
        s.rom = 0;
        s.romPeak = 0;
      }
      return (this.state = s);
    }

    if (t - this.lastSeen > LOST_TRACK_MS) {
      // Fresh start after a long gap: don't let the filter drag old values in.
      this.filter.reset();
      this.raw = [];
    }
    this.lastSeen = t;
    const v = this.filter.filter(m.value, t);
    s.tracking = true;
    s.angle = v;
    s.issues = m.issues;
    s.rom = romOf(ex, v);

    this.raw.push({ t, v: m.value });
    if (this.raw.length > 4) this.raw.shift();

    if (s.phase === "waiting") {
      if (v >= ex.extendedAt) s.phase = "top";
      return (this.state = s);
    }

    if (s.phase === "top") {
      if (v < ex.extendedAt - ex.startMargin) {
        s.phase = "moving";
        this.minV = v;
        this.repFrames = 0;
        this.issueFrames.clear();
      } else {
        s.romPeak = 0;
        return (this.state = s);
      }
    }

    // phase === "moving"
    this.repFrames++;
    for (const issue of m.issues) this.issueFrames.set(issue, (this.issueFrames.get(issue) ?? 0) + 1);
    this.minV = Math.min(this.minV, v);
    this.estimateBottom();
    if (this.minV <= ex.flexedAt) this.reachedDepth = true;
    if (v <= ex.flexedAt + 5 && m.depthOk) this.depthOkSeen = true;
    s.romPeak = romOf(ex, this.minV, true);

    if (v >= ex.extendedAt) {
      s.lastEvent = this.finishRep(t);
      if (s.lastEvent?.type === "rep") {
        s.reps++;
        if (s.lastEvent.quality === "perfect") s.perfect++;
      } else if (s.lastEvent?.type === "reject") {
        s.rejected++;
      }
      s.phase = "top";
      this.endRep();
    }
    return (this.state = s);
  }

  /**
   * If frames were dropped around the turnaround, estimate the real bottom.
   * Uses the raw readings two frames either side of the gap: extend the
   * downward and upward lines until they meet (that overshoots on a rounded
   * bottom), then average with the shallowest side we actually saw.
   */
  private estimateBottom() {
    if (this.raw.length < 4) return;
    const [p1, p2, q1, q2] = this.raw;
    if (q1.t - p2.t < GAP_FOR_ESTIMATE_MS) return;
    const down = (p2.v - p1.v) / (p2.t - p1.t || 1);
    const up = (q2.v - q1.v) / (q2.t - q1.t || 1);
    if (!(down < 0 && up > 0)) return;
    // Lines: v = p2.v + down*(t - p2.t) and v = q1.v + up*(t - q1.t)
    const t = (q1.v - p2.v + down * p2.t - up * q1.t) / (down - up);
    if (t < p2.t || t > q1.t) return;
    const vertex = p2.v + down * (t - p2.t);
    const seen = Math.min(p2.v, q1.v);
    const est = Math.max((vertex + seen) / 2, seen - MAX_ESTIMATE_DEG);
    this.minV = Math.min(this.minV, est);
  }

  private finishRep(t: number): RepEvent | null {
    const ex = this.ex;
    if (!this.reachedDepth) {
      return this.minV <= ex.extendedAt - ex.halfRepMin ? { type: "reject", reason: "half_rep", t } : null;
    }
    if (ex.needsDepthCheck && !this.depthOkSeen) return { type: "reject", reason: "chin_below_bar", t };
    let worst: FormIssue | null = null;
    let worstFrames = 0;
    for (const [issue, n] of this.issueFrames) {
      if (n > worstFrames) {
        worst = issue;
        worstFrames = n;
      }
    }
    if (worst && worstFrames >= ISSUE_MIN_FRAMES && worstFrames / this.repFrames >= ISSUE_SHARE) {
      return { type: "reject", reason: worst, t };
    }
    const quality: RepQuality = this.minV <= ex.flexedAt - 10 ? "perfect" : "good";
    return { type: "rep", quality, depth: romOf(ex, this.minV, true), t };
  }

  private endRep() {
    this.minV = Infinity;
    this.reachedDepth = false;
    this.depthOkSeen = false;
    this.repFrames = 0;
    this.issueFrames.clear();
  }
}

function romOf(ex: RepExercise, v: number, allowOver = false): number {
  const r = (ex.extendedAt - v) / (ex.extendedAt - ex.flexedAt);
  return Math.max(0, allowOver ? r : Math.min(1, r));
}

function initialState(): CounterState {
  return {
    tracking: false,
    phase: "waiting",
    angle: null,
    rom: 0,
    romPeak: 0,
    reps: 0,
    perfect: 0,
    rejected: 0,
    issues: [],
    lastEvent: null,
  };
}

export type HoldState = {
  tracking: boolean;
  holding: boolean;
  /** Seconds of good-form hold so far. */
  seconds: number;
  issues: FormIssue[];
};

/** Breaks in form shorter than this don't stop the clock (tracking noise). */
const HOLD_GRACE_MS = 600;

/** Times a plank (or any hold): only good-form time counts. */
export class HoldTimer {
  private goodSince: number | null = null;
  private lastGood = -Infinity;
  private lastT: number | null = null;
  private state: HoldState = { tracking: false, holding: false, seconds: 0, issues: [] };

  constructor(private ex: HoldExercise) {}

  get snapshot(): HoldState {
    return this.state;
  }

  push(pose: Pose | null, t: number): HoldState {
    const issues = pose ? this.ex.check(pose) : null;
    const s = { ...this.state };
    const good = issues !== null && issues.length === 0;
    s.tracking = issues !== null;
    s.issues = issues ?? ["body_hidden"];
    if (good) this.lastGood = t;
    const holding = good || (s.holding && t - this.lastGood <= HOLD_GRACE_MS);
    if (holding && this.lastT !== null && s.holding) {
      s.seconds += Math.min(t - this.lastT, 500) / 1000;
    }
    s.holding = holding;
    if (holding && this.goodSince === null) this.goodSince = t;
    if (!holding) this.goodSince = null;
    this.lastT = t;
    return (this.state = s);
  }
}
