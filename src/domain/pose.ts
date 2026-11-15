/**
 * Pose types and geometry helpers.
 *
 * Landmark indices follow the 33-point MediaPipe Pose topology. Coordinates are
 * normalized to the camera frame: x right, y down, both 0..1.
 */

export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type Point3 = { x: number; y: number; z: number };
/**
 * Image landmarks (normalized, for drawing and "is it in frame") plus optional
 * world landmarks in meters. Angles prefer world landmarks: they don't change
 * with camera angle or distance, so depth is judged the same everywhere.
 */
export type Pose = Landmark[] & { world?: Point3[] };

export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Below this visibility a landmark is treated as not seen. */
export const MIN_VISIBILITY = 0.5;

export function visible(p: Pose, i: number, min = MIN_VISIBILITY): boolean {
  const l = p[i];
  return !!l && (l.visibility ?? 1) >= min;
}

export function allVisible(p: Pose, idx: readonly number[], min = MIN_VISIBILITY): boolean {
  return idx.every((i) => visible(p, i, min));
}

/** Mean visibility of a set of landmarks (0 when any is missing). */
export function visibilityScore(p: Pose, idx: readonly number[]): number {
  let sum = 0;
  for (const i of idx) {
    const l = p[i];
    if (!l) return 0;
    sum += l.visibility ?? 1;
  }
  return sum / idx.length;
}

/** Interior angle at b, in degrees (0..180), formed by a-b-c. */
export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (m === 0) return 180;
  const cos = Math.min(1, Math.max(-1, dot / m));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 3D interior angle at b, in degrees. */
export function angle3(a: Point3, b: Point3, c: Point3): number {
  const v1 = [a.x - b.x, a.y - b.y, a.z - b.z];
  const v2 = [c.x - b.x, c.y - b.y, c.z - b.z];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const m = Math.hypot(...v1) * Math.hypot(...v2);
  if (m === 0) return 180;
  return (Math.acos(Math.min(1, Math.max(-1, dot / m))) * 180) / Math.PI;
}

/** Joint angle at b: true 3D when world landmarks are available, else from the image. */
export function jointAngle(p: Pose, a: number, b: number, c: number): number {
  const w = p.world;
  if (w && w[a] && w[b] && w[c]) return angle3(w[a], w[b], w[c]);
  return angle(p[a], p[b], p[c]);
}

/** Angle of the segment a->b from horizontal, in degrees (0 = flat, 90 = vertical). */
export function tiltFromHorizontal(a: Landmark, b: Landmark): number {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export type Side = "left" | "right";

export const SIDE = {
  left: {
    shoulder: LM.leftShoulder,
    elbow: LM.leftElbow,
    wrist: LM.leftWrist,
    hip: LM.leftHip,
    knee: LM.leftKnee,
    ankle: LM.leftAnkle,
  },
  right: {
    shoulder: LM.rightShoulder,
    elbow: LM.rightElbow,
    wrist: LM.rightWrist,
    hip: LM.rightHip,
    knee: LM.rightKnee,
    ankle: LM.rightAnkle,
  },
} as const;

export type SideJoints = (typeof SIDE)[Side];

/**
 * Pick the body side the camera sees best for the given joints.
 * Side-on filming hides one arm, so we use whichever side is clearer.
 */
export function bestSide(p: Pose, joints: (s: SideJoints) => number[]): Side {
  const l = visibilityScore(p, joints(SIDE.left));
  const r = visibilityScore(p, joints(SIDE.right));
  return l >= r ? "left" : "right";
}

/**
 * Legs on the floor, side-on, often get low visibility scores even when they're
 * clearly in the picture. Accept a lower score as long as the point is inside the frame.
 */
export const LEG_VISIBILITY = 0.2;

export function legSeen(p: Pose, i: number): boolean {
  const l = p[i];
  if (!l) return false;
  const inFrame = l.x > -0.03 && l.x < 1.03 && l.y > -0.03 && l.y < 1.03;
  return inFrame && (l.visibility ?? 1) >= LEG_VISIBILITY;
}

/** Pick the leg the camera sees best, independently of which arm it sees best. */
export function bestLeg(p: Pose): SideJoints {
  const score = (s: SideJoints) => (p[s.knee]?.visibility ?? 0) + (p[s.ankle]?.visibility ?? 0) + (p[s.hip]?.visibility ?? 0) * 0.5;
  return score(SIDE.left) >= score(SIDE.right) ? SIDE.left : SIDE.right;
}
