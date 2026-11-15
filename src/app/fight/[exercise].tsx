import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALL_LEVELS, levelById, Round, roundLabel, starsFor, unitsOf } from "@/domain/campaign";
import { EXERCISES } from "@/domain/exercises";
import { SaveResult, useProfile } from "@/store/profile";
import { Arena } from "@/ui/Arena";
import { Button, Card } from "@/ui/bits";
import { Confetti, VsIntro } from "@/ui/celebrate";
import { haptic } from "@/ui/haptics";
import { C, F } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

type Phase = "intro" | "fight" | "between" | "won" | "lost";

/** Adventure fight: finish every round of the level before the clock runs out. */
export default function Fight() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ level?: string }>();
  const level = levelById(params.level ?? "") ?? ALL_LEVELS[0];
  const { profile, saveSession } = useProfile();
  const total = unitsOf(level);
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(0); // units done in current round
  const [doneTotal, setDoneTotal] = useState(0);
  const [hits, setHits] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [save, setSave] = useState<SaveResult | null>(null);
  const [stars, setStars] = useState(0);
  const perfectRef = useRef(0);
  const dmgPerUnit = level.hp / total;
  const hp = level.hp - doneTotal * dmgPerUnit;
  const elapsed = startedAt ? (now - startedAt) / 1000 : 0;
  const left = Math.max(0, level.timeLimit - elapsed);

  useEffect(() => {
    if (phase !== "intro") return;
    haptic.tick();
    // The clock starts on your first rep, so camera setup never eats your time.
    const t = setTimeout(() => setPhase("fight"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fight" && phase !== "between") return;
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, [phase]);

  // Out of time
  useEffect(() => {
    if ((phase === "fight" || phase === "between") && startedAt && left <= 0) end(false);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = (won: boolean) => {
    const st = won ? starsFor(left, level.timeLimit) : 0;
    setStars(st);
    const r = saveSession(
      { at: new Date().toISOString(), exercise: level.rounds[0].exercise, amount: won ? total : doneTotal, perfect: perfectRef.current, rejected: 0, mode: "adventure", outcome: won ? "win" : "loss" },
      undefined,
      won ? { level: { id: level.id, stars: st } } : undefined,
    );
    setSave(r);
    won ? haptic.win() : haptic.lose();
    if (profile.settings.voice) Speech.speak(won ? "Victory" : "It escaped");
    setPhase(won ? "won" : "lost");
  };

  const onUnit = (perfect: boolean) => {
    if (phase !== "fight") return;
    if (perfect) perfectRef.current++;
    if (startedAt === null) setStartedAt(Date.now());
    setHits((h) => h + 1);
    setDoneTotal((d) => d + 1);
    setDone((d) => {
      const n = d + 1;
      if (n >= level.rounds[round].amount) {
        if (round + 1 >= level.rounds.length) setTimeout(() => end(true), 300);
        else {
          setPhase("between");
          setTimeout(() => {
            setRound((r) => r + 1);
            setDone(0);
            setPhase("fight");
          }, 3000);
        }
      }
      return n;
    });
  };

  if (phase === "intro") {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={[F.label, level.boss && { color: C.bad }]}>{level.boss ? "Boss battle" : `World ${level.world}-${level.index}`}</Text>
        <VsIntro me={profile.name} them={`${level.emoji} ${level.name}`} sub={level.rounds.map(roundLabel).join(" → ") + ` in ${level.timeLimit}s`} />
      </View>
    );
  }

  if (phase === "won" || phase === "lost") {
    const won = phase === "won";
    return (
      <View style={[s.center, { gap: 14, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {won && <Confetti />}
        <Animated.Text entering={ZoomIn.springify().damping(7)} style={{ fontSize: 96, opacity: won ? 0.4 : 1 }}>{level.emoji}</Animated.Text>
        <Animated.Text entering={ZoomIn.delay(200).springify()} style={[F.display, { color: won ? C.good : C.bad }]}>{won ? "DEFEATED" : "IT ESCAPED"}</Animated.Text>
        {won && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3].map((k) => (
              <Animated.View key={k} entering={ZoomIn.delay(400 + k * 200).springify().damping(6)}>
                <MaterialCommunityIcons name={k <= stars ? "star" : "star-outline"} size={48} color={k <= stars ? C.warn : C.faint} />
              </Animated.View>
            ))}
          </View>
        )}
        <Text style={[F.body, { textAlign: "center" }]}>
          {won ? `${level.name} is down with ${Math.ceil(left)}s to spare.` : `${level.name} had ${Math.ceil(hp)} HP left. Be faster next time.`}
        </Text>
        {save && (
          <Card style={{ alignSelf: "stretch", gap: 6 }}>
            <Text style={F.body}>+{save.xpGained} XP</Text>
            {save.questsDone.map((q) => <Text key={q} style={[F.body, { color: C.good }]}>Quest done: {q}</Text>)}
            {save.newAchievements.map((a) => <Text key={a} style={[F.body, { color: C.accent }]}>Achievement: {a}</Text>)}
          </Card>
        )}
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label={won ? "Back to map" : "Try again"} icon={won ? "map" : "sword"} onPress={() => (won ? router.back() : router.replace({ pathname: "/fight/[exercise]", params: { exercise: level.rounds[0].exercise, level: level.id } }))} />
          {!won && <Button label="Back to map" kind="ghost" onPress={() => router.back()} />}
        </View>
      </View>
    );
  }

  const r = level.rounds[round];
  return (
    <RoundStage
      key={round}
      round={r}
      active={phase === "fight"}
      title={startedAt ? `${Math.ceil(left)}s` : "Ready"}
      onUnit={onUnit}
      top={(pose) => (
        <Arena
          pose={pose}
          emoji={level.emoji}
          name={level.name}
          hp={hp}
          maxHp={level.hp}
          hits={hits}
          lastHit={Math.round(dmgPerUnit)}
          round={round}
          rounds={level.rounds.length}
          task={r.exercise === "plank" ? `${done}/${r.amount}s plank` : `${done}/${r.amount} ${EXERCISES[r.exercise].name.toLowerCase()}`}
        />
      )}
      between={phase === "between" ? level.rounds[round + 1] : undefined}
    />
  );
}

/** One round: its own tracker, because each round can be a different exercise. */
function RoundStage({
  round, active, title, onUnit, top, between,
}: {
  round: Round; active: boolean; title: string; onUnit(perfect: boolean): void;
  top(pose: ReturnType<typeof useTracker>["pose"]): React.ReactNode; between?: Round;
}) {
  const { profile, setSettings } = useProfile();
  const facing = profile.settings.facing;
  const tracker = useTracker(round.exercise, {
    voice: profile.settings.voice,
    enabled: active,
    onRep: (e) => e.type === "rep" && onUnit(e.quality === "perfect"),
    onHoldSecond: () => onUnit(false),
  });
  return (
    <WorkoutStage
      tracker={tracker}
      title={title}
      facing={facing}
      onFlip={() => setSettings({ facing: facing === "front" ? "back" : "front" })}
      onClose={() => router.back()}
      top={top(tracker.pose)}
      big={
        between ? (
          <Animated.View entering={FadeIn} style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={F.label}>Next round</Text>
            <Text style={[F.display, { textAlign: "center" }]}>{roundLabel(between)}</Text>
            <Text style={F.small}>Get into position…</Text>
          </Animated.View>
        ) : undefined
      }
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
});
