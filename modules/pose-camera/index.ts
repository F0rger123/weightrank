import { requireNativeViewManager, requireOptionalNativeModule } from "expo-modules-core";
import type { ComponentType } from "react";
import { Platform, type ViewProps } from "react-native";

export type PoseFrame = {
  /** ms, monotonic */
  t: number;
  /** 33 landmarks flattened as [x, y, z, visibility, ...]; empty when no person is seen. */
  landmarks: number[];
  width: number;
  height: number;
  fps: number;
};

export type PoseStatus = { state: "ready" | "camera" | "error"; detail: string };

export type PoseCameraViewProps = ViewProps & {
  facing?: "front" | "back";
  active?: boolean;
  onPose?: (e: { nativeEvent: PoseFrame }) => void;
  onStatus?: (e: { nativeEvent: PoseStatus }) => void;
};

type PermissionResponse = { granted: boolean; canAskAgain?: boolean; status: string };

const Native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<{
        requestCameraPermission(): Promise<PermissionResponse>;
        getCameraPermission(): Promise<PermissionResponse>;
      }>("PoseCamera")
    : null;

/** True when the native pose camera is built into this app (not in Expo Go or on the web). */
export const poseCameraAvailable = !!Native;

export const PoseCameraView: ComponentType<PoseCameraViewProps> | null = Native
  ? requireNativeViewManager("PoseCamera")
  : null;

export async function requestCameraPermission(): Promise<boolean> {
  if (!Native) return false;
  return (await Native.requestCameraPermission()).granted;
}

export async function getCameraPermission(): Promise<boolean> {
  if (!Native) return false;
  return (await Native.getCameraPermission()).granted;
}
