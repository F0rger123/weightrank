import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RANK_CAP } from "@/domain/bots";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { rankFor, rankProgress, RANKS } from "@/domain/rating";
import { useProfile } from "@/store/profile";
import { Bar, Button, Card, EXERCISE_ICON, RankBadge, SectionLabel } from "@/ui/bits";
import { C, F, R } from "@/ui/theme";

export const DUEL_EXERCISES: ExerciseId[] = ["pushup", "squat", "dip", "pullup"];

export default function DuelTab() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [exercise, setExercise] = useState<ExerciseId>("pushup");
  const rank = rankFor(profile.rating);
  const next = RANKS[RANKS.indexOf(rank) + 1];
  const duels = profile.sessions.filter((x) => x.mode === "duel");
  const wins = duels.filter((x) => x.outcome === "win").length;

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 16 }]}>
      <Text style={F.h1}>Ranked duel</Text>
      <Text style={F.small}>60 seconds. Most clean reps wins. Only full-depth reps count, for you and for them.</Text>

      <Card style={{ gap: 14 }}>
        <View style={s.rankRow}>
          <RankBadge rank={rank} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[F.h2, { color: rank.color }]}>{rank.name}</Text>
            <Text style={[F.display, F.number, { fontSize: 36 }]}>{profile.rating}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[F.body, F.number, { fontWeight: "800" }]}>{wins}-{duels.length - wins}</Text>
            <Text style={F.small}>W-L</Text>
          </View>
        </View>
        <Bar value={rankProgress(profile.rating)} color={rank.color} />
        <Text style={F.small}>{next ? `${next.min - profile.rating} to ${next.name}` : "Top rank. Defend it."}</Text>
      </Card>

      <SectionLabel>Exercise</SectionLabel>
      <View style={s.pills}>
        {DUEL_EXERCISES.map((id) => (
          <Pressable key={id} onPress={() => setExercise(id)} style={[s.pill, exercise === id && s.pillOn]}>
            <MaterialCommunityIcons name={EXERCISE_ICON[id]} size={18} color={exercise === id ? C.accentInk : C.text} />
            <Text style={[s.pillText, exercise === id && { color: C.accentInk }]}>{EXERCISES[id].name}</Text>
          </Pressable>
        ))}
      </View>

      <Button label="Find opponent" icon="sword-cross" onPress={() => router.push({ pathname: "/duel/[exercise]", params: { exercise } })} />

      <SectionLabel>Ranks</SectionLabel>
      <Card style={{ gap: 10 }}>
        {RANKS.map((r) => (
          <View key={r.id} style={s.rankLine}>
            <View style={[s.dot, { backgroundColor: r.color }]} />
            <Text style={[F.body, { flex: 1, fontWeight: r.id === rank.id ? "900" : "500" }]}>{r.name}</Text>
            <Text style={[F.small, F.number]}>{r.min}+</Text>
            <Text style={[F.small, F.number, { width: 92, textAlign: "right" }]}>bots ≤ {RANK_CAP[r.id]} push-ups</Text>
          </View>
        ))}
      </Card>
      <Text style={[F.small, { textAlign: "center" }]}>Opponents are bots near your rating with honest, capped paces. Real-player duels come later.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 40, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  pillOn: { backgroundColor: C.accent, borderColor: C.accent },
  pillText: { color: C.text, fontWeight: "800" },
  rankLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
