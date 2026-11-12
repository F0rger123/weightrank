import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { challengeLink, decodeCode, decodeLinkData, encodeCode, encodeLinkData, newRoomCode, roomLink } from "@/domain/challenge";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { WEB_URL } from "@/lib/config";
import { onlineConfigured } from "@/lib/online";
import { useProfile } from "@/store/profile";
import { Button, Card, Chip, EXERCISE_ICON, SectionLabel } from "@/ui/bits";
import { haptic } from "@/ui/haptics";
import { Appear, Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

const DUEL_EXERCISES: ExerciseId[] = ["pushup", "squat", "dip", "pullup"];

/** Challenge friends: send a score to beat (works offline) or open a live room (needs the online server). */
export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const incoming = d ? decodeLinkData(d) : null;
  const { profile, setName } = useProfile();
  const [exercise, setExercise] = useState<ExerciseId>("pushup");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [name, setNameDraft] = useState(profile.name);

  const best = Math.max(
    0,
    ...profile.sessions.filter((x) => x.mode === "duel" && x.exercise === exercise).map((x) => x.amount),
  );

  const play = (ex: ExerciseId, reps: number, who: string) =>
    router.push({ pathname: "/duel/[exercise]", params: { exercise: ex, mode: "challenge", d: encodeLinkData({ exercise: ex, reps, name: who }) } });

  const share = () => {
    const c = { exercise, reps: best, name: profile.name };
    Share.share({
      message: `Beat my ${best} ${EXERCISES[exercise].name.toLowerCase()} in 60 seconds on WeightRank 💪\n${challengeLink(c, WEB_URL)}\nOr open WeightRank → Challenge a friend → enter code ${encodeCode(c)}`,
    }).catch(() => {});
  };

  const live = () => {
    const room = newRoomCode();
    Share.share({ message: `Duel me live on WeightRank (${EXERCISES[exercise].name}, 60 s). Open: ${roomLink(room, WEB_URL)}\nOr enter room ${room} in WeightRank → Challenge a friend.` }).catch(() => {});
    router.push({ pathname: "/duel/[exercise]", params: { exercise, mode: "room", room } });
  };

  const enterCode = () => {
    const raw = code.trim().toUpperCase();
    if (/^[0-9A-Z]{6}$/.test(raw)) {
      router.push({ pathname: "/duel/[exercise]", params: { exercise, mode: "room", room: raw } });
      return;
    }
    const c = decodeCode(raw);
    if (!c) {
      haptic.reject();
      setCodeError("That code doesn't look right. Check the letters and try again.");
      return;
    }
    setCodeError(null);
    play(c.exercise, c.reps, "A friend");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={s.top}>
        <Tap onPress={() => router.back()} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
        </Tap>
        <Text style={F.h1}>Challenge</Text>
      </View>

      {incoming && (
        <Appear>
          <Card glow={C.violet} style={{ gap: 12 }}>
            <Text style={[F.label, { color: C.violet }]}>You've been challenged</Text>
            <Text style={F.h1}>{incoming.name} did {incoming.reps} {EXERCISES[incoming.exercise].name.toLowerCase()}</Text>
            <Text style={F.small}>60 seconds, full reps only. Beat it.</Text>
            <Button label="Accept challenge" icon="sword-cross" onPress={() => play(incoming.exercise, incoming.reps, incoming.name)} />
          </Card>
        </Appear>
      )}

      <Appear i={1}><SectionLabel>Exercise</SectionLabel></Appear>
      <Appear i={1} style={s.chips}>
        {DUEL_EXERCISES.map((id) => (
          <Chip key={id} label={EXERCISES[id].name} icon={EXERCISE_ICON[id]} on={exercise === id} onPress={() => setExercise(id)} />
        ))}
      </Appear>

      <Appear i={2}>
        <Card style={{ gap: 12 }}>
          <Text style={F.h2}>Send a score to beat</Text>
          <Text style={F.small}>Works anywhere, no account. Your friend opens the link (or types the code) and gets one shot at your number.</Text>
          {best > 0 ? (
            <>
              <Text style={[F.body, F.number]}>Your best 60-second {EXERCISES[exercise].name.toLowerCase()}: <Text style={{ color: C.accent, fontWeight: "900" }}>{best}</Text></Text>
              <Button label="Share challenge link" icon="share-variant" onPress={share} />
              <Text style={[F.small, { textAlign: "center" }]}>Code: <Text style={{ color: C.text, fontWeight: "900", letterSpacing: 2 }}>{encodeCode({ exercise, reps: best }, 7)}</Text></Text>
            </>
          ) : (
            <Button label="Set your score first" icon="timer-outline" onPress={() => play(exercise, 0, "Set the bar")} />
          )}
        </Card>
      </Appear>

      <Appear i={3}>
        <Card style={{ gap: 12 }}>
          <Text style={F.h2}>Duel a friend live</Text>
          <Text style={F.small}>
            {onlineConfigured ? "Send a room link. When they open it you both count down together and see each other's reps live." : "Needs the online server to be set up first. Score challenges above work today."}
          </Text>
          <Button label="Create live room" icon="access-point" kind="ghost" onPress={live} disabled={!onlineConfigured} />
        </Card>
      </Appear>

      <Appear i={4}>
        <Card style={{ gap: 12 }}>
          <Text style={F.h2}>Got a code?</Text>
          <TextInput
            value={code}
            onChangeText={(t) => { setCode(t); setCodeError(null); }}
            placeholder="WR-XXXX or room code"
            placeholderTextColor={C.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.input}
            onSubmitEditing={enterCode}
          />
          {codeError && <Text style={[F.small, { color: C.bad }]}>{codeError}</Text>}
          <Button label="Go" kind="ghost" icon="arrow-right" onPress={enterCode} disabled={!code.trim()} />
        </Card>
      </Appear>

      <Appear i={5}>
        <Card style={{ gap: 10 }}>
          <Text style={F.h2}>Your name</Text>
          <Text style={F.small}>Shown to friends and online opponents.</Text>
          <TextInput value={name} onChangeText={setNameDraft} onBlur={() => setName(name)} maxLength={16} style={s.input} placeholderTextColor={C.faint} />
        </Card>
      </Appear>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { height: 52, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, color: C.text, paddingHorizontal: 16, fontSize: 17, fontWeight: "800", letterSpacing: 1 },
});
