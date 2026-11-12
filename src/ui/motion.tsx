import { ReactNode, useEffect } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { haptic } from "./haptics";

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that squashes on touch and gives a light buzz. */
export function Tap({
  children, style, onPress, scaleTo = 0.96, silent, ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; silent?: boolean; children?: ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 18, stiffness: 400 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 12, stiffness: 300 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!silent) haptic.tap();
        onPress?.(e);
      }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
}

/** Content that slides up and fades in; `i` staggers lists. */
export function Appear({ children, i = 0, style }: { children: ReactNode; i?: number; style?: StyleProp<ViewStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(i * 55, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 18 }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Pops (scale bounce) whenever `trigger` changes: rep counts, scores. */
export function Pop({ trigger, children, amount = 1.25, style }: { trigger: unknown; children: ReactNode; amount?: number; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withSequence(withTiming(amount, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 260 }));
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Slow breathing glow/scale loop for hero elements. */
export function Pulse({ children, style, min = 0.94, ms = 1400 }: { children: ReactNode; style?: StyleProp<ViewStyle>; min?: number; ms?: number }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withTiming(min, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 0.6 + (s.value - min) / (1 - min) * 0.4 }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Width/height bar that springs to its value. */
export function SpringBar({ value, color, height = 8, track }: { value: number; color: string; height?: number; track: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 18, stiffness: 120 });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <Animated.View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height, backgroundColor: color, borderRadius: height }, a]} />
    </Animated.View>
  );
}
