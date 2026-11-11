import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { creatureFor, holdDamagePerSecond, repDamage } from "@/domain/adventure";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { levelFor } from "@/domain/progress";
import { SaveResult, useProfile } from "@/store/profile";
import { Bar, Button, Card } from "@/ui/bits";
import { C, F, R } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

/** Adventure fight: reps deal damage to the stage's creature against the clock. */
export default function Fight() {
  useKeepAwake();
  const { exercise } = useLocalSearchParams<{ exercise: ExerciseId }>();
  const id = (EXERCISES[exercise] ? exercise : "pushup") as ExerciseId;
  const ex = EXERCISES[id];
  const { profile, saveSession, setSettings } = useProfile();
  const facing = profile.settings.facing;
  const [foe] = useState(() => creatureFor(profile.adventureStage));
  const level = levelFor(profile.xp).level;
  const [hp, setHp] = useState(foe.hp);
  const hpRef = useRef(foe.hp);
  const [lastHit, setLastHit] = useState<{ dmg: number; crit: boolean; key: number } | null>(null);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [end, setEnd] = useState<{ won: boolean; save: SaveResult } | null>(null);

  const damage = (dmg: number, crit: boolean) => {
    if (started === null) setStarted(Date.now()); // the first rep starts the clock
    hpRef.current = Math.max(0, hpRef.current - dmg);
    setHp(hpRef.current);
    setLastHit({ dmg, crit, key: Date.now() });
  };

  const tracker = useTracker(id, {
    voice: profile.settings.voice,
    enabled: !end,
    onRep: (e) => {
      if (e.type === "rep") damage(repDamage(id, level, e.quality === "perfect"), e.quality === "perfect");
    },
    onHoldSecond: () => damage(holdDamagePerSecond(level), false),
  });

  const elapsed = started === null ? 0 : (now - started) / 1000;
  const left = Math.max(0, foe.timeLimit - elapsed);

  useEffect(() => {
    if (end || started === null) return;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [end, started]);

  useEffect(() => {
    if (end) return;
    const won = hp <= 0;
    const lost = started !== null && left <= 0;
    if (!won && !lost) return;
    const v = tracker.view;
    const save = saveSession(
      { at: new Date().toISOString(), exercise: id, amount: v.amount, perfect: v.perfect, rejected: v.rejected, mode: "adventure" },
      undefined,
      { adventureCleared: won },
    );
    setEnd({ won, save });
  }, [hp, left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (end) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 96, opacity: end.won ? 0.35 : 1 }}>{foe.emoji}</Text>
        <Text style={[F.display, { color: end.won ? C.good : C.bad }]}>{end.won ? "DEFEATED" : "IT ESCAPED"}</Text>
        <Text style={F.body}>{end.won ? `${foe.name} is down. Stage ${foe.stage + 1} unlocked.` : `${foe.name} had ${hp} HP left. Try again.`}</Text>
        <Card style={{ alignSelf: "stretch", gap: 6 }}>
          <Text style={F.body}>+{end.save.xpGained} XP</Text>
          {end.save.questsDone.map((q) => <Text key={q} style={[F.body, { color: C.good }]}>Quest done: {q}</Text>)}
          {end.save.newAchievements.map((a) => <Text key={a} style={[F.body, { color: C.accent }]}>Achievement: {a}</Text>)}
        </Card>
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label={end.won ? "Next creature" : "Retry"} icon="sword" onPress={() => router.replace({ pathname: "/fight/[exercise]", params: { exercise: id } })} />
          <Button label="Done" kind="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <WorkoutStage
      tracker={tracker}
      title={started === null ? ex.name : `${Math.ceil(left)}s`}
      facing={facing}
      onFlip={() => setSettings({ facing: facing === "front" ? "back" : "front" })}
      onClose={() => router.back()}
      top={
        <View style={s.foe}>
          <View style={s.foeRow}>
            <Text style={{ fontSize: 34 }}>{foe.emoji}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={s.foeRow}>
                <Text style={[F.body, { fontWeight: "900", flex: 1 }]}>{foe.name}</Text>
                <Text style={[F.small, F.number]}>{hp}/{foe.hp}</Text>
              </View>
              <Bar value={hp / foe.hp} color={C.bad} height={10} />
            </View>
          </View>
          {lastHit && (
            <Text key={lastHit.key} style={[s.hit, lastHit.crit && { color: C.accent }]}>
              -{lastHit.dmg}{lastHit.crit ? " CRIT" : ""}
            </Text>
          )}
          {started === null && <Text style={[F.small, { color: C.text }]}>Clock starts on your first rep.</Text>}
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  foe: { backgroundColor: "#000b", borderRadius: R.md, padding: 12, gap: 6 },
  foeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hit: { color: C.bad, fontWeight: "900", fontSize: 22, alignSelf: "center" },
});
