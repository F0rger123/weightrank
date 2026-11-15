import { createElement, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Pose } from "@/domain/pose";
import { C, F } from "./theme";

type Props = {
  facing: "front" | "back";
  active: boolean;
  onFrame(p: Pose | null, t: number): void;
  onFrameSize(w: number, h: number): void;
};

// Pinned versions: WASM must match the npm package version.
const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3";
const WASM = `${CDN}/wasm`;
// Loaded at runtime from the CDN (the bundler can't process MediaPipe's own dynamic imports).
const loadVision = new Function("u", "return import(u)") as (u: string) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

/**
 * Browser version of the pose camera (iPhone, iPad, desktop): getUserMedia +
 * MediaPipe Pose Landmarker running in the page. Video never leaves the device.
 */
export function WebPoseCamera({ facing, active, onFrame, onFrameSize }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cb = useRef({ onFrame, onFrameSize });
  cb.current = { onFrame, onFrameSize };

  useEffect(() => {
    if (!active) return;
    let stop = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: { detectForVideo(v: HTMLVideoElement, t: number): { landmarks: { x: number; y: number; z: number; visibility?: number }[][] }; close(): void } | null = null;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't use the camera here. Open the https link in Safari or Chrome.");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "front" ? "user" : "environment", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const { FilesetResolver, PoseLandmarker } = await loadVision(`${CDN}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(WASM);
        landmarker = (await PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        })) as unknown as typeof landmarker;
        if (stop) return;
        setLoading(false);
        let lastTime = -1;
        const loop = () => {
          if (stop) return;
          if (v.readyState >= 2 && v.currentTime !== lastTime && landmarker) {
            lastTime = v.currentTime;
            const t = performance.now();
            const res = landmarker.detectForVideo(v, t);
            const raw = res.landmarks[0];
            const mirror = facing === "front";
            cb.current.onFrameSize(v.videoWidth, v.videoHeight);
            cb.current.onFrame(raw ? raw.map((l) => ({ x: mirror ? 1 - l.x : l.x, y: l.y, z: l.z, visibility: l.visibility ?? 1 })) : null, t);
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError" ? "Camera blocked. Allow camera access for this site (iPhone: Settings → Safari → Camera → Allow), then reload."
          : name === "NotFoundError" ? "No camera found on this device."
          : e instanceof Error ? e.message : "Camera failed to start",
        );
        setLoading(false);
      }
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      landmarker?.close();
    };
  }, [facing, active]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement("video", {
        ref: video,
        playsInline: true,
        muted: true,
        autoPlay: true,
        style: { width: "100%", height: "100%", objectFit: "cover", transform: facing === "front" ? "scaleX(-1)" : undefined, background: "#000" },
      })}
      {(loading || error) && (
        <View style={s.notice}>
          <Text style={[F.body, { color: error ? C.warn : C.muted, textAlign: "center" }]}>{error ?? "Starting camera and pose tracking…"}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  notice: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", padding: 32 } as object,
});
