import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXERCISES, RepExercise } from "@/domain/exercises";
import { Body, placementRating } from "@/domain/placement";
import { rankFor } from "@/domain/rating";
import { useProfile } from "@/store/profile";
import { Button } from "@/ui/bits";
import { Confetti, RankReveal } from "@/ui/celebrate";
import { haptic } from "@/ui/haptics";
import { C, F } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

const TEST_SECONDS = 60;
const EX = EXERCISES.pushup as RepExercise;

/** 60-second push-up test that sets the starting rank, then the rank reveal. */
export default function Placement() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ body?: string; name?: string; reveal?: string }>();
  const { profile, completeOnboarding, setSettings } = useProfile();
  const body = useMemo<Body | null>(() => {
    try {
      return params.body ? (JSON.parse(params.body) as Body) : null;
    } catch {
      return null;
    }
  }, [params.body]);
  const [phase, setPhase] = useState<"ready" | "countdown" | "live" | "reveal">(params.reveal ? "reveal" : "ready");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const readySince = useRef<number | null>(null);
  const tracker = useTracker("pushup", { voice: profile.settings.voice, enabled: phase === "live" });
  const facing = profile.settings.facing;

  const pose = tracker.pose;
  const inPosition = useMemo(() => {
    if (!pose) return false;
    const m = EX.measure(pose);
    return !!m && m.value >= EX.extendedAt;
  }, [pose]);

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

  useEffect(() => {
    if (phase !== "countdown") return;
    haptic.tick();
    if (profile.settings.voice) Speech.speak(count ? String(count) : "Go", { rate: 1.2 });
    if (count === 0) {
      startedAt.current = Date.now();
      tracker.reset();
      setPhase("live");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "live") return;
    const i = setInterval(() => {
      const e = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.min(TEST_SECONDS, e));
      if (e >= TEST_SECONDS) finish(tracker.view.amount);
    }, 100);
    return () => clearInterval(i);
  }, [phase, tracker.view.amount]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (reps: number) => {
    const b = body ?? profile.body;
    if (b) completeOnboarding(b, placementRating(b, reps), reps, params.name);
    haptic.win();
    setPhase("reveal");
  };

  if (phase === "reveal") {
    const rank = rankFor(profile.rating);
    return (
      <View style={[s.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <Confetti />
        <RankReveal rank={rank} />
        <Text style={[F.h2, F.number]}>{profile.rating} rating</Text>
        <Text style={[F.small, { textAlign: "center" }]}>
          {profile.placementReps != null ? `You did ${profile.placementReps} push-ups. ` : "Estimated from your answers. "}
          Win duels to climb. Diamond starts at 1700.
        </Text>
        <View style={{ alignSelf: "stretch", gap: 10, marginTop: 10 }}>
          <Button label="Start training" icon="arrow-right" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  return (
    <WorkoutStage
      tracker={tracker}
      title={phase === "live" ? `${Math.ceil(TEST_SECONDS - elapsed)}s` : "Placement test"}
      facing={facing}
      onFlip={() => setSettings({ facing: facing === "front" ? "back" : "front" })}
      onClose={() => router.back()}
      top={phase === "ready" ? <Text style={s.hint}>{EX.setup} Get into the top of a push-up to start.</Text> : undefined}
      big={
        phase === "countdown" ? (
          <Animated.Text key={count} entering={ZoomIn.springify().damping(8)} exiting={ZoomOut} style={s.count}>{count || "GO"}</Animated.Text>
        ) : phase === "ready" ? (
          <Text style={s.ready}>{inPosition ? "Hold it…" : "Get into the top position"}</Text>
        ) : undefined
      }
      bottom={phase === "live" ? <Button label="Stop test" kind="ghost" small onPress={() => finish(tracker.view.amount)} /> : undefined}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  hint: { color: C.text, backgroundColor: "#000b", padding: 12, borderRadius: 12, fontSize: 14, fontWeight: "600", textAlign: "center" },
  count: { fontSize: 150, fontWeight: "900", fontStyle: "italic", color: C.accent },
  ready: { fontSize: 26, fontWeight: "900", color: C.text, textAlign: "center", paddingVertical: 30 },
});
