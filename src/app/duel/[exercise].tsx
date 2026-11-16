import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import * as Speech from "expo-speech";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { botRepsAt, DUEL_SECONDS, matchBot } from "@/domain/bots";
import { challengeLink, decodeLinkData, encodeCode, ghostRepTimes, roomLink } from "@/domain/challenge";
import { EXERCISES, ExerciseId, RepExercise } from "@/domain/exercises";
import { outcomeOf, rankFor } from "@/domain/rating";
import { WEB_URL } from "@/lib/config";
import { findMatch, Match, onlineConfigured } from "@/lib/online";
import { SaveResult, useProfile } from "@/store/profile";
import { Button, Card, RankBadge } from "@/ui/bits";
import { Confetti, RankReveal, VsIntro } from "@/ui/celebrate";
import { haptic } from "@/ui/haptics";
import { Appear, Pop, Pulse } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";
import { useTracker } from "@/ui/useTracker";
import { WorkoutStage } from "@/ui/WorkoutStage";

type Phase = "matching" | "intro" | "ready" | "countdown" | "live" | "done";
type Mode = "ranked" | "challenge" | "room";

type Opponent = {
  kind: "bot" | "ghost" | "human";
  name: string;
  rating: number;
  /** Final score when known up front (bot, ghost). */
  target?: number;
  repTimes?: number[];
};

/** How long ranked waits for a real player before offering a bot. */
const HUMAN_WAIT_S = 10;

