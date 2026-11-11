import { allVisible, angle, bestSide, LM, Pose, tiltFromHorizontal, visible } from "./pose";

export type ExerciseId = "pushup" | "squat" | "dip" | "pullup" | "plank";

export type FormIssue =
  | "body_hidden"
  | "legs_hidden"
  | "knees_down"
  | "hips_sagging"
  | "not_in_plank"
  | "not_upright"
  | "chest_collapsing"
  | "chin_below_bar";

export const ISSUE_TEXT: Record<FormIssue, string> = {
  body_hidden: "Step back so your whole body is in view",
  legs_hidden: "Get your legs in the frame",
  knees_down: "Knees off the floor: knee push-ups don't count",
  hips_sagging: "Keep a straight line from shoulders to ankles",
  not_in_plank: "Get into a plank position",
  not_upright: "Stay upright on the bars",
  chest_collapsing: "Keep your chest up",
  chin_below_bar: "Pull until your chin clears your hands",
};

export type RejectReason = "half_rep" | FormIssue;

export const REJECT_TEXT: Record<RejectReason, string> = {
  half_rep: "Half rep: go all the way",
  ...ISSUE_TEXT,
};

/** One frame's reading for an exercise. */
export type Measurement = {
  /** Main joint angle in degrees (elbow for push-ups, knee for squats, ...). */
  value: number;
  /** Form problems visible in this frame. */
  issues: FormIssue[];
  /** Extra check that must be true at the bottom/top of the rep (pull-up chin). */
  depthOk?: boolean;
};

type Base = {
  id: ExerciseId;
  name: string;
  /** How to set the phone up, shown before starting. */
  setup: string;
  /** Damage multiplier in adventure mode (harder moves hit harder). */
  power: number;
};

export type RepExercise = Base & {
  kind: "reps";
  /** Angle at or above which the joint counts as locked out. */
  extendedAt: number;
  /** Angle at or below which the rep reached full depth. */
  flexedAt: number;
  /** A rep must dip at least this far below extendedAt before it counts as an attempt. */
  startMargin: number;
  /** Attempts that move at least this far but miss depth are called half reps. */
  halfRepMin: number;
  needsDepthCheck: boolean;
  /** Null when the needed joints are not visible. */
  measure(p: Pose): Measurement | null;
};

export type HoldExercise = Base & {
  kind: "hold";
  /** Null when not visible; otherwise the issues blocking a good hold (empty = good). */
  check(p: Pose): FormIssue[] | null;
};

export type Exercise = RepExercise | HoldExercise;

const PUSHUP: RepExercise = {
  id: "pushup",
  name: "Push-ups",
  setup: "Phone on the floor, side-on, about 2 m away. Whole body in view.",
  power: 1,
  kind: "reps",
  extendedAt: 155,
  flexedAt: 90,
  startMargin: 15,
  halfRepMin: 25,
  needsDepthCheck: false,
  measure(p) {
    const side = bestSide(p, (s) => [s.shoulder, s.elbow, s.wrist, s.hip, s.knee, s.ankle]);
    const s = side === "left" ? SIDE_L : SIDE_R;
    if (!allVisible(p, [s.shoulder, s.elbow, s.wrist, s.hip])) return null;
    const issues: FormIssue[] = [];
    const elbow = angle(p[s.shoulder], p[s.elbow], p[s.wrist]);
    if (tiltFromHorizontal(p[s.shoulder], p[s.hip]) > 50) issues.push("not_in_plank");
    if (!visible(p, s.knee) || !visible(p, s.ankle)) {
      issues.push("legs_hidden");
    } else {
      if (angle(p[s.hip], p[s.knee], p[s.ankle]) < 150) issues.push("knees_down");
      else if (angle(p[s.shoulder], p[s.hip], p[s.ankle]) < 155) issues.push("hips_sagging");
    }
    return { value: elbow, issues };
  },
};

