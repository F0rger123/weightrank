import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing, FadeOut, SharedValue, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { haptic } from "./haptics";
import { C } from "./theme";

const SHIELD = "M50 5.9 L88 20 L88 51.8 L72.8 76.5 L50 94.1 L27.2 76.5 L12 51.8 L12 20 Z";
const CHEV = "M28.7 21.3 L50 0 L71.3 21.3 L71.3 32.7 L50 11.4 L28.7 32.7 Z"; // at origin, shifted per chevron
const WORD = "WEIGHTRANK".split("");
const RAYS = 12;
const SIZE = 170;

/**
 * Opening sequence (about 2.4 s, tap to skip): energy rays burst, the shield
 * stamps down, two chevrons rocket up into it with a double buzz, shockwaves
 * ripple out, the wordmark letters punch in one by one, then everything zooms
 * through the screen into the app.
 */
export function IntroSplash() {
  const [show, setShow] = useState(true);
  const shield = useSharedValue(0);
  const c1 = useSharedValue(0);
  const c2 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const rays = useSharedValue(0);
  const tag = useSharedValue(0);
  const out = useSharedValue(0);
  const word = useSharedValue(0);

  useEffect(() => {
    rays.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    shield.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 160 }));
    c2.value = withDelay(450, withSpring(1, { damping: 11, stiffness: 180 }));
    c1.value = withDelay(620, withSpring(1, { damping: 11, stiffness: 180 }));
    wave1.value = withDelay(650, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }));
    wave2.value = withDelay(820, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    word.value = withDelay(900, withTiming(WORD.length, { duration: WORD.length * 60 }));
    tag.value = withDelay(1500, withTiming(1, { duration: 400 }));
    out.value = withDelay(2050, withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }));
    const b1 = setTimeout(() => haptic.tick(), 480);
    const b2 = setTimeout(() => haptic.rep(true), 650);
    const done = setTimeout(() => setShow(false), 2450);
    return () => [b1, b2, done].forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: 1 + out.value * 2.2 }] }));
  const shieldA = useAnimatedStyle(() => ({ opacity: Math.min(1, shield.value * 2), transform: [{ scale: 2.2 - shield.value * 1.2 }, { rotate: `${(1 - shield.value) * 30}deg` }] }));
  const tagA = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 12 }] }));

  if (!show) return null;
  return (
    <Animated.View exiting={FadeOut.duration(250)} style={s.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} accessibilityLabel="Skip intro" />
      <Animated.View style={[s.center, stage]} pointerEvents="none">
        <View style={s.markBox}>
          {Array.from({ length: RAYS }, (_, i) => <Ray key={i} i={i} p={rays} />)}
          <Wave p={wave1} color={C.accent} />
          <Wave p={wave2} color={C.accent2} />
          <Animated.View style={[StyleSheet.absoluteFill, shieldA]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={C.accent} />
                  <Stop offset="1" stopColor={C.accent2} />
                </LinearGradient>
              </Defs>
              <Path d={SHIELD} fill="url(#g)" />
            </Svg>
          </Animated.View>
          <Chevron p={c2} y={43.9} />
          <Chevron p={c1} y={22.6} />
        </View>
        <View style={s.word}>
          {WORD.map((ch, i) => <Letter key={i} ch={ch} i={i} p={word} lime={i >= 6} />)}
        </View>
        <Animated.Text style={[s.tag, tagA]}>COUNT EVERY REP · CLIMB EVERY RANK</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

function Chevron({ p, y }: { p: SharedValue<number>; y: number }) {
  // Flies up from below and locks into its cut-out slot in the shield.
  const a = useAnimatedStyle(() => ({ opacity: p.value > 0.02 ? 1 : 0, transform: [{ translateY: (1 - p.value) * 420 }, { scaleY: 1 + (1 - p.value) * 1.5 }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, a]}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
        <Path d={CHEV} fill={C.bg} transform={`translate(0 ${y})`} />
      </Svg>
    </Animated.View>
  );
}

function Wave({ p, color }: { p: SharedValue<number>; color: string }) {
  const a = useAnimatedStyle(() => ({ opacity: p.value > 0 ? (1 - p.value) * 0.9 : 0, transform: [{ scale: 0.6 + p.value * 2.4 }] }));
  return <Animated.View style={[s.wave, { borderColor: color }, a]} />;
}

function Ray({ i, p }: { i: number; p: SharedValue<number> }) {
  const deg = (360 / RAYS) * i;
  const a = useAnimatedStyle(() => ({
    opacity: p.value < 0.6 ? p.value * 1.4 : (1 - p.value) * 2,
    transform: [{ rotate: `${deg}deg` }, { translateY: -40 - p.value * 220 }, { scaleY: 0.3 + p.value }],
  }));
  return <Animated.View style={[s.ray, a]} />;
}

/** Letter i punches in once the shared counter passes i. */
function Letter({ ch, i, p, lime }: { ch: string; i: number; p: SharedValue<number>; lime: boolean }) {
  const a = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, p.value - i));
    return { opacity: k, transform: [{ translateY: (1 - k) * 40 }, { scale: 0.4 + k * 0.6 }] };
  });
  return <Animated.Text style={[s.letter, lime && { color: C.accent }, a]}>{ch}</Animated.Text>;
}

const s = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, zIndex: 999, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  center: { alignItems: "center", gap: 22 },
  markBox: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  wave: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  ray: { position: "absolute", width: 3, height: 60, borderRadius: 2, backgroundColor: C.accent },
  word: { flexDirection: "row" },
  letter: { fontSize: 42, fontWeight: "900", fontStyle: "italic", color: C.text, letterSpacing: -0.5 },
  tag: { color: C.muted, fontSize: 12, fontWeight: "900", letterSpacing: 2.4 },
});
