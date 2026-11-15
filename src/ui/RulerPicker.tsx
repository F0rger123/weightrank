import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "./haptics";
import { C, F } from "./theme";

const TICK = 14; // px between values

/**
 * Swipeable ruler: drag left/right, it snaps to whole values and buzzes on
 * every step. Big readout on top. Used for age, weight and height.
 */
export function RulerPicker({
  min, max, value, onChange, unit, format, majorEvery = 10,
}: {
  min: number;
  max: number;
  value: number;
  onChange(v: number): void;
  unit?: string;
  /** Custom readout, e.g. 70 -> 5'10" */
  format?: (v: number) => string;
  majorEvery?: number;
}) {
  const [w, setW] = useState(0);
  const ref = useRef<{ scrollTo(o: { x: number; animated: boolean }): void } | null>(null);
  const last = useRef(value);
  const pop = useSharedValue(1);
  const ticks = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);

  useEffect(() => {
    if (w) ref.current?.scrollTo({ x: (value - min) * TICK, animated: false });
  }, [w, min]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const v = Math.max(min, Math.min(max, Math.round(e.nativeEvent.contentOffset.x / TICK) + min));
    if (v !== last.current) {
      last.current = v;
      haptic.tap();
      pop.value = withSequence(withTiming(1.08, { duration: 50 }), withSpring(1, { damping: 12 }));
      onChange(v);
    }
  };

  const readA = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={{ gap: 14 }}>
      <Animated.View style={[s.readout, readA]}>
        <Text style={s.value}>{format ? format(value) : value}</Text>
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </Animated.View>
      <View style={s.track} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={ref as never}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: Math.max(0, w / 2 - TICK / 2) }}
        >
          {ticks.map((t) => {
            const major = t % majorEvery === 0;
            const mid = !major && t % (majorEvery / 2) === 0;
            return (
              <View key={t} style={{ width: TICK, alignItems: "center" }}>
                <View style={[s.tick, { height: major ? 38 : mid ? 26 : 16, backgroundColor: major ? C.text : C.faint }]} />
                {major && <Text style={s.label}>{format ? format(t) : t}</Text>}
              </View>
            );
          })}
        </ScrollView>
        <View pointerEvents="none" style={s.needle} />
        <View pointerEvents="none" style={[s.fade, { left: 0 }]} />
        <View pointerEvents="none" style={[s.fade, { right: 0 }]} />
      </View>
      <Text style={[F.small, { textAlign: "center" }]}>Swipe to adjust</Text>
    </View>
  );
}

const s = StyleSheet.create({
  readout: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 },
  value: { fontSize: 76, fontWeight: "900", fontStyle: "italic", color: C.text, letterSpacing: -2, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 24, fontWeight: "800", color: C.accent },
  track: { height: 86, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: "hidden", justifyContent: "flex-start", paddingTop: 10 },
  tick: { width: 3, borderRadius: 2 },
  label: { color: C.muted, fontSize: 11, fontWeight: "800", marginTop: 4, width: 50, textAlign: "center" },
  needle: { position: "absolute", left: "50%", marginLeft: -2, top: 0, bottom: 0, width: 4, borderRadius: 2, backgroundColor: C.accent },
  fade: { position: "absolute", top: 0, bottom: 0, width: 40, backgroundColor: "#12141980" },
});
