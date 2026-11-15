import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing, FadeIn, SlideInLeft, SlideInRight, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence,
  withSpring, withTiming, ZoomIn,
} from "react-native-reanimated";
import { Rank } from "@/domain/rating";
import { C, F } from "./theme";

const { width: W, height: H } = Dimensions.get("window");
const COLORS = [C.accent, C.accent2, "#FFFFFF", C.violet, C.warn];

/** Burst of confetti falling over the screen. Decorative; ignores touches. */
export function Confetti({ count = 60 }: { count?: number }) {
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: Math.random() * W,
      delay: Math.random() * 500,
      dur: 1600 + Math.random() * 1400,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      spin: (Math.random() - 0.5) * 1080,
      drift: (Math.random() - 0.5) * 120,
    })),
    [count],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => <Bit key={i} {...b} />)}
    </View>
  );
}

type BitProps = { x: number; delay: number; dur: number; size: number; color: string; spin: number; drift: number };

function Bit({ x, delay, dur, size, color, spin, drift }: BitProps) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [{ translateY: -40 + p.value * (H + 80) }, { translateX: drift * p.value }, { rotate: `${spin * p.value}deg` }],
  }));
  return <Animated.View style={[{ position: "absolute", left: x, top: 0, width: size, height: size * 0.5, backgroundColor: color, borderRadius: 2 }, a]} />;
}

/** Rank badge that slams in and pulses: placement and promotions. */
export function RankReveal({ rank, label = "Your starting rank" }: { rank: Rank; label?: string }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withDelay(500, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const g = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 1 + glow.value * 0.25 }] }));
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Animated.Text entering={FadeIn.delay(100)} style={F.label}>{label}</Animated.Text>
      <View style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[s.halo, { backgroundColor: rank.color + "33" }, g]} />
        <Animated.View entering={ZoomIn.springify().damping(8).delay(250)}>
          <MaterialCommunityIcons name="shield-star" size={150} color={rank.color} />
        </Animated.View>
      </View>
      <Animated.Text entering={ZoomIn.delay(700).springify()} style={[F.display, { color: rank.color, fontSize: 56 }]}>
        {rank.name.toUpperCase()}
      </Animated.Text>
    </View>
  );
}

/** "YOU vs THEM" slam before a match starts. */
export function VsIntro({ me, them, sub }: { me: string; them: string; sub?: string }) {
  const flash = useSharedValue(0);
  useEffect(() => {
    flash.value = withDelay(450, withSequence(withTiming(0.8, { duration: 80 }), withTiming(0, { duration: 400 })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View style={s.vs}>
      <Animated.View entering={SlideInLeft.springify().damping(14)} style={[s.side, { backgroundColor: C.accent }]}>
        <Text style={[s.name, { color: C.accentInk }]} numberOfLines={1}>{me}</Text>
      </Animated.View>
      <Animated.Text entering={ZoomIn.delay(380).springify().damping(6)} style={s.vsText}>VS</Animated.Text>
      <Animated.View entering={SlideInRight.springify().damping(14)} style={[s.side, { backgroundColor: C.surface2, alignItems: "flex-end" }]}>
        <Text style={s.name} numberOfLines={1}>{them}</Text>
      </Animated.View>
      {sub ? <Animated.Text entering={FadeIn.delay(700)} style={[F.small, { textAlign: "center", marginTop: 8 }]}>{sub}</Animated.Text> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#fff", borderRadius: 18 }, f]} />
    </View>
  );
}

/** Looping flame for streaks. */
export function Flame({ size = 22, lit = true }: { size?: number; lit?: boolean }) {
  const sc = useSharedValue(1);
  useEffect(() => {
    if (lit) sc.value = withRepeat(withSequence(withSpring(1.15, { damping: 4 }), withSpring(0.95, { damping: 6 })), -1, true);
  }, [lit]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={a}>
      <MaterialCommunityIcons name="fire" size={size} color={lit ? "#FF8A1F" : C.faint} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  halo: { position: "absolute", width: 180, height: 180, borderRadius: 90 },
  vs: { alignSelf: "stretch", gap: 10, paddingVertical: 10 },
  side: { paddingVertical: 18, paddingHorizontal: 22, borderRadius: 18, transform: [{ skewX: "-8deg" }] },
  name: { fontSize: 30, fontWeight: "900", fontStyle: "italic", color: C.text },
  vsText: { alignSelf: "center", fontSize: 64, fontWeight: "900", fontStyle: "italic", color: C.accent, textShadowColor: C.accent, textShadowRadius: 24, marginVertical: -8 },
});
