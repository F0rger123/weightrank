/** Synthetic poses: used by tests and by the dev-only simulator (never in a release build). */
import { LM, Pose } from "./pose";

type Opts = {
  /** Elbow angle in degrees. */
  elbow: number;
  /** Knee angle (180 = straight legs). */
  knee?: number;
  /** How far the hips drop below the shoulder-ankle line (normalized units). */
  sag?: number;
  visibility?: number;
};

/** Side-on push-up pose (left side facing the camera) with a chosen elbow angle. */
export function pushupPose({ elbow, knee = 178, sag = 0, visibility = 0.95 }: Opts): Pose {
  const p: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const L = 0.12;
  const shoulder = { x: 0.3, y: 0.55 };
  // Upper arm hangs straight down from the shoulder; forearm turns by (180 - elbow).
  const e = { x: shoulder.x, y: shoulder.y + L };
  const toShoulder = Math.atan2(shoulder.y - e.y, shoulder.x - e.x);
  const a = toShoulder + (elbow * Math.PI) / 180;
  const w = { x: e.x + L * Math.cos(a), y: e.y + L * Math.sin(a) };
  const hip = { x: 0.55, y: 0.57 + sag };
  const kneeP = { x: 0.7, y: 0.59 };
  // Ankle continues the thigh line, bent by (180 - knee).
  const thigh = Math.atan2(kneeP.y - hip.y, kneeP.x - hip.x);
  const bend = ((180 - knee) * Math.PI) / 180;
  const ankle = { x: kneeP.x + 0.15 * Math.cos(thigh - bend), y: kneeP.y + 0.15 * Math.sin(thigh - bend) };
  const set = (i: number, v: { x: number; y: number }) => (p[i] = { ...v, visibility });
  set(LM.leftShoulder, shoulder);
  set(LM.leftElbow, e);
  set(LM.leftWrist, w);
  set(LM.leftHip, hip);
  set(LM.leftKnee, kneeP);
  set(LM.leftAnkle, ankle);
  return p;
}

/** Elbow angle over time for a smooth rep cycle between top and bottom. */
export function cycle(t: number, period: number, top = 165, bottom = 80): number {
  const phase = (t % period) / period; // 0..1
  const k = (1 - Math.cos(phase * 2 * Math.PI)) / 2; // 0 at top, 1 at bottom
  return top - (top - bottom) * k;
}
