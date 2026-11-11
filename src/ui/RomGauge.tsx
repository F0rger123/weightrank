import { StyleSheet, Text, View } from "react-native";
import { C, F } from "./theme";

/**
 * Vertical range-of-motion gauge. Fill = how deep you are right now.
 * The line marks full depth: a rep only counts once the peak marker passes it.
 */
export function RomGauge({ rom, peak, height = 220 }: { rom: number; peak: number; height?: number }) {
  const deep = peak >= 1;
  const fill = Math.min(1, rom);
  const peakPos = Math.min(1.15, peak);
  const H = height;
  const depthLine = H / 1.15; // 1.0 sits below the top to leave room for "extra deep"
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Text style={[F.label, { color: deep ? C.accent : C.muted }]}>Depth</Text>
      <View style={[s.track, { height: H }]}>
        <View style={[s.fill, { height: fill * depthLine, backgroundColor: deep ? C.accent : C.text }]} />
        <View style={[s.depth, { bottom: depthLine }]} />
        {peak > 0.05 && <View style={[s.peak, { bottom: peakPos * depthLine - 2, backgroundColor: deep ? C.accent : C.warn }]} />}
      </View>
      <Text style={[F.small, F.number, { color: deep ? C.accent : C.muted }]}>{Math.round(Math.min(peak, 1) * 100)}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  track: { width: 16, borderRadius: 8, backgroundColor: "#ffffff22", overflow: "visible", justifyContent: "flex-end" },
  fill: { width: 16, borderRadius: 8 },
  depth: { position: "absolute", left: -8, right: -8, height: 3, backgroundColor: C.accent, borderRadius: 2 },
  peak: { position: "absolute", left: -4, right: -4, height: 4, borderRadius: 2 },
});