/** One 60-second duel: ranked (real player or fair bot), a friend's challenge, or a live friend room. */
export default function DuelRun() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ exercise: ExerciseId; mode?: Mode; d?: string; room?: string }>();
  const mode: Mode = params.mode === "challenge" || params.mode === "room" ? params.mode : "ranked";
  const challenge = mode === "challenge" && params.d ? decodeLinkData(params.d) : null;
  const id = (challenge?.exercise ?? (EXERCISES[params.exercise]?.kind === "reps" ? params.exercise : "pushup")) as ExerciseId;
  const ex = EXERCISES[id] as RepExercise;
  const { profile, saveSession, setSettings } = useProfile();
  const facing = profile.settings.facing;

  const [phase, setPhase] = useState<Phase>("matching");
  const [opp, setOpp] = useState<Opponent | null>(null);
  const [waited, setWaited] = useState(0);
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [liveOppReps, setLiveOppReps] = useState(0);
  const [oppLeft, setOppLeft] = useState(false);
  const [result, setResult] = useState<{ save: SaveResult; mine: number; theirs: number } | null>(null);
  const match = useRef<Match | null>(null);
  const afterIntro = useRef<Phase>("ready");
  const startedAt = useRef(0);
  const readySince = useRef<number | null>(null);
  const tracker = useTracker(id, { voice: profile.settings.voice, enabled: phase === "live" });
  const ranked = mode === "ranked";

  const useBot = () => {
    const b = matchBot(profile.rating, Date.now() & 0x7fffffff, id);
    setOpp({ kind: "bot", name: b.name, rating: b.rating, target: b.target, repTimes: b.repTimes });
    afterIntro.current = "ready";
    setPhase("intro");
  };

  // ---- Matching ----
  useEffect(() => {
    if (phase !== "matching") return;
    if (mode === "challenge") {
      if (!challenge) return;
      setOpp({ kind: "ghost", name: challenge.name, rating: 0, target: challenge.reps, repTimes: ghostRepTimes(challenge.reps) });
      afterIntro.current = "ready";
      setPhase("intro");
      return;
    }
    if (!onlineConfigured) {
      if (mode === "ranked") {
        const t = setTimeout(useBot, 1600);
        return () => clearTimeout(t);
      }
      return; // room without online: screen explains
    }
    const ac = new AbortController();
    findMatch({
      me: { id: profile.playerId, name: profile.name, rating: profile.rating, t: Date.now() },
      exercise: id,
      room: mode === "room" ? params.room : undefined,
      signal: ac.signal,
    }).then((m) => {
      if (!m) return;
      match.current = m;
      m.onReps(setLiveOppReps);
      m.onLeft(() => setOppLeft(true));
      setOpp({ kind: "human", name: m.opponent.name, rating: m.opponent.rating });
      haptic.win();
      afterIntro.current = "countdown";
      setPhase("intro");
    });
    const tick = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => {
      ac.abort();
      clearInterval(tick);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ranked: no one online after a while -> a fair bot.
  useEffect(() => {
    if (phase === "matching" && mode === "ranked" && onlineConfigured && waited >= HUMAN_WAIT_S) useBot();
  }, [waited]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => match.current?.close(), []);

  // ---- VS intro ----
  useEffect(() => {
    if (phase !== "intro") return;
    haptic.tick();
    const t = setTimeout(() => setPhase(afterIntro.current), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // ---- Ready: hold the top position for a second (bot / ghost rounds) ----
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

  // ---- Countdown (synced to the shared start time for live matches) ----
  useEffect(() => {
    if (phase !== "countdown") return;
    const target = match.current ? match.current.startAt : null;
    if (target) {
      const i = setInterval(() => {
        const left = Math.ceil((target - Date.now()) / 1000);
        setCount((c) => {
          const n = Math.max(0, Math.min(5, left));
          if (n !== c && n <= 3) {
            haptic.tick();
            if (profile.settings.voice && n > 0) Speech.speak(String(n), { rate: 1.2 });
          }
          return n;
        });
        if (Date.now() >= target) {
          clearInterval(i);
          go(target);
        }
      }, 100);
      return () => clearInterval(i);
    }
    haptic.tick();
    if (profile.settings.voice && count > 0) Speech.speak(String(count), { rate: 1.2 });
    if (count === 0) {
      go(Date.now());
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (at: number) => {
    startedAt.current = at;
    tracker.reset();
    if (profile.settings.voice) Speech.speak("Go", { rate: 1.2 });
    setPhase("live");
  };

  // ---- Clock + live score sync ----
  useEffect(() => {
    if (phase !== "live") return;
    const i = setInterval(() => {
      const e = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.min(DUEL_SECONDS, e));
      if (e >= DUEL_SECONDS) setPhase("done");
    }, 100);
    return () => clearInterval(i);
  }, [phase]);
  useEffect(() => {
    if (phase === "live") match.current?.sendReps(tracker.view.amount);
  }, [tracker.view.amount, phase]);

  const oppNow =
    opp?.kind === "human" ? liveOppReps
    : phase === "live" && opp?.repTimes ? botRepsAt({ name: "", rating: 0, target: 0, repTimes: opp.repTimes }, elapsed)
    : 0;

  // ---- Finish ----
  useEffect(() => {
    if (phase !== "done" || result || !opp) return;
    const mine = tracker.view.amount;
    match.current?.sendReps(mine);
    const theirs = opp.kind === "human" ? liveOppReps : opp.target ?? 0;
    const outcome = outcomeOf(mine, theirs);
    const save = saveSession(
      { at: new Date().toISOString(), exercise: id, amount: mine, perfect: tracker.view.perfect, rejected: tracker.view.rejected, mode: "duel", outcome },
      ranked ? { opponentRating: opp.rating } : undefined,
    );
    setResult({ save, mine, theirs });
    outcome === "win" ? haptic.win() : outcome === "loss" ? haptic.lose() : haptic.tap();
    if (profile.settings.voice) Speech.speak(outcome === "win" ? "You win" : outcome === "loss" ? "You lose" : "Draw");
    setTimeout(() => match.current?.close(), 1500);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareScore = (mine: number) => {
    const c = { exercise: id, reps: mine, name: profile.name };
    const link = challengeLink(c, WEB_URL);
    Share.share({
      message: `I did ${mine} ${ex.name.toLowerCase()} in 60 seconds on WeightRank. Beat that 💪\n${link}\nOr enter code ${encodeCode(c)} in WeightRank → Challenge a friend.`,
    }).catch(() => {});
  };

  // ---------- Screens ----------

  if (phase === "matching") {
    const room = mode === "room" ? params.room : null;
    return (
      <View style={[s.center, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <Text style={F.label}>{room ? "Friend duel" : mode === "challenge" ? "Challenge" : "Ranked"} · {ex.name}</Text>
        <View style={s.radar}>
          <Pulse style={[s.ring, { width: 220, height: 220 }]} min={0.7} ms={1100}><View /></Pulse>
          <Pulse style={[s.ring, { width: 150, height: 150 }]} min={0.8} ms={900}><View /></Pulse>
          <RankBadge rank={rankFor(profile.rating)} size={72} />
        </View>
        {mode === "challenge" && !challenge ? (
          <Text style={F.h2}>That challenge link is broken.</Text>
        ) : room ? (
          <>
            <Text style={[F.h1, { textAlign: "center" }]}>{onlineConfigured ? "Waiting for your friend…" : "Online play isn't switched on yet"}</Text>
            <Text style={[F.small, { textAlign: "center" }]}>
              {onlineConfigured ? `Room ${room}. You'll both count down together when they join.` : "Friend rooms need the online server (see setup). Send a challenge link instead: it works offline."}
            </Text>
            {onlineConfigured && (
              <Button label="Send invite link" icon="share-variant" kind="ghost" onPress={() => Share.share({ message: `Duel me live on WeightRank (${ex.name}, 60 s): ${roomLink(room, WEB_URL)}` })} />
            )}
          </>
        ) : (
          <>
            <Text style={F.h1}>{onlineConfigured ? "Finding a player…" : "Finding opponent…"}</Text>
            <Text style={[F.small, F.number]}>
              {onlineConfigured ? `Searching online near ${profile.rating} · ${waited}s` : `Near ${profile.rating}`}
            </Text>
            {onlineConfigured && waited >= 4 && <Button label="Play a bot now" kind="ghost" small onPress={useBot} />}
          </>
        )}
        <Button label="Cancel" kind="ghost" small onPress={() => router.back()} />
      </View>
    );
  }

  if (phase === "intro" && opp) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={F.label}>{ranked ? "Ranked" : mode === "room" ? "Friend duel" : "Challenge"} · {ex.name} · 60 s</Text>
        <VsIntro
          me={profile.name}
          them={opp.name}
          sub={opp.kind === "human" ? `Live opponent · ${opp.rating}` : opp.kind === "bot" ? `Bot · ${opp.rating}` : `Beat ${opp.target} reps`}
        />
      </View>
    );
  }

  if (phase === "done" && result && opp) {
    const outcome = outcomeOf(result.mine, result.theirs);
    const d = result.save.ratingDelta ?? 0;
    const col = outcome === "win" ? C.good : outcome === "loss" ? C.bad : C.text;
    return (
      <View style={[s.center, { gap: 16, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {outcome === "win" && <Confetti count={80} />}
        <Animated.Text entering={ZoomIn.springify().damping(10)} style={[F.display, { fontSize: 58, color: col }]}>
          {outcome === "win" ? "VICTORY" : outcome === "loss" ? "DEFEAT" : "DRAW"}
        </Animated.Text>
        <Appear i={1} style={{ alignSelf: "stretch" }}>
          <Card style={s.score} glow={col}>
            <View style={s.side}>
              <Text style={F.small}>You</Text>
              <Text style={[F.display, F.number]}>{result.mine}</Text>
            </View>
            <Text style={[F.h2, { color: C.faint }]}>vs</Text>
            <View style={s.side}>
              <Text style={F.small} numberOfLines={1}>{opp.name}{opp.kind === "bot" ? " (bot)" : ""}</Text>
              <Text style={[F.display, F.number]}>{result.theirs}</Text>
            </View>
          </Card>
        </Appear>
        {ranked && (
          <Appear i={2}>
            <Text style={[F.h1, F.number, { color: d >= 0 ? C.good : C.bad }]}>
              {d >= 0 ? "+" : ""}{d} <Text style={{ color: C.muted, fontSize: 20 }}>→ {profile.rating}</Text>
            </Text>
          </Appear>
        )}
        {result.save.rankUp && <RankReveal rank={rankFor(profile.rating)} label="Promoted!" />}
        <Appear i={3}>
          <Text style={F.small}>
            +{result.save.xpGained} XP{tracker.view.rejected ? ` · ${tracker.view.rejected} ${tracker.view.rejected === 1 ? "rep" : "reps"} didn't count` : ""}
            {oppLeft ? " · opponent left early" : ""}
          </Text>
        </Appear>
        {result.save.questsDone.map((q) => <Text key={q} style={[F.body, { color: C.good }]}>Quest done: {q}</Text>)}
        {result.save.newAchievements.map((a) => <Text key={a} style={[F.body, { color: C.accent }]}>Achievement: {a}</Text>)}
        <Appear i={4} style={{ alignSelf: "stretch", gap: 10 }}>
          <Button label="Challenge a friend with this score" icon="share-variant" kind="ghost" onPress={() => shareScore(result.mine)} />
          {mode !== "room" && (
            <Button label={mode === "challenge" ? "Try again" : "Rematch"} icon="sword-cross" onPress={() => router.replace({ pathname: "/duel/[exercise]", params: { exercise: id, mode, d: params.d ?? "" } })} />
          )}
          <Button label="Done" kind="ghost" onPress={() => router.back()} />
        </Appear>
      </View>
    );
  }

  const left = Math.ceil(DUEL_SECONDS - elapsed);
  const leading = tracker.view.amount > oppNow;

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
            <Pop trigger={tracker.view.amount}>
              <Text style={[s.boardNum, F.number, leading && { color: C.accent }]}>{tracker.view.amount}</Text>
            </Pop>
          </View>
          {phase === "live" && <View style={s.timer}><View style={[s.timerFill, { width: `${(elapsed / DUEL_SECONDS) * 100}%` }]} /></View>}
          <View style={[s.boardSide, { alignItems: "flex-end" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {opp?.kind === "human" && <MaterialCommunityIcons name="access-point" size={14} color={C.good} />}
              <Text style={s.boardName} numberOfLines={1}>{opp?.name}{opp && opp.rating ? ` · ${opp.rating}` : ""}</Text>
            </View>
            <Pop trigger={oppNow}>
              <Text style={[s.boardNum, F.number, { color: C.muted }]}>{oppNow}</Text>
            </Pop>
          </View>
        </View>
      }
      big={
        phase === "countdown" ? (
          <Animated.Text key={count} entering={ZoomIn.springify().damping(8)} exiting={ZoomOut} style={[s.count, F.number]}>
            {count || "GO"}
          </Animated.Text>
        ) : phase === "ready" ? (
          <Text style={s.readyText}>{inPosition ? "Hold it…" : "Get into the top position"}</Text>
        ) : undefined
      }
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  radar: { width: 240, height: 240, alignItems: "center", justifyContent: "center", marginVertical: 12 },
  ring: { position: "absolute", borderRadius: 200, borderWidth: 2, borderColor: C.accent + "55" },
  score: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  side: { alignItems: "center", maxWidth: "42%" },
  board: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#000c", borderRadius: R.md, padding: 12, gap: 10 },
  boardSide: { gap: 2, flexShrink: 1 },
  boardName: { color: C.muted, fontWeight: "800", fontSize: 12 },
  boardNum: { color: C.text, fontWeight: "900", fontSize: 34 },
  timer: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#ffffff22", overflow: "hidden" },
  timerFill: { height: 6, backgroundColor: C.accent },
  count: { fontSize: 150, fontWeight: "900", fontStyle: "italic", color: C.accent, textShadowColor: C.accent, textShadowRadius: 30 },
  readyText: { fontSize: 26, fontWeight: "900", color: C.text, textAlign: "center", textShadowColor: "#000", textShadowRadius: 8, paddingVertical: 30 },
});
