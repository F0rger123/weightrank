import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import { haptic } from "@/ui/haptics";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIslandSpace } from "@/ui/IslandTabBar";
import { EXERCISE_ORDER, EXERCISES } from "@/domain/exercises";
import { currentStreak, dailyQuests, dayKey, levelFor, questProgress, sessionsOn } from "@/domain/progress";
import { rankFor } from "@/domain/rating";
import { APP_VERSION } from "@/lib/config";
import { useProfile } from "@/store/profile";
import { Bar, Card, EXERCISE_ICON, RankBadge, SectionLabel, StatPill } from "@/ui/bits";
import { Confetti, Flame } from "@/ui/celebrate";
import { Logo } from "@/ui/Logo";
import { Appear, Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

/** Open the app, pick an exercise, train. No setup, no sign-up, no paywall. */
export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useIslandSpace();
  const { profile, patch } = useProfile();
  const today = dayKey(new Date());
  const todays = sessionsOn(profile.sessions, today);
  const streak = currentStreak(profile.sessions, new Date());
  const quests = dailyQuests(today);
  const rank = rankFor(profile.rating);
  const lvl = levelFor(profile.xp);
  const todayReps = todays.filter((x) => x.exercise !== "plank").reduce((a, b) => a + b.amount, 0);
  const [hero, ...rest] = EXERCISE_ORDER;
  const celebrate = streak > 0 && streak > (profile.lastStreakCelebrated ?? 0);
  useEffect(() => {
    if (!celebrate) return;
    haptic.win();
    const t = setTimeout(() => patch({ lastStreakCelebrated: streak }), 3500);
    return () => clearTimeout(t);
  }, [celebrate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1 }}>
    {celebrate && (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 50, alignItems: "center", justifyContent: "center" }]}>
        <Confetti count={50} />
        <Animated.View entering={ZoomIn.springify().damping(7)} exiting={ZoomOut} style={s.streakToast}>
          <Flame size={64} />
          <Text style={[F.display, { fontSize: 40 }]}>{streak}-day streak!</Text>
          <Text style={F.small}>Train tomorrow to keep it alive.</Text>
        </Animated.View>
      </View>
    )}
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.page, { paddingTop: insets.top + 14, paddingBottom: bottomSpace }]}>
      <Appear style={s.header}>
        <Logo size={30} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={s.streakPill}>
            <Flame lit={streak > 0} />
            <Text style={[F.body, F.number, { fontWeight: "900" }]}>{streak}</Text>
            <Text style={[F.small, { fontSize: 12 }]}>day streak</Text>
          </View>
        </View>
      </Appear>


      <Appear i={1}>
        <Tap onPress={() => router.push("/duel")} scaleTo={0.98}>
          <Card style={s.status}>
            <RankBadge rank={rank} size={54} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[F.label, { color: rank.color }]}>{rank.name} · Lv {lvl.level}</Text>
              <Text style={[F.h1, F.number]}>{profile.rating}</Text>
              <Bar value={lvl.into / lvl.needed} height={5} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[F.h2, F.number]}>{todayReps}</Text>
              <Text style={F.small}>reps today</Text>
            </View>
          </Card>
        </Tap>
      </Appear>

      <Appear i={2}>
        <Tap onPress={() => router.push({ pathname: "/train/[exercise]", params: { exercise: hero } })} scaleTo={0.97}>
          <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <MaterialCommunityIcons name={EXERCISE_ICON[hero]} size={120} color="#07080A18" style={s.heroBg} />
            <Text style={[F.label, { color: "#07080Aaa" }]}>Start training</Text>
            <Text style={s.heroTitle}>{EXERCISES[hero].name}</Text>
            <View style={s.heroGo}>
              <Text style={{ color: C.accent, fontWeight: "900", fontSize: 15 }}>GO</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={C.accent} />
            </View>
          </LinearGradient>
        </Tap>
      </Appear>

      <View style={s.grid}>
        {rest.map((id, i) => {
          const ex = EXERCISES[id];
          const done = todays.filter((x) => x.exercise === id).reduce((a, b) => a + b.amount, 0);
          return (
            <Appear key={id} i={3 + i} style={s.tileWrap}>
              <Tap onPress={() => router.push({ pathname: "/train/[exercise]", params: { exercise: id } })} style={s.tile}>
                <View style={s.tileIcon}>
                  <MaterialCommunityIcons name={EXERCISE_ICON[id]} size={24} color={C.accent} />
                </View>
                <Text style={s.tileName}>{ex.name}</Text>
                <Text style={F.small}>{done ? `${done}${ex.kind === "hold" ? "s" : ""} today` : ex.kind === "hold" ? "Timed hold" : "Rep counter"}</Text>
              </Tap>
            </Appear>
          );
        })}
      </View>

      <Appear i={7}>
        <Tap onPress={() => router.push("/challenge")} scaleTo={0.98}>
          <Card style={s.invite}>
            <View style={[s.tileIcon, { backgroundColor: C.violet + "22" }]}>
              <MaterialCommunityIcons name="account-multiple-plus" size={24} color={C.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={F.h2}>Challenge a friend</Text>
              <Text style={F.small}>Send a link. They try to beat your score.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={C.faint} />
          </Card>
        </Tap>
      </Appear>

      <Appear i={8}>
        <SectionLabel>Today's quests</SectionLabel>
      </Appear>
      <Appear i={9}>
        <Card style={{ gap: 16 }}>
          {quests.map((q) => {
            const p = questProgress(q, todays);
            const done = p >= q.goal;
            return (
              <View key={q.id} style={{ gap: 8 }}>
                <View style={s.questRow}>
                  <MaterialCommunityIcons name={done ? "check-circle" : "circle-outline"} size={20} color={done ? C.good : C.faint} />
                  <Text style={[F.body, { flex: 1 }, done && { color: C.muted, textDecorationLine: "line-through" }]}>{q.title}</Text>
                  <Text style={[F.small, F.number, { color: done ? C.good : C.accent }]}>+{q.xp} XP</Text>
                </View>
                <Bar value={p / q.goal} color={done ? C.good : C.accent} height={6} />
              </View>
            );
          })}
        </Card>
      </Appear>
      <Text style={[F.small, { textAlign: "center", marginTop: 6 }]}>Free forever. Video never leaves your phone. · v{APP_VERSION}</Text>
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, paddingHorizontal: 12, height: 38, borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
  streakToast: { alignItems: "center", gap: 6, backgroundColor: C.surface, padding: 24, borderRadius: R.lg, borderWidth: 1, borderColor: "#FF8A1F88" },
  update: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.accent, borderRadius: R.md, padding: 14 },
  status: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  hero: { borderRadius: R.lg, padding: 20, minHeight: 168, justifyContent: "flex-end", overflow: "hidden" },
  heroBg: { position: "absolute", right: -14, top: -10, transform: [{ rotate: "-12deg" }] },
  heroTitle: { fontSize: 40, fontWeight: "900", fontStyle: "italic", color: C.accentInk, letterSpacing: -1.5 },
  heroGo: { position: "absolute", right: 16, bottom: 16, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.accentInk, paddingHorizontal: 14, height: 38, borderRadius: R.pill },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tileWrap: { width: "48.4%", flexGrow: 1 },
  tile: { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, gap: 6, borderWidth: 1, borderColor: C.line, minHeight: 128, justifyContent: "flex-end" },
  tileIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.accent + "1A", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tileName: { fontSize: 18, fontWeight: "900", color: C.text },
  invite: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  questRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
