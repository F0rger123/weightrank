import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXERCISE_ORDER, EXERCISES } from "@/domain/exercises";
import { currentStreak, dailyQuests, dayKey, questProgress, sessionsOn } from "@/domain/progress";
import { useProfile } from "@/store/profile";
import { Bar, Card, EXERCISE_ICON, SectionLabel } from "@/ui/bits";
import { C, F, R } from "@/ui/theme";

/** Open the app, pick an exercise, train. No setup, no sign-up, no paywall. */
export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const today = dayKey(new Date());
  const todays = sessionsOn(profile.sessions, today);
  const streak = currentStreak(profile.sessions, new Date());
  const quests = dailyQuests(today);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.page, { paddingTop: insets.top + 16 }]}>
      <View style={s.header}>
        <Text style={F.h1}>
          Weight<Text style={{ color: C.accent }}>Rank</Text>
        </Text>
        <View style={s.streak}>
          <MaterialCommunityIcons name="fire" size={18} color={streak ? C.accent : C.faint} />
          <Text style={[F.body, F.number, { fontWeight: "800" }]}>{streak}</Text>
        </View>
      </View>

      <SectionLabel>Pick an exercise</SectionLabel>
      <View style={s.grid}>
        {EXERCISE_ORDER.map((id, i) => {
          const ex = EXERCISES[id];
          const done = todays.filter((x) => x.exercise === id).reduce((a, b) => a + b.amount, 0);
          return (
            <Pressable
              key={id}
              onPress={() => router.push({ pathname: "/train/[exercise]", params: { exercise: id } })}
              style={({ pressed }) => [s.tile, i === 0 && s.tileWide, pressed && { opacity: 0.75 }]}
            >
              <MaterialCommunityIcons name={EXERCISE_ICON[id]} size={i === 0 ? 40 : 30} color={i === 0 ? C.accentInk : C.accent} />
              <Text style={[s.tileName, i === 0 && { color: C.accentInk, fontSize: 24 }]}>{ex.name}</Text>
              <Text style={[F.small, i === 0 && { color: "#0B0D10aa" }]}>
                {done ? `${done}${ex.kind === "hold" ? "s" : ""} today` : ex.kind === "hold" ? "Timed hold" : "Rep counter"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Today's quests</SectionLabel>
      <Card style={{ gap: 14 }}>
        {quests.map((q) => {
          const p = questProgress(q, todays);
          const done = p >= q.goal;
          return (
            <View key={q.id} style={{ gap: 6 }}>
              <View style={s.questRow}>
                <MaterialCommunityIcons name={done ? "check-circle" : "circle-outline"} size={18} color={done ? C.good : C.faint} />
                <Text style={[F.body, { flex: 1 }]}>{q.title}</Text>
                <Text style={[F.small, F.number]}>+{q.xp} XP</Text>
              </View>
              <Bar value={p / q.goal} color={done ? C.good : C.accent} height={6} />
            </View>
          );
        })}
      </Card>
      <Text style={[F.small, { textAlign: "center", marginTop: 8 }]}>Free. On-device tracking: video never leaves your phone.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48.5%", flexGrow: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: 16, gap: 6, borderWidth: 1, borderColor: C.line, minHeight: 120, justifyContent: "flex-end" },
  tileWide: { width: "100%", backgroundColor: C.accent, borderColor: C.accent, minHeight: 150 },
  tileName: { fontSize: 18, fontWeight: "900", color: C.text },
  questRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
