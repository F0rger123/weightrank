import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { SaveResult, useProfile } from "@/store/profile";
import { Button, Card } from "@/ui/bits";
import { C, F } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

/** Free training: count reps (or plank seconds) for as long as you like. */
export default function TrainExercise() {
  useKeepAwake();
  const { exercise } = useLocalSearchParams<{ exercise: ExerciseId }>();
  const id = (EXERCISES[exercise] ? exercise : "pushup") as ExerciseId;
  const { profile, saveSession, setSettings } = useProfile();
  const facing = profile.settings.facing;
  const [result, setResult] = useState<{ save: SaveResult; amount: number } | null>(null);
  const started = useRef(new Date().toISOString());
  const tracker = useTracker(id, { voice: profile.settings.voice, enabled: !result });
  const ex = EXERCISES[id];

  const finish = () => {
    const v = tracker.view;
    if (v.amount === 0) return router.back();
    const save = saveSession({ at: started.current, exercise: id, amount: v.amount, perfect: v.perfect, rejected: v.rejected, mode: "train" });
    setResult({ save, amount: v.amount });
  };

  if (result) {
    return (
      <View style={s.result}>
        <Text style={F.label}>{ex.name}</Text>
        <Text style={[F.display, { fontSize: 96 }]}>
          {result.amount}
          {ex.kind === "hold" && <Text style={{ color: C.muted, fontSize: 40 }}>s</Text>}
        </Text>
        <Card style={{ alignSelf: "stretch", gap: 8 }}>
          <Text style={F.body}>+{result.save.xpGained} XP</Text>
          {result.save.questsDone.map((q) => <Text key={q} style={[F.body, { color: C.good }]}>Quest done: {q}</Text>)}
          {result.save.newAchievements.map((a) => <Text key={a} style={[F.body, { color: C.accent }]}>Achievement: {a}</Text>)}
        </Card>
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label="Go again" icon="restart" onPress={() => { tracker.reset(); started.current = new Date().toISOString(); setResult(null); }} />
          <Button label="Done" kind="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <WorkoutStage
      tracker={tracker}
      title={ex.name}
      facing={facing}
      onFlip={() => setSettings({ facing: facing === "front" ? "back" : "front" })}
      onClose={() => router.back()}
      top={tracker.view.amount === 0 && !tracker.view.tracking ? <Text style={s.hint}>{ex.setup}</Text> : undefined}
      bottom={<Button label="Finish" icon="flag-checkered" onPress={finish} />}
    />
  );
}

const s = StyleSheet.create({
  result: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 18 },
  hint: { color: C.text, backgroundColor: "#000b", padding: 12, borderRadius: 12, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
