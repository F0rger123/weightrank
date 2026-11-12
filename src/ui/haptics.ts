import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

/**
 * One place for every buzz in the app. Android's "touch feedback" setting can
 * mute expo-haptics impacts, so reps also use a short direct vibration that
 * always comes through.
 */
const native = Platform.OS !== "web";
const safe = (p: Promise<unknown>) => p.catch(() => {});

export const haptic = {
  /** Buttons, tabs, chips. */
  tap() {
    if (native) safe(Haptics.selectionAsync());
  },
  /** A counted rep. */
  rep(perfect = false) {
    if (!native) return;
    Vibration.vibrate(perfect ? [0, 35, 60, 35] : 40);
    safe(Haptics.impactAsync(perfect ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium));
  },
  /** A rep that didn't count. */
  reject() {
    if (native) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Countdown ticks. */
  tick() {
    if (native) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
  },
  win() {
    if (!native) return;
    Vibration.vibrate([0, 60, 80, 60, 80, 120]);
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  lose() {
    if (native) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
