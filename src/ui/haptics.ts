import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

/**
 * Every buzz in the app. Uses the phone's vibration motor directly (not the
 * system "touch feedback" path, which many phones have switched off), plus
 * expo-haptics for a crisper feel where supported. Can be turned off in Settings.
 */
const native = Platform.OS !== "web";
const safe = (p: Promise<unknown>) => p.catch(() => {});
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

const buzz = (pattern: number | number[]) => {
  if (native && enabled) Vibration.vibrate(pattern);
};

export const haptic = {
  /** Buttons, tabs, chips. */
  tap() {
    buzz(18);
  },
  /** A counted rep. */
  rep(perfect = false) {
    buzz(perfect ? [0, 45, 60, 45] : 50);
    if (native && enabled) safe(Haptics.impactAsync(perfect ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium));
  },
  /** A rep that didn't count. */
  reject() {
    buzz([0, 25, 50, 25, 50, 25]);
  },
  /** Countdown ticks. */
  tick() {
    buzz(30);
  },
  win() {
    buzz([0, 60, 80, 60, 80, 160]);
  },
  lose() {
    buzz([0, 220]);
  },
};
