import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIslandSpace } from "@/ui/IslandTabBar";
import { EXERCISE_ORDER, EXERCISES } from "@/domain/exercises";
import { ACHIEVEMENTS, bestStreak, currentStreak, dayKey, levelFor } from "@/domain/progress";
import { APP_VERSION } from "@/lib/config";
import { useAccount } from "@/store/account";
import { useProfile } from "@/store/profile";
import { Bar, Card, SectionLabel } from "@/ui/bits";
import { C, F, R } from "@/ui/theme";

export default function ProgressTab() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useIslandSpace();
  const { profile, setSettings, resetAll } = useProfile();
  const { account } = useAccount();
  const lvl = levelFor(profile.xp);
  const sessions = profile.sessions;
  const now = new Date();

  // Last 14 days activity
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
    const key = dayKey(d);
    const reps = sessions.filter((s) => dayKey(new Date(s.at)) === key && s.exercise !== "plank").reduce((a, b) => a + b.amount, 0);
    return { key, reps, label: "SMTWTFS"[d.getDay()] };
  });
  const maxDay = Math.max(10, ...days.map((d) => d.reps));

  const totals = EXERCISE_ORDER.map((id) => ({
    id,
    total: sessions.filter((s) => s.exercise === id).reduce((a, b) => a + b.amount, 0),
    best: Math.max(0, ...sessions.filter((s) => s.exercise === id).map((s) => s.amount)),
  }));

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 16, paddingBottom: bottomSpace }]}>
      <Text style={F.h1}>Progress</Text>

      <View style={s.stats}>
        <Stat label="Level" value={lvl.level} />
        <Stat label="Streak" value={currentStreak(sessions, now)} icon="fire" />
        <Stat label="Best streak" value={bestStreak(sessions)} />
      </View>
      <Card style={{ gap: 8 }}>
        <View style={s.row}>
          <Text style={F.label}>Level {lvl.level} → {lvl.level + 1}</Text>
          <Text style={[F.small, F.number]}>{lvl.into}/{lvl.needed} XP</Text>
        </View>
        <Bar value={lvl.into / lvl.needed} />
      </Card>

      <SectionLabel>Last 14 days (reps)</SectionLabel>
      <Card>
        <View style={s.chart}>
          {days.map((d) => (
            <View key={d.key} style={s.col}>
              <View style={[s.colBar, { height: Math.max(3, (d.reps / maxDay) * 90), backgroundColor: d.reps ? C.accent : C.surface2 }]} />
              <Text style={s.colLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionLabel>Totals</SectionLabel>
      <Card style={{ gap: 10 }}>
        {totals.map((t) => (
          <View key={t.id} style={s.row}>
            <Text style={[F.body, { flex: 1 }]}>{EXERCISES[t.id].name}</Text>
            <Text style={[F.small, F.number, { width: 90, textAlign: "right" }]}>best {t.best}{t.id === "plank" ? "s" : ""}</Text>
            <Text style={[F.body, F.number, { width: 70, textAlign: "right", fontWeight: "800" }]}>{t.total}{t.id === "plank" ? "s" : ""}</Text>
          </View>
        ))}
      </Card>

      <SectionLabel>{`Achievements ${profile.achievements.length}/${ACHIEVEMENTS.length}`}</SectionLabel>
      <View style={s.ach}>
        {ACHIEVEMENTS.map((a) => {
          const got = profile.achievements.includes(a.id);
          return (
            <View key={a.id} style={[s.achItem, got && { borderColor: C.accent }]}>
              <MaterialCommunityIcons name={got ? "trophy" : "trophy-outline"} size={22} color={got ? C.accent : C.faint} />
              <Text style={[F.body, { fontWeight: "800", color: got ? C.text : C.muted }]}>{a.title}</Text>
              <Text style={F.small}>{a.detail}</Text>
            </View>
          );
        })}
      </View>

      <SectionLabel>Settings</SectionLabel>
      <Card style={{ gap: 14 }}>
        <Pressable onPress={() => router.push("/account")} style={s.row}>
          <MaterialCommunityIcons name="account-circle" size={20} color={C.accent} />
          <Text style={[F.body, { flex: 1 }]}>{account && !account.guest ? `Account: ${account.email}` : "Create account / sign in"}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.faint} />
        </Pressable>
        <Pressable onPress={() => router.push("/friends")} style={s.row}>
          <MaterialCommunityIcons name="account-group" size={20} color={C.accent} />
          <Text style={[F.body, { flex: 1 }]}>Friends</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.faint} />
        </Pressable>
        <Pressable onPress={() => router.push("/install")} style={s.row}>
          <MaterialCommunityIcons name="cellphone-arrow-down" size={20} color={C.accent} />
          <Text style={[F.body, { flex: 1 }]}>Get the app / send it to a friend</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.faint} />
        </Pressable>
        <Pressable onPress={() => router.push("/challenge")} style={s.row}>
          <MaterialCommunityIcons name="account-edit-outline" size={20} color={C.accent} />
          <Text style={[F.body, { flex: 1 }]}>Name: {profile.name}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.faint} />
        </Pressable>
        <View style={s.row}>
          <Text style={[F.body, { flex: 1 }]}>Vibration</Text>
          <Switch value={profile.settings.vibrate !== false} onValueChange={(v) => setSettings({ vibrate: v })} trackColor={{ true: C.accent, false: C.surface2 }} />
        </View>
        <View style={s.row}>
          <Text style={[F.body, { flex: 1 }]}>Count reps out loud</Text>
          <Switch value={profile.settings.voice} onValueChange={(v) => setSettings({ voice: v })} trackColor={{ true: C.accent, false: C.surface2 }} />
        </View>
        <Pressable
          onPress={() =>
            Alert.alert("Reset everything?", "Rating, history, XP and achievements on this phone will be erased.", [
              { text: "Cancel", style: "cancel" },
              { text: "Reset", style: "destructive", onPress: resetAll },
            ])
          }
        >
          <Text style={[F.body, { color: C.bad }]}>Reset progress</Text>
        </Pressable>
      </Card>
      <Text style={[F.small, { textAlign: "center" }]}>WeightRank v{APP_VERSION} · Progress is saved on this phone, and to your account when signed in.</Text>
    </ScrollView>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: "fire" }) {
  return (
    <View style={s.stat}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={value ? C.accent : C.faint} />}
        <Text style={[F.h1, F.number]}>{value}</Text>
      </View>
      <Text style={F.small}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.line, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 110 },
  col: { alignItems: "center", gap: 4, flex: 1 },
  colBar: { width: 12, borderRadius: 6 },
  colLabel: { color: C.faint, fontSize: 10, fontWeight: "700" },
  ach: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  achItem: { width: "48%", flexGrow: 1, backgroundColor: C.surface, borderRadius: R.md, padding: 12, gap: 4, borderWidth: 1, borderColor: C.line },
});