const SQUAT: RepExercise = {
  id: "squat",
  name: "Squats",
  setup: "Phone at hip height, side-on, about 2.5 m away. Whole body in view.",
  power: 0.8,
  kind: "reps",
  extendedAt: 160,
  flexedAt: 100,
  startMargin: 15,
  halfRepMin: 25,
  needsDepthCheck: false,
  measure(p) {
    const side = bestSide(p, (s) => [s.shoulder, s.hip, s.knee, s.ankle]);
    const s = side === "left" ? SIDE_L : SIDE_R;
    if (!allVisible(p, [s.hip, s.knee, s.ankle])) return null;
    const issues: FormIssue[] = [];
    const knee = angle(p[s.hip], p[s.knee], p[s.ankle]);
    if (visible(p, s.shoulder) && angle(p[s.shoulder], p[s.hip], p[s.knee]) < 45) {
      issues.push("chest_collapsing");
    }
    return { value: knee, issues };
  },
};

const DIP: RepExercise = {
  id: "dip",
  name: "Dips",
  setup: "Phone side-on at chest height, about 2 m from the bars or bench.",
  power: 1.2,
  kind: "reps",
  extendedAt: 155,
  flexedAt: 95,
  startMargin: 15,
  halfRepMin: 25,
  needsDepthCheck: false,
  measure(p) {
    const side = bestSide(p, (s) => [s.shoulder, s.elbow, s.wrist, s.hip]);
    const s = side === "left" ? SIDE_L : SIDE_R;
    if (!allVisible(p, [s.shoulder, s.elbow, s.wrist, s.hip])) return null;
    const issues: FormIssue[] = [];
    const elbow = angle(p[s.shoulder], p[s.elbow], p[s.wrist]);
    if (tiltFromHorizontal(p[s.shoulder], p[s.hip]) < 45) issues.push("not_upright");
    return { value: elbow, issues };
  },
};

const PULLUP: RepExercise = {
  id: "pullup",
  name: "Pull-ups",
  setup: "Phone facing you, far enough back to see your hands on the bar and your hips.",
  power: 1.6,
  kind: "reps",
  extendedAt: 150,
  flexedAt: 80,
  startMargin: 15,
  halfRepMin: 25,
  needsDepthCheck: true,
  measure(p) {
    const side = bestSide(p, (s) => [s.shoulder, s.elbow, s.wrist]);
    const s = side === "left" ? SIDE_L : SIDE_R;
    if (!allVisible(p, [s.shoulder, s.elbow, s.wrist])) return null;
    const elbow = angle(p[s.shoulder], p[s.elbow], p[s.wrist]);
    let depthOk: boolean | undefined;
    if (visible(p, LM.nose)) {
      const wristY = visible(p, LM.leftWrist) && visible(p, LM.rightWrist)
        ? (p[LM.leftWrist].y + p[LM.rightWrist].y) / 2
        : p[s.wrist].y;
      depthOk = p[LM.nose].y <= wristY;
    }
    return { value: elbow, issues: [], depthOk };
  },
};

const PLANK: HoldExercise = {
  id: "plank",
  name: "Plank",
  setup: "Phone on the floor, side-on, about 2 m away. Whole body in view.",
  power: 0.5,
  kind: "hold",
  check(p) {
    const side = bestSide(p, (s) => [s.shoulder, s.hip, s.knee, s.ankle]);
    const s = side === "left" ? SIDE_L : SIDE_R;
    if (!allVisible(p, [s.shoulder, s.hip])) return null;
    if (!visible(p, s.knee) || !visible(p, s.ankle)) return ["legs_hidden"];
    const issues: FormIssue[] = [];
    if (tiltFromHorizontal(p[s.shoulder], p[s.hip]) > 40) issues.push("not_in_plank");
    if (angle(p[s.hip], p[s.knee], p[s.ankle]) < 150) issues.push("knees_down");
    else if (angle(p[s.shoulder], p[s.hip], p[s.ankle]) < 160) issues.push("hips_sagging");
    return issues;
  },
};

const SIDE_L = {
  shoulder: LM.leftShoulder, elbow: LM.leftElbow, wrist: LM.leftWrist,
  hip: LM.leftHip, knee: LM.leftKnee, ankle: LM.leftAnkle,
};
const SIDE_R = {
  shoulder: LM.rightShoulder, elbow: LM.rightElbow, wrist: LM.rightWrist,
  hip: LM.rightHip, knee: LM.rightKnee, ankle: LM.rightAnkle,
};

export const EXERCISES: Record<ExerciseId, Exercise> = {
  pushup: PUSHUP,
  squat: SQUAT,
  dip: DIP,
  pullup: PULLUP,
  plank: PLANK,
};

export const EXERCISE_ORDER: ExerciseId[] = ["pushup", "squat", "dip", "pullup", "plank"];
