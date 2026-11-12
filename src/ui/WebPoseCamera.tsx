import type { Pose } from "@/domain/pose";

/** Native builds use the Kotlin pose camera; this browser-only component is a no-op there. */
export function WebPoseCamera(_: {
  facing: "front" | "back";
  active: boolean;
  onFrame(p: Pose | null, t: number): void;
  onFrameSize(w: number, h: number): void;
}) {
  return null;
}
