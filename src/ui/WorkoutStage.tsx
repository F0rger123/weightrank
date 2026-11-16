import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ISSUE_TEXT, REJECT_TEXT } from "@/domain/exercises";
import { PoseCamera } from "./PoseCamera";
import { RomGauge } from "./RomGauge";
import { Pop, Tap } from "./motion";
import { C, F, R } from "./theme";
import { useTracker } from "./useTracker";

type Tracker = ReturnType<typeof useTracker>;

type Props = {
  tracker: Tracker;
  facing: "front" | "back";
  onFlip(): void;
  onClose(): void;
  title: string;
  /** Big centre readout; defaults to the rep count. */
  big?: ReactNode;
  /** Extra HUD on top (duel scoreboard, monster HP...). */
  top?: ReactNode;
  /** Bottom area (buttons, countdown). */
  bottom?: ReactNode;
  cameraActive?: boolean;
};

/** Camera + skeleton + depth gauge + rep count + form feedback, shared by every mode. */
export function WorkoutStage({ tracker, facing, onFlip, onClose, title, big, top, bottom, cameraActive = true }: Props) {
  const insets = useSafeAreaInsets();
  const v = tracker.view;
  const gaugeTop = top ? { top: "48%" as const } : null;
  const issue = v.tracking ? v.issues[0] : v.issues[0] ?? "body_hidden";
  const flash = v.flash;
  const tint = flash?.type === "reject" ? C.bad : issue ? C.warn : C.accent;

  return (
    <View style={s.root}>
      <PoseCamera facing={facing} active={cameraActive} pose={tracker.pose} tint={tint} onFrame={tracker.feed} />

      <LinearGradient colors={["#000000cc", "#00000000"]} style={[s.scrim, { height: insets.top + 180 }]} pointerEvents="none" />
      <LinearGradient colors={["#00000000", "#000000e6"]} style={[s.scrimBottom, { height: insets.bottom + 320 }]} pointerEvents="none" />
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Tap onPress={onClose} style={s.iconBtn} hitSlop={10} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={22} color={C.text} />
        </Tap>
        <Text style={[F.h2, s.shadow]}>{title}</Text>
        <Tap onPress={onFlip} style={s.iconBtn} hitSlop={10} accessibilityLabel="Switch camera">
          <MaterialCommunityIcons name="camera-flip-outline" size={22} color={C.text} />
        </Tap>
      </View>

      {top && <View style={[s.topExtra, { top: insets.top + 64 }]}>{top}</View>}

      {v.kind === "reps" && (
        <View style={[s.gauge, gaugeTop]} pointerEvents="none">
          <RomGauge rom={v.rom} peak={v.romPeak} />
        </View>
      )}

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        {flash && (
          <Animated.View key={flash.t} entering={ZoomIn.springify().damping(11)} exiting={FadeOut.duration(200)} style={[s.flash, { backgroundColor: flash.type === "rep" ? (flash.quality === "perfect" ? C.accent : C.good) : C.bad }]}>
            <Text style={s.flashText}>
              {flash.type === "rep" ? (flash.quality === "perfect" ? "PERFECT" : "GOOD REP") : REJECT_TEXT[flash.reason]}
            </Text>
          </Animated.View>
        )}
        {!flash && issue && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={s.issue}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.warn} />
            <Text style={s.issueText}>{ISSUE_TEXT[issue]}</Text>
          </Animated.View>
        )}
        <View style={s.bigRow}>
          {big ?? (
            <Pop trigger={v.amount} amount={1.35}>
              <Text style={[s.big, F.number, v.flash?.type === "rep" && { color: C.accent }]}>
                {v.amount}
                {v.kind === "hold" && <Text style={s.unit}>s</Text>}
              </Text>
            </Pop>
          )}
        </View>
        {v.kind === "reps" && v.rejected > 0 && (
          <Text style={[F.small, s.shadow, { textAlign: "center" }]}>{v.rejected} not counted</Text>
        )}
        {bottom}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
  scrimBottom: { position: "absolute", bottom: 0, left: 0, right: 0 },
  topBar: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0008", alignItems: "center", justifyContent: "center" },
  topExtra: { position: "absolute", left: 16, right: 16 },
  gauge: { position: "absolute", right: 18, top: "32%" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 10 },
  bigRow: { alignItems: "center" },
  big: { fontSize: 128, lineHeight: 136, fontWeight: "900", fontStyle: "italic", color: C.text, letterSpacing: -4, textShadowColor: "#000a", textShadowRadius: 12 },
  unit: { fontSize: 48, color: C.muted },
  shadow: { textShadowColor: "#000", textShadowRadius: 6 },
  flash: { alignSelf: "center", paddingHorizontal: 18, paddingVertical: 8, borderRadius: R.pill, maxWidth: "100%" },
  flashText: { color: C.accentInk, fontWeight: "900", letterSpacing: 0.5, fontSize: 15, textAlign: "center" },
  issue: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#000b", paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, maxWidth: "100%" },
  issueText: { color: C.text, fontWeight: "700", fontSize: 14, flexShrink: 1 },
});
