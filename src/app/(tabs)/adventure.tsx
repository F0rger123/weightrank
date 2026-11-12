import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { creatureFor, repDamage } from "@/domain/adventure";
import { EXERCISE_ORDER, EXERCISES, ExerciseId } from "@/domain/exercises";
import { levelFor } from "@/domain/progress";
import { useProfile } from "@/store/profile";
import { Bar, Button, Card, Chip, EXERCISE_ICON, SectionLabel } from "@/ui/bits";
import { Appear, Pulse } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

export default function AdventureTab() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [exercise, setExercise] = useState<ExerciseId>("pushup");
  const lvl = levelFor(profile.xp);
  const foe = creatureFor(profile.adventureStage);
  const hit = EXERCISES[exercise].kind === "hold" ? null : repDamage(exercise, lvl.level, false);

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 16 }]}>
      <Text style={F.h1}>Adventure</Text>
      <Text style={F.small}>Every clean rep is a hit. Perfect-depth reps crit for 1.5×. Beat the creature before time runs out.</Text>

      <Card style={{ gap: 10 }}>
        <View style={s.row}>
          <Text style={F.label}>Level {lvl.level}</Text>
          <Text style={[F.small, F.number]}>{lvl.into}/{lvl.needed} XP</Text>
        </View>
        <Bar value={lvl.into / lvl.needed} />
      </Card>

      <Card style={{ alignItems: "center", gap: 8 }} glow={foe.boss ? C.bad : C.violet}>
        <Text style={F.label}>Stage {foe.stage}{foe.boss ? " · Boss" : ""}</Text>
        <Pulse min={0.92} ms={1600}><Text style={{ fontSize: 92 }}>{foe.emoji}</Text></Pulse>
        <Text style={F.h2}>{foe.name}</Text>
        <Text style={[F.small, F.number]}>{foe.hp} HP · {foe.timeLimit}s</Text>
      </Card>

      <SectionLabel>Fight with</SectionLabel>
      <View style={s.pills}>
        {EXERCISE_ORDER.map((id) => (
          <Chip key={id} label={EXERCISES[id].name} icon={EXERCISE_ICON[id]} on={exercise === id} onPress={() => setExercise(id)} />
        ))}
      </View>
      <Text style={F.small}>{hit ? `${hit} damage per rep` : "Damage every second you hold good form"}</Text>
      <Button label={`Fight ${foe.name}`} icon="sword" onPress={() => router.push({ pathname: "/fight/[exercise]", params: { exercise } })} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 40, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  pillOn: { backgroundColor: C.accent, borderColor: C.accent },
  pillText: { color: C.text, fontWeight: "800" },
});
