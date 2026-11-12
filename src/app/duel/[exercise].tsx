import { useKeepAwake } from "expo-keep-awake";
import * as Speech from "expo-speech";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { botRepsAt, DUEL_SECONDS, matchBot } from "@/domain/bots";
import { EXERCISES, ExerciseId, RepExercise } from "@/domain/exercises";
import { outcomeOf, rankFor } from "@/domain/rating";
import { SaveResult, useProfile } from "@/store/profile";
import { Button, Card, RankBadge } from "@/ui/bits";
import { C, F, R } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

type Phase = "matching" | "ready" | "countdown" | "live" | "done";

/** One ranked 60-second duel against a fair bot. */
export default function DuelRun() {
  useKeepAwake();
  const { exercise } = useLocalSearchParams<{ exercise: ExerciseId }>();
  const id = (EXERCISES[exercise]?.kind === "reps" ? exercise : "pushup") as ExerciseId;
  const ex = EXERCISES[id] as RepExercise;
  const { profile, saveSession, setSettings } = useProfile();
  const facing = profile.settings.facing;
  const bot = useMemo(() => matchBot(profile.rating, Date.now() & 0x7fffffff, id), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [phase, setPhase] = useState<Phase>("matching");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ save: SaveResult; mine: number; theirs: number } | null>(null);
  const startedAt = useRef(0);
  const readySince = useRef<number | null>(null);
  const tracker = useTracker(id, { voice: profile.settings.voice, enabled: phase === "live" });

  // Matching -> ready
  useEffect(() => {
    if (phase !== "matching") return;
    const t = setTimeout(() => setPhase("ready"), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // Ready -> countdown once you've held the start position for a second.
  const pose = tracker.pose;
  const inPosition = useMemo(() => {
    if (!pose) return false;
    const m = ex.measure(pose);
    return !!m && m.value >= ex.extendedAt && m.issues.length === 0;
  }, [pose, ex]);
  useEffect(() => {
    if (phase !== "ready") return;
    if (!inPosition) {
      readySince.current = null;
      return;
    }
    const now = Date.now();
    if (readySince.current === null) readySince.current = now;
    else if (now - readySince.current > 1000) setPhase("countdown");
  }, [phase, inPosition, pose]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (profile.settings.voice) Speech.speak(String(count), { rate: 1.2 });
    if (count === 0) {
      startedAt.current = Date.now();
      tracker.reset();
      setPhase("live");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock
  useEffect(() => {
    if (phase !== "live") return;
    const i = setInterval(() => {
      const e = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.min(DUEL_SECONDS, e));
      if (e >= DUEL_SECONDS) setPhase("done");
    }, 100);
    return () => clearInterval(i);
  }, [phase]);

  // Finish
  useEffect(() => {
    if (phase !== "done" || result) return;
    const mine = tracker.view.amount;
    const theirs = bot.target;
    const outcome = outcomeOf(mine, theirs);
    const save = saveSession(
      { at: new Date().toISOString(), exercise: id, amount: mine, perfect: tracker.view.perfect, rejected: tracker.view.rejected, mode: "duel", outcome },
      { opponentRating: bot.rating },
    );
    setResult({ save, mine, theirs });
    if (profile.settings.voice) Speech.speak(outcome === "win" ? "You win" : outcome === "loss" ? "You lose" : "Draw");
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const botRank = rankFor(bot.rating);

  if (phase === "matching") {
    return (
      <View style={s.center}>
        <Text style={F.label}>Ranked · {ex.name}</Text>
        <Text style={F.h1}>Finding opponent…</Text>
        <Text style={F.small}>Near {profile.rating}</Text>
      </View>
    );
  }

  if (phase === "done" && result) {
    const outcome = outcomeOf(result.mine, result.theirs);
    const d = result.save.ratingDelta ?? 0;
    return (
      <View style={[s.center, { gap: 18 }]}>
        <Text style={[F.display, { color: outcome === "win" ? C.good : outcome === "loss" ? C.bad : C.text }]}>
          {outcome === "win" ? "VICTORY" : outcome === "loss" ? "DEFEAT" : "DRAW"}
        </Text>
        <Card style={s.score}>
          <View style={s.side}>
            <Text style={F.small}>You</Text>
            <Text style={[F.display, F.number]}>{result.mine}</Text>
          </View>
          <Text style={[F.h2, { color: C.faint }]}>vs</Text>
          <View style={s.side}>
            <Text style={F.small}>{bot.name}</Text>
            <Text style={[F.display, F.number]}>{result.theirs}</Text>
          </View>
        </Card>
        <Text style={[F.h2, F.number, { color: d >= 0 ? C.good : C.bad }]}>
          {d >= 0 ? "+" : ""}{d} → {profile.rating}
        </Text>
        {result.save.rankUp && <Text style={[F.h2, { color: C.accent }]}>Promoted to {rankFor(profile.rating).name}!</Text>}
        <Text style={F.small}>+{result.save.xpGained} XP{tracker.view.rejected ? ` · ${tracker.view.rejected} ${tracker.view.rejected === 1 ? "rep" : "reps"} didn't count` : ""}</Text>
        {result.save.questsDone.map((q) => <Text key={q} style={[F.body, { color: C.good }]}>Quest done: {q}</Text>)}
        {result.save.newAchievements.map((a) => <Text key={a} style={[F.body, { color: C.accent }]}>Achievement: {a}</Text>)}
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label="Rematch" icon="sword-cross" onPress={() => router.replace({ pathname: "/duel/[exercise]", params: { exercise: id } })} />
          <Button label="Done" kind="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const left = Math.ceil(DUEL_SECONDS - elapsed);
  const botNow = phase === "live" ? botRepsAt(bot, elapsed) : 0;

  return (
    <WorkoutStage
      tracker={tracker}
      title={phase === "live" ? `${left}s` : ex.name}
      facing={facing}
      onFlip={() => setSettings({ facing: facing === "front" ? "back" : "front" })}
      onClose={() => router.back()}
      top={
        <View style={s.board}>
          <View style={s.boardSide}>
            <Text style={s.boardName}>You</Text>
            <Text style={[s.boardNum, F.number]}>{tracker.view.amount}</Text>
          </View>
          <View style={[s.boardSide, { alignItems: "flex-end" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <RankBadge rank={botRank} size={22} />
              <Text style={s.boardName}>{bot.name} · {bot.rating}</Text>
            </View>
            <Text style={[s.boardNum, F.number, { color: C.muted }]}>{botNow}</Text>
          </View>
        </View>
      }
      big={
        phase === "countdown" ? <Text style={[s.count, F.number]}>{count || "GO"}</Text>
        : phase === "ready" ? <Text style={s.readyText}>{inPosition ? "Hold it…" : `Get into the top position`}</Text>
        : undefined
      }
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  score: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", alignSelf: "stretch" },
  side: { alignItems: "center" },
  board: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#000b", borderRadius: R.md, padding: 12 },
  boardSide: { gap: 2 },
  boardName: { color: C.muted, fontWeight: "700", fontSize: 12 },
  boardNum: { color: C.text, fontWeight: "900", fontSize: 32 },
  count: { fontSize: 140, fontWeight: "900", color: C.accent },
  readyText: { fontSize: 26, fontWeight: "900", color: C.text, textAlign: "center", textShadowColor: "#000", textShadowRadius: 8, paddingVertical: 30 },
});
