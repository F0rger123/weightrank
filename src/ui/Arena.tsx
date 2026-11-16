import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { Pose } from "@/domain/pose";
import { SpringBar } from "./motion";
import { C, F, R } from "./theme";

const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

/** Your live body, redrawn as a small glowing fighter. */
export function HeroAvatar({ pose, size = 96, color = C.accent }: { pose: Pose | null; size?: number; color?: string }) {
  const pts = pose ? [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 0].filter((i) => pose[i] && (pose[i].visibility ?? 1) > 0.2) : [];
  if (!pose || pts.length < 4) {
    return (
      <View style={[s.heroBox, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.5 }}>🧍</Text>
      </View>
    );
  }
  const xs = pts.map((i) => pose[i].x);
  const ys = pts.map((i) => pose[i].y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.05);
  const pad = 10;
  const k = (size - pad * 2) / span;
  const X = (x: number) => pad + (x - minX) * k + ((size - pad * 2) - (maxX - minX) * k) / 2;
  const Y = (y: number) => pad + (y - minY) * k + ((size - pad * 2) - (maxY - minY) * k) / 2;
  const ok = (i: number) => (pose[i]?.visibility ?? 0) > 0.2;
  return (
    <View style={[s.heroBox, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {BONES.filter(([a, b]) => ok(a) && ok(b)).map(([a, b]) => (
          <Line key={`${a}-${b}`} x1={X(pose[a].x)} y1={Y(pose[a].y)} x2={X(pose[b].x)} y2={Y(pose[b].y)} stroke={color} strokeWidth={4} strokeLinecap="round" />
        ))}
        {ok(0) && <Circle cx={X(pose[0].x)} cy={Y(pose[0].y)} r={7} fill={C.bg} stroke={color} strokeWidth={3} />}
      </Svg>
    </View>
  );
}

/** Hero vs monster strip: lunges and hit shakes on every rep. */
export function Arena({
  pose, emoji, name, hp, maxHp, hits, lastHit, round, rounds, task, heroHp, warn, combo, callout, enraged,
}: {
  pose: Pose | null; emoji: string; name: string; hp: number; maxHp: number;
  /** Increments on every hit so the animations fire. */
  hits: number; lastHit: number; round: number; rounds: number; task: string;
  heroHp: number; warn: boolean; combo: number;
  callout: { text: string; color: string; key: number } | null; enraged: boolean;
}) {
  const lunge = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!hits) return;
    lunge.value = withSequence(withTiming(28, { duration: 90 }), withSpring(0, { damping: 9 }));
    shake.value = withSequence(withTiming(10, { duration: 50 }), withTiming(-10, { duration: 50 }), withTiming(6, { duration: 50 }), withSpring(0));
  }, [hits]); // eslint-disable-line react-hooks/exhaustive-deps
  const heroA = useAnimatedStyle(() => ({ transform: [{ translateX: lunge.value }] }));
  const monA = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { rotate: `${shake.value}deg` }] }));

  return (
    <View style={s.arena}>
      <View style={s.fight}>
        <View style={{ gap: 4 }}>
          <Animated.View style={heroA}><HeroAvatar pose={pose} size={84} /></Animated.View>
          <SpringBar value={heroHp / 100} color={heroHp > 35 ? C.good : C.bad} height={6} track="#ffffff22" />
        </View>
        <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
          {hits > 0 && (
            <Animated.Text key={hits} entering={ZoomIn.springify().damping(7)} style={s.dmg}>-{lastHit}</Animated.Text>
          )}
          {callout && (
            <Animated.Text key={callout.key} entering={ZoomIn.springify().damping(6)} style={[s.callout, { color: callout.color }]}>{callout.text}</Animated.Text>
          )}
          {combo >= 2 && <Text style={s.combo}>x{combo} combo</Text>}
        </View>
        <Animated.View style={[{ alignItems: "center" }, monA]}>
          {warn && <Text style={s.warn}>! ATTACK</Text>}
          <Text style={{ fontSize: enraged ? 74 : 64, opacity: hp > 0 ? 1 : 0.3 }}>{emoji}</Text>
          {enraged && <Text style={[s.warn, { fontSize: 10 }]}>ENRAGED</Text>}
        </Animated.View>
      </View>
      <View style={s.row}>
        <Text style={[F.body, { fontWeight: "900", flex: 1 }]} numberOfLines={1}>{name}</Text>
        <Text style={[F.small, F.number]}>{Math.max(0, Math.round(hp))}/{maxHp}</Text>
      </View>
      <SpringBar value={hp / maxHp} color={C.bad} height={10} track="#ffffff22" />
      <View style={s.row}>
        <View style={s.dots}>
          {Array.from({ length: rounds }, (_, i) => <View key={i} style={[s.dot, i < round && { backgroundColor: C.good }, i === round && { backgroundColor: C.accent }]} />)}
        </View>
        <Text style={[F.small, { color: C.text, fontWeight: "800" }]}>Round {Math.min(round + 1, rounds)}/{rounds} · {task}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  arena: { backgroundColor: "#000c", borderRadius: R.md, padding: 12, gap: 8 },
  fight: { flexDirection: "row", alignItems: "center" },
  heroBox: { borderRadius: 18, backgroundColor: "#ffffff0d", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.accent + "44" },
  dmg: { color: C.warn, fontWeight: "900", fontSize: 28, fontStyle: "italic" },
  callout: { fontWeight: "900", fontSize: 18, fontStyle: "italic", letterSpacing: 0.5 },
  combo: { color: C.accent, fontWeight: "900", fontSize: 12 },
  warn: { color: C.bad, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ffffff33" },
});
