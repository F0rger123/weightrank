import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ExerciseId } from "@/domain/exercises";
import { Rank } from "@/domain/rating";
import { Pulse, SpringBar, Tap } from "./motion";
import { C, F, R } from "./theme";

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const EXERCISE_ICON: Record<ExerciseId, IconName> = {
  pushup: "arm-flex",
  squat: "human-handsdown",
  dip: "format-vertical-align-bottom",
  pullup: "human-handsup",
  plank: "timer-sand",
};

export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: string }) {
  return (
    <View style={[s.card, glow && { borderColor: glow + "66", shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 18, elevation: 6 }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label, onPress, kind = "primary", icon, disabled, small,
}: {
  label: string;
  onPress(): void;
  kind?: "primary" | "ghost" | "danger";
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
}) {
  const primary = kind === "primary";
  const ink = primary ? C.accentInk : kind === "danger" ? C.bad : C.text;
  const inner = (
    <>
      {icon && <MaterialCommunityIcons name={icon} size={small ? 18 : 22} color={ink} />}
      <Text style={[s.btnText, small && { fontSize: 15 }, { color: ink }]}>{label}</Text>
    </>
  );
  return (
    <Tap onPress={onPress} disabled={disabled} style={[s.btnWrap, primary && s.btnGlow, disabled && { opacity: 0.5 }]}>
      {primary ? (
        <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, small && s.btnSmall]}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[s.btn, small && s.btnSmall, s.btnGhost]}>{inner}</View>
      )}
    </Tap>
  );
}

export function RankBadge({ rank, size = 44, pulse }: { rank: Rank; size?: number; pulse?: boolean }) {
  const badge = (
    <View style={[s.badge, { width: size, height: size, borderRadius: size / 2.6, borderColor: rank.color, shadowColor: rank.color }]}>
      <MaterialCommunityIcons name="shield-star" size={size * 0.58} color={rank.color} />
    </View>
  );
  return pulse ? <Pulse min={0.97}>{badge}</Pulse> : badge;
}

export function Bar({ value, color = C.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  return <SpringBar value={value} color={color} height={height} track={C.surface2} />;
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
      <Text style={F.label}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, icon, on, onPress }: { label: string; icon?: IconName; on?: boolean; onPress(): void }) {
  return (
    <Tap onPress={onPress} style={[s.chip, on && s.chipOn]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={on ? C.accentInk : C.text} />}
      <Text style={[s.chipText, on && { color: C.accentInk }]}>{label}</Text>
    </Tap>
  );
}

/** Small stat pill: icon + number + label. */
export function StatPill({ icon, value, label, color = C.accent }: { icon: IconName; value: string | number; label: string; color?: string }) {
  return (
    <View style={s.pill}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[F.body, F.number, { fontWeight: "900" }]}>{value}</Text>
      <Text style={[F.small, { fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, borderWidth: 1, borderColor: C.line },
  btnWrap: { borderRadius: R.pill },
  btnGlow: { shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  btn: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", height: 60, borderRadius: R.pill, paddingHorizontal: 26 },
  btnSmall: { height: 46, paddingHorizontal: 18 },
  btnGhost: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  btnText: { fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },
  badge: { borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2, shadowOpacity: 0.6, shadowRadius: 12, elevation: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 42, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontWeight: "800" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, paddingHorizontal: 12, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
});
