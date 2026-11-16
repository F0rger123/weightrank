import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApkUpdate } from "@/store/updates";
import { Tap } from "./motion";
import { C, R } from "./theme";

/** App-wide strip at the top while a new version downloads, then a tap to install. */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const u = useApkUpdate();
  if (u.kind === "idle") return null;

  const text =
    u.kind === "downloading" ? `Updating to ${u.info.version}… ${Math.round(u.progress * 100)}%`
    : u.kind === "ready" ? `Version ${u.info.version} downloaded. Tap to install`
    : `Update to ${u.info.version} failed. Tap to retry`;
  const onPress = u.kind === "ready" ? u.install : u.kind === "failed" ? u.retry : undefined;

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[s.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <Tap onPress={onPress} disabled={!onPress} style={s.pill}>
        <MaterialCommunityIcons name={u.kind === "failed" ? "alert-circle" : u.kind === "ready" ? "download-circle" : "progress-download"} size={20} color={C.accentInk} />
        <View style={{ flex: 1 }}>
          <Text style={s.text}>{text}</Text>
          {u.kind === "downloading" && (
            <View style={s.track}>
              <View style={[s.fill, { width: `${u.progress * 100}%` }]} />
            </View>
          )}
        </View>
      </Tap>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, zIndex: 100 },
  pill: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 12, elevation: 12 },
  text: { color: C.accentInk, fontWeight: "900", fontSize: 14 },
  track: { height: 4, borderRadius: 2, backgroundColor: "#07080A33", marginTop: 5, overflow: "hidden" },
  fill: { height: 4, backgroundColor: C.accentInk },
});
