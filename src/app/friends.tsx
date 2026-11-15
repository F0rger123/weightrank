import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { newRoomCode } from "@/domain/challenge";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { acceptFriend, clearInvite, removeFriend, sendFriendRequest, sendRoomInvite } from "@/lib/cloud";
import { useAccount } from "@/store/account";
import { useProfile } from "@/store/profile";
import { Button, Card, Chip, EXERCISE_ICON, SectionLabel } from "@/ui/bits";
import { haptic } from "@/ui/haptics";
import { Pulse, Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

const DUEL: ExerciseId[] = ["pushup", "squat", "dip", "pullup"];

/** Friends: add by code, accept requests, see who's online, start a live room. */
export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { account, enabled, friendCode, friends, invites } = useAccount();
  const { profile } = useProfile();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [exercise, setExercise] = useState<ExerciseId>("pushup");

  if (!enabled || !account) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={F.body}>{enabled ? "Connecting…" : "Online features aren't switched on in this build."}</Text>
      </View>
    );
  }

  const add = async () => {
    const r = await sendFriendRequest(account.uid, code);
    if (r.ok) {
      haptic.win();
      setMsg({ text: `Request sent to ${r.name}.`, ok: true });
      setCode("");
    } else {
      haptic.reject();
      setMsg({ text: r.error, ok: false });
    }
  };

  const duel = async (uid: string) => {
    const room = newRoomCode();
    await sendRoomInvite(account.uid, profile.name, uid, room, exercise);
    haptic.tap();
    router.push({ pathname: "/duel/[exercise]", params: { exercise, mode: "room", room } });
  };

  const incoming = friends.filter((f) => f.status === "pending_in");
  const outgoing = friends.filter((f) => f.status === "pending_out");
  const mates = friends.filter((f) => f.status === "friends").sort((a, b) => Number(b.online) - Number(a.online) || b.rating - a.rating);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
      <View style={s.top}>
        <Tap onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={C.text} /></Tap>
        <Text style={[F.h1, { flex: 1 }]}>Friends</Text>
      </View>

      {invites.map((i) => (
        <Animated.View key={i.code} entering={FadeInDown}>
          <Card glow={C.violet} style={{ gap: 10 }}>
            <Text style={[F.label, { color: C.violet }]}>Live duel invite</Text>
            <Text style={F.h2}>{i.name} wants to duel you · {EXERCISES[i.exercise as ExerciseId]?.name ?? "Push-ups"}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button small label="Join" icon="sword-cross" onPress={() => { clearInvite(account.uid, i.code); router.push({ pathname: "/duel/[exercise]", params: { exercise: i.exercise, mode: "room", room: i.code } }); }} />
              </View>
              <Button small kind="ghost" label="Not now" onPress={() => clearInvite(account.uid, i.code)} />
            </View>
          </Card>
        </Animated.View>
      ))}

      <Card style={{ gap: 10 }}>
        <Text style={F.label}>Your friend code</Text>
        <View style={s.row}>
          <Text style={s.code}>{friendCode || "······"}</Text>
          <Button small kind="ghost" icon="share-variant" label="Share" onPress={() => Share.share({ message: `Add me on WeightRank: my friend code is ${friendCode}. Get the app: https://f0rger123.github.io/weightrank/` })} />
        </View>
        {account.guest && (
          <Tap onPress={() => router.push("/account")}>
            <Text style={[F.small, { color: C.warn }]}>You're a guest. Create a free account so your friends and progress aren't lost →</Text>
          </Tap>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={F.label}>Add a friend</Text>
        <View style={s.row}>
          <TextInput value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setMsg(null); }} placeholder="Their code" placeholderTextColor={C.faint} autoCapitalize="characters" autoCorrect={false} maxLength={6} style={[s.input, { flex: 1 }]} onSubmitEditing={add} />
          <Button small label="Add" icon="account-plus" onPress={add} disabled={code.length !== 6} />
        </View>
        {msg && <Text style={[F.small, { color: msg.ok ? C.good : C.bad }]}>{msg.text}</Text>}
      </Card>

      {incoming.length > 0 && <SectionLabel>Requests</SectionLabel>}
      {incoming.map((f) => (
        <Card key={f.uid} style={s.friend}>
          <Avatar name={f.name} online={f.online} />
          <View style={{ flex: 1 }}>
            <Text style={F.body}>{f.name}</Text>
            <Text style={F.small}>{f.rank} · {f.rating}</Text>
          </View>
          <Button small label="Accept" onPress={() => { haptic.win(); acceptFriend(account.uid, f.uid); }} />
          <Tap onPress={() => removeFriend(account.uid, f.uid)} style={{ padding: 6 }}><MaterialCommunityIcons name="close" size={20} color={C.faint} /></Tap>
        </Card>
      ))}

      <SectionLabel>{`Friends ${mates.length ? `(${mates.filter((m) => m.online).length} online)` : ""}`}</SectionLabel>
      {mates.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DUEL.map((id) => <Chip key={id} label={EXERCISES[id].name} icon={EXERCISE_ICON[id]} on={exercise === id} onPress={() => setExercise(id)} />)}
        </View>
      )}
      {mates.length === 0 && <Text style={F.small}>No friends yet. Share your code or add theirs above.</Text>}
      {mates.map((f) => (
        <Card key={f.uid} style={s.friend}>
          <Avatar name={f.name} online={f.online} />
          <View style={{ flex: 1 }}>
            <Text style={F.body}>{f.name}</Text>
            <Text style={F.small}>{f.rank} · {f.rating}{f.online ? " · online" : ""}</Text>
          </View>
          <Button small label="Duel live" icon="access-point" kind={f.online ? "primary" : "ghost"} onPress={() => duel(f.uid)} />
        </Card>
      ))}

      {outgoing.length > 0 && <SectionLabel>Sent</SectionLabel>}
      {outgoing.map((f) => (
        <Card key={f.uid} style={s.friend}>
          <Avatar name={f.name} online={false} />
          <Text style={[F.body, { flex: 1 }]}>{f.name}</Text>
          <Text style={F.small}>Waiting</Text>
          <Tap onPress={() => removeFriend(account.uid, f.uid)} style={{ padding: 6 }}><MaterialCommunityIcons name="close" size={20} color={C.faint} /></Tap>
        </Card>
      ))}
    </ScrollView>
  );
}

function Avatar({ name, online }: { name: string; online: boolean }) {
  return (
    <View>
      <View style={s.avatar}><Text style={s.avatarText}>{(name || "?").slice(0, 1).toUpperCase()}</Text></View>
      {online && <Pulse style={s.dot} min={0.8} ms={900}><View /></Pulse>}
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  center: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  code: { flex: 1, fontSize: 34, fontWeight: "900", letterSpacing: 6, color: C.accent },
  input: { height: 46, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, color: C.text, paddingHorizontal: 14, fontSize: 18, fontWeight: "900", letterSpacing: 3 },
  friend: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  avatarText: { color: C.text, fontWeight: "900", fontSize: 18 },
  dot: { position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: C.good, borderWidth: 2, borderColor: C.surface },
});
