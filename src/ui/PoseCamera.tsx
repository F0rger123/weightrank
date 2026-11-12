import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import {
  getCameraPermission, PoseCameraView, poseCameraAvailable, requestCameraPermission,
} from "../../modules/pose-camera";
import { Pose } from "@/domain/pose";
import { cycle, pushupPose } from "@/domain/sim";
import { C, F, R } from "./theme";
import { WebPoseCamera } from "./WebPoseCamera";

/** Web dev only: add ?sim to the URL to use the synthetic body instead of the camera. */
const useSim = Platform.OS === "web" && __DEV__ && typeof location !== "undefined" && location.search.includes("sim");

/** Bones to draw (MediaPipe indices). Face points skipped: they add noise, not information. */
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];
const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

type Props = {
  facing: "front" | "back";
  active: boolean;
  pose: Pose | null;
  /** Colour of the skeleton, e.g. accent while a rep is good, red on a form issue. */
  tint: string;
  onFrame(p: Pose | null, t: number): void;
};

/**
 * Full-bleed camera with the live skeleton on top. Falls back to a dev-only
 * simulator when the native camera isn't built in (Expo Go / web), and says so.
 */
export function PoseCamera({ facing, active, pose, tint, onFrame }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 3, h: 4 });
  const [perm, setPerm] = useState<"unknown" | "granted" | "denied">("unknown");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!poseCameraAvailable) return;
    getCameraPermission().then((ok) => (ok ? setPerm("granted") : requestCameraPermission().then((g) => setPerm(g ? "granted" : "denied"))));
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  let body: React.ReactNode;
  if (useSim) {
    body = <Simulator active={active} onFrame={onFrame} />;
  } else if (Platform.OS === "web") {
    body = (
      <WebPoseCamera
        facing={facing}
        active={active}
        onFrame={onFrame}
        onFrameSize={(w, h) => (w !== frame.w || h !== frame.h) && w && h && setFrame({ w, h })}
      />
    );
  } else if (!poseCameraAvailable || !PoseCameraView) {
    body = __DEV__ ? <Simulator active={active} onFrame={onFrame} /> : <Notice text="Camera tracking needs the WeightRank APK." />;
  } else if (perm === "denied") {
    body = (
      <Notice text="WeightRank needs the camera to count reps. Video never leaves your phone.">
        <Pressable style={s.btn} onPress={() => requestCameraPermission().then((g) => setPerm(g ? "granted" : "denied"))}>
          <Text style={s.btnText}>Allow camera</Text>
        </Pressable>
      </Notice>
    );
  } else if (perm === "granted") {
    const Cam = PoseCameraView;
    body = (
      <Cam
        style={StyleSheet.absoluteFill}
        facing={facing}
        active={active}
        onStatus={(e) => setStatus(e.nativeEvent.state === "error" ? e.nativeEvent.detail : null)}
        onPose={(e) => {
          const f = e.nativeEvent;
          if (f.width && f.height && (f.width !== frame.w || f.height !== frame.h)) setFrame({ w: f.width, h: f.height });
          onFrame(f.landmarks.length ? unflatten(f.landmarks) : null, f.t);
        }}
      />
    );
  } else {
    body = <Notice text="Starting camera…" />;
  }

  // Map normalized frame coords to the view the way the preview's "cover" crop does.
  const scale = Math.max(size.w / frame.w, size.h / frame.h);
  const dw = frame.w * scale;
  const dh = frame.h * scale;
  const ox = (size.w - dw) / 2;
  const oy = (size.h - dh) / 2;
  const X = (x: number) => ox + x * dw;
  const Y = (y: number) => oy + y * dh;
  const seen = (i: number) => !!pose?.[i] && (pose[i].visibility ?? 1) > 0.5;

  return (
    <View style={s.wrap} onLayout={onLayout}>
      {body}
      {pose && size.w > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={size.w} height={size.h} style={{ width: size.w, height: size.h }} viewBox={`0 0 ${size.w} ${size.h}`}>
          {BONES.filter(([a, b]) => seen(a) && seen(b)).map(([a, b]) => (
            <Line key={`${a}-${b}`} x1={X(pose[a].x)} y1={Y(pose[a].y)} x2={X(pose[b].x)} y2={Y(pose[b].y)} stroke={tint} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
          ))}
          {JOINTS.filter(seen).map((i) => (
            <Circle key={i} cx={X(pose[i].x)} cy={Y(pose[i].y)} r={6} fill={C.bg} stroke={tint} strokeWidth={3} />
          ))}
        </Svg>
        </View>
      )}
      {status && (
        <View style={s.status}>
          <Text style={s.statusText}>{status}</Text>
        </View>
      )}
    </View>
  );
}

function unflatten(a: number[]): Pose {
  const out: Pose = [];
  for (let i = 0; i + 3 < a.length; i += 4) out.push({ x: a[i], y: a[i + 1], z: a[i + 2], visibility: a[i + 3] });
  return out;
}

function Notice({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <View style={s.notice}>
      <Text style={[F.body, { textAlign: "center", color: C.muted }]}>{text}</Text>
      {children}
    </View>
  );
}

/**
 * Development only: a synthetic body doing push-ups, so screens can be built and
 * checked without a phone. Never shipped in a release build (gated by __DEV__).
 */
function Simulator({ active, onFrame }: { active: boolean; onFrame: Props["onFrame"] }) {
  const t0 = useRef(Date.now());
  const [mode, setMode] = useState<"full" | "half" | "knees" | "still">("still");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = Date.now() - t0.current;
      const m = modeRef.current;
      const elbow = m === "still" ? 165 : cycle(t, 1600, 165, m === "half" ? 118 : 82);
      onFrame(pushupPose({ elbow, knee: m === "knees" ? 95 : 178 }), t);
    }, 33);
    return () => clearInterval(id);
  }, [active, onFrame]);
  return (
    <View style={s.sim}>
      <Text style={F.label}>Simulated body · dev only</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {(["still", "full", "half", "knees"] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[s.chip, mode === m && { backgroundColor: C.accent }]}>
            <Text style={[s.chipText, mode === m && { color: C.accentInk }]}>{m}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  notice: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  btn: { backgroundColor: C.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: R.pill },
  btnText: { color: C.accentInk, fontWeight: "800" },
  status: { position: "absolute", bottom: 12, left: 12, right: 12, backgroundColor: "#000a", padding: 10, borderRadius: R.sm },
  statusText: { color: C.warn, fontSize: 12 },
  sim: { position: "absolute", top: 190, alignSelf: "center", alignItems: "center", zIndex: 5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.surface2 },
  chipText: { color: C.text, fontSize: 12, fontWeight: "700" },
});
