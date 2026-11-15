import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CAMPAIGN, isUnlocked, Level, nextLevel, roundLabel } from "@/domain/campaign";
import { EXERCISES } from "@/domain/exercises";
import { levelFor } from "@/domain/progress";
import { useProfile } from "@/store/profile";
import { Bar, Button, Card, EXERCISE_ICON } from "@/ui/bits";
import { useIslandSpace } from "@/ui/IslandTabBar";
import { Pulse, Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

const ALIGN = ["flex-start", "center", "flex-end", "center"] as const; // winding path

/** World map: mobs and a boss per world. Beat each to unlock the next. */
export default function AdventureTab() {
  const insets = useSafeAreaInsets();
  const bottomSpace = useIslandSpace();
  const { profile } = useProfile();
  const progress = profile.campaign ?? {};
  const current = nextLevel(progress);
  const [picked, setPicked] = useState<Level>(current);
  const lvl = levelFor(profile.xp);
  const totalStars = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 14, paddingBottom: bottomSpace + 230 }]}>
        <View style={s.head}>
          <Text style={F.h1}>Adventure</Text>
          <View style={s.stars}>
            <MaterialCommunityIcons name="star" size={18} color={C.warn} />
            <Text style={[F.body, F.number, { fontWeight: "900" }]}>{totalStars}</Text>
          </View>
        </View>
        <Card style={{ gap: 8, padding: 14 }}>
          <View style={s.row}>
            <Text style={F.label}>Hero level {lvl.level}</Text>
            <Text style={[F.small, F.number]}>{lvl.into}/{lvl.needed} XP</Text>
          </View>
          <Bar value={lvl.into / lvl.needed} />
        </Card>

        {CAMPAIGN.map((w) => (
          <View key={w.n} style={{ gap: 6 }}>
            <View style={[s.world, { borderColor: w.color + "66" }]}>
              <Text style={[F.label, { color: w.color }]}>World {w.n}</Text>
              <Text style={F.h2}>{w.name}</Text>
            </View>
            {w.levels.map((l, i) => {
              const open = isUnlocked(l, progress);
              const stars = progress[l.id] ?? 0;
              const isNext = l.id === current.id;
              const isPicked = l.id === picked.id;
              const size = l.boss ? 92 : 68;
              const node = (
                <Tap onPress={() => open && setPicked(l)} disabled={!open} style={[s.node, { width: size, height: size, borderRadius: size / 2, borderColor: open ? w.color : C.line, backgroundColor: isPicked ? w.color + "33" : C.surface }]}>
                  <Text style={{ fontSize: l.boss ? 44 : 32, opacity: open ? 1 : 0.25 }}>{l.emoji}</Text>
                  {!open && <MaterialCommunityIcons name="lock" size={18} color={C.faint} style={s.lock} />}
                </Tap>
              );
              return (
                <View key={l.id} style={[s.slot, { alignItems: ALIGN[i % 4] }]}>
                  <View style={{ alignItems: "center" }}>
                    {isNext ? <Pulse min={0.92} ms={900}>{node}</Pulse> : node}
                    <View style={{ flexDirection: "row", marginTop: 4 }}>
                      {[1, 2, 3].map((k) => <MaterialCommunityIcons key={k} name={k <= stars ? "star" : "star-outline"} size={14} color={k <= stars ? C.warn : C.faint} />)}
                    </View>
                    {l.boss && <Text style={[F.label, { color: C.bad }]}>Boss</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Animated.View key={picked.id} entering={FadeInDown.duration(220)} style={[s.sheet, { bottom: bottomSpace - 6 }]}>
        <View style={s.row}>
          <Text style={{ fontSize: 40 }}>{picked.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[F.label, picked.boss && { color: C.bad }]}>{picked.boss ? "Boss · " : ""}World {picked.world}-{picked.index}</Text>
            <Text style={F.h2}>{picked.name}</Text>
          </View>
          <Text style={[F.small, F.number]}>{picked.timeLimit}s</Text>
        </View>
        <View style={s.rounds}>
          {picked.rounds.map((r, i) => (
            <View key={i} style={s.round}>
              <MaterialCommunityIcons name={EXERCISE_ICON[r.exercise]} size={16} color={C.accent} />
              <Text style={[F.small, { color: C.text }]}>{roundLabel(r)}</Text>
            </View>
          ))}
        </View>
        <Button label={`Fight ${picked.name}`} icon="sword" onPress={() => router.push({ pathname: "/fight/[exercise]", params: { exercise: picked.rounds[0].exercise, level: picked.id } })} />
        <Text style={[F.small, { textAlign: "center" }]}>Finish every round before time runs out. Faster = more stars. Uses {[...new Set(picked.rounds.map((r) => EXERCISES[r.exercise].name))].join(", ")}.</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 14 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface, paddingHorizontal: 12, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  world: { borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 4, marginTop: 10 },
  slot: { height: 116, justifyContent: "center", paddingHorizontal: 34 },
  node: { alignItems: "center", justifyContent: "center", borderWidth: 3 },
  lock: { position: "absolute", bottom: -2, right: -2 },
  sheet: { position: "absolute", left: 14, right: 14, backgroundColor: C.surface, borderRadius: R.lg, padding: 16, gap: 12, borderWidth: 1, borderColor: C.line, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, elevation: 14 },
  rounds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  round: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface2, paddingHorizontal: 10, height: 30, borderRadius: R.pill },
});
