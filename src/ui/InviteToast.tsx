import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXERCISES, ExerciseId } from "@/domain/exercises";
import { clearInvite } from "@/lib/cloud";
import { useAccount } from "@/store/account";
import { haptic } from "./haptics";
import { Tap } from "./motion";
import { C, F, R } from "./theme";

/** Drops down from the top anywhere in the app when a friend invites you to a live duel. */
export function InviteToast() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { account, invites } = useAccount();
  const seen = useRef(new Set<string>());
  const inv = invites.find((i) => !seen.current.has(i.code));

  useEffect(() => {
    if (inv) haptic.win();
  }, [inv?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!inv || !account || path.startsWith("/duel") || path.startsWith("/fight") || path === "/friends") return null;
  const dismiss = () => {
    seen.current.add(inv.code);
    clearInvite(account.uid, inv.code);
  };
  return (
    <Animated.View entering={SlideInUp.springify().damping(14)} exiting={SlideOutUp} style={[s.wrap, { top: insets.top + 6 }]}>
      <View style={s.card}>
        <Text style={[F.label, { color: C.violet }]}>Live duel invite</Text>
        <Text style={F.body}>{inv.name} · {EXERCISES[inv.exercise as ExerciseId]?.name ?? "Push-ups"}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Tap style={[s.btn, { backgroundColor: C.accent }]} onPress={() => { dismiss(); router.push({ pathname: "/duel/[exercise]", params: { exercise: inv.exercise, mode: "room", room: inv.code } }); }}>
            <Text style={{ color: C.accentInk, fontWeight: "900" }}>Join</Text>
          </Tap>
          <Tap style={[s.btn, { backgroundColor: C.surface2 }]} onPress={dismiss}>
            <Text style={{ color: C.text, fontWeight: "800" }}>Later</Text>
          </Tap>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14, zIndex: 200 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.violet + "88", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 18, elevation: 16 },
  btn: { flex: 1, height: 42, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
});
