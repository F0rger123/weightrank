import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { Mark } from "./Logo";
import { C } from "./theme";

/**
 * Short animated intro every time the app opens: the shield slams in, a light
 * sweep crosses it, the wordmark punches up, then it fades. Tap to skip.
 */
export function IntroSplash() {
  const [show, setShow] = useState(true);
  const mark = useSharedValue(0);
  const sweep = useSharedValue(-1);
  const word = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    mark.value = withSpring(1, { damping: 9, stiffness: 140 });
    ring.value = withDelay(250, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    sweep.value = withDelay(450, withTiming(1, { duration: 550, easing: Easing.inOut(Easing.quad) }));
    word.value = withDelay(600, withSequence(withSpring(1.08, { damping: 8 }), withSpring(1)));
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markA = useAnimatedStyle(() => ({ opacity: Math.min(1, mark.value * 1.5), transform: [{ scale: 0.3 + mark.value * 0.7 }, { rotate: `${(1 - mark.value) * -25}deg` }] }));
  const ringA = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 0.6 + ring.value * 1.8 }] }));
  const sweepA = useAnimatedStyle(() => ({ transform: [{ translateX: sweep.value * 220 }, { rotate: "20deg" }], opacity: sweep.value > -1 && sweep.value < 1 ? 0.35 : 0 }));
  const wordA = useAnimatedStyle(() => ({ opacity: Math.min(1, word.value), transform: [{ scale: word.value || 0.001 }] }));

  if (!show) return null;
  return (
    <Animated.View exiting={FadeOut.duration(350)} style={s.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} accessibilityLabel="Skip intro" />
      <View style={s.center} pointerEvents="none">
        <Animated.View style={[s.ring, ringA]} />
        <Animated.View style={[{ overflow: "hidden", borderRadius: 30 }, markA]}>
          <Mark size={150} />
          <Animated.View style={[s.sweep, sweepA]} />
        </Animated.View>
        <Animated.View style={wordA}>
          <Text style={s.word}>WEIGHT<Text style={{ color: C.accent }}>RANK</Text></Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, zIndex: 999, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: 18 },
  ring: { position: "absolute", top: 0, width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: C.accent },
  sweep: { position: "absolute", top: -40, left: -110, width: 40, height: 240, backgroundColor: "#ffffff" },
  word: { fontSize: 40, fontWeight: "900", fontStyle: "italic", color: C.text, letterSpacing: -1 },
});
