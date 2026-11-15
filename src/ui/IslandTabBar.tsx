import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "./haptics";
import { C } from "./theme";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

export const TABS: { href: "/" | "/duel" | "/adventure" | "/progress"; label: string; icon: Icon }[] = [
  { href: "/", label: "Train", icon: "dumbbell" },
  { href: "/duel", label: "Duel", icon: "sword-cross" },
  { href: "/adventure", label: "Adventure", icon: "castle" },
  { href: "/progress", label: "Progress", icon: "chart-line-variant" },
];

/** Height of the island plus its gap, so screens can leave room at the bottom. */
export function useIslandSpace(): number {
  const insets = useSafeAreaInsets();
  return 72 + Math.max(insets.bottom, 10) + 24;
}

/**
 * Floating "island" tab bar: lifted off the bottom edge so Android's gesture
 * bar or nav buttons never cover it, with a sliding highlight under the active tab.
 */
export function IslandTabBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const active = Math.max(0, TABS.findIndex((t) => (t.href === "/" ? path === "/" : path.startsWith(t.href))));
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const tabW = w / TABS.length;

  useEffect(() => {
    if (tabW) x.value = withSpring(active * tabW, { damping: 18, stiffness: 220 });
  }, [active, tabW]); // eslint-disable-line react-hooks/exhaustive-deps

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 10) + 10 }]}>
      <View style={s.island} onLayout={(e) => setW(e.nativeEvent.layout.width - 12)}>
        {tabW > 0 && <Animated.View style={[s.pill, { width: tabW }, pill]} />}
        {TABS.map((t, i) => {
          const on = i === active;
          return (
            <Pressable
              key={t.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t.label}
              onPress={() => {
                haptic.tap();
                if (!on) router.navigate(t.href);
              }}
              style={s.tab}
            >
              <MaterialCommunityIcons name={t.icon} size={23} color={on ? C.accentInk : C.muted} />
              <Text style={[s.label, { color: on ? C.accentInk : C.muted }]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, alignItems: "stretch" },
  island: {
    flexDirection: "row",
    height: 70,
    padding: 6,
    borderRadius: 35,
    backgroundColor: "#16191FF2",
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  pill: { position: "absolute", top: 6, bottom: 6, left: 6, borderRadius: 29, backgroundColor: C.accent },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.2 },
});
