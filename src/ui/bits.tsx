import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ExerciseId } from "@/domain/exercises";
import { Rank } from "@/domain/rating";
import { C, F, R } from "./theme";

export const EXERCISE_ICON: Record<ExerciseId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pushup: "arm-flex",
  squat: "human-handsdown",
  dip: "format-vertical-align-bottom",
  pullup: "human-handsup",
  plank: "timer-sand",
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  label, onPress, kind = "primary", icon, disabled,
}: {
  label: string;
  onPress(): void;
  kind?: "primary" | "ghost";
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, primary ? s.btnPrimary : s.btnGhost, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={20} color={primary ? C.accentInk : C.text} />}
      <Text style={[s.btnText, { color: primary ? C.accentInk : C.text }]}>{label}</Text>
    </Pressable>
  );
}

export function RankBadge({ rank, size = 44 }: { rank: Rank; size?: number }) {
  return (
    <View style={[s.badge, { width: size, height: size, borderRadius: size / 2.6, borderColor: rank.color }]}>
      <MaterialCommunityIcons name="shield-star" size={size * 0.55} color={rank.color} />
    </View>
  );
}

export function Bar({ value, color = C.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.surface2, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={[F.label, { marginTop: 8 }]}>{children}</Text>;
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, borderWidth: 1, borderColor: C.line },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", height: 56, borderRadius: R.pill, paddingHorizontal: 24 },
  btnPrimary: { backgroundColor: C.accent },
  btnGhost: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  btnText: { fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },
  badge: { borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2 },
});
