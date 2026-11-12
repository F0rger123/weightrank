import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APK_URL, WEB_URL } from "@/lib/config";
import { Button, Card, Chip } from "@/ui/bits";
import { Appear, Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

type Device = "android" | "iphone";

const STEPS: Record<Device, { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[]> = {
  android: [
    { icon: "download", text: "Open the download link on your Android phone and tap the .apk file." },
    { icon: "shield-check-outline", text: 'If Android warns you, tap "Download anyway", then open the file.' },
    { icon: "toggle-switch-outline", text: 'Blocked? Tap Settings, turn on "Allow from this source", go back.' },
    { icon: "check-circle-outline", text: "Tap Install, then Open. Allow the camera when asked." },
  ],
  iphone: [
    { icon: "apple-safari", text: "Open the WeightRank link in Safari (not inside Instagram or another app)." },
    { icon: "export-variant", text: "Tap the Share button at the bottom of the screen." },
    { icon: "plus-box-outline", text: 'Scroll down and tap "Add to Home Screen", then Add.' },
    { icon: "check-circle-outline", text: "Open WeightRank from your home screen. Allow the camera when asked." },
  ],
};

/** How to install WeightRank on Android (APK) and iPhone (home-screen web app). Shareable with friends. */
export default function Install() {
  const insets = useSafeAreaInsets();
  const [device, setDevice] = useState<Device>(Platform.OS === "ios" ? "iphone" : "android");
  const link = device === "android" ? APK_URL : WEB_URL;

  const share = () =>
    Share.share({
      message: `Get WeightRank (free): your camera counts your reps and you can duel me.\nAndroid: ${APK_URL}${WEB_URL ? `\niPhone: open ${WEB_URL} in Safari → Share → Add to Home Screen` : ""}`,
    }).catch(() => {});

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.top}>
        <Tap onPress={() => router.back()} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.text} />
        </Tap>
        <Text style={F.h1}>Get the app</Text>
      </View>
      <Text style={F.small}>Free on Android and iPhone. Send this to a friend so you can duel.</Text>

      <View style={s.chips}>
        <Chip label="Android" icon="android" on={device === "android"} onPress={() => setDevice("android")} />
        <Chip label="iPhone" icon="apple" on={device === "iphone"} onPress={() => setDevice("iphone")} />
      </View>

      <Card style={{ gap: 16 }}>
        {STEPS[device].map((st, i) => (
          <Appear key={device + i} i={i} style={s.step}>
            <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
            <MaterialCommunityIcons name={st.icon} size={22} color={C.accent} />
            <Text style={[F.body, { flex: 1 }]}>{st.text}</Text>
          </Appear>
        ))}
      </Card>

      {device === "iphone" && !WEB_URL ? (
        <Card style={{ gap: 6 }}>
          <Text style={[F.body, { color: C.warn }]}>iPhone link coming soon</Text>
          <Text style={F.small}>The iPhone version runs in Safari and is added to the home screen. It goes live once web hosting is switched on.</Text>
        </Card>
      ) : (
        <Button label={device === "android" ? "Open Android download" : "Open iPhone link"} icon="open-in-new" onPress={() => Linking.openURL(link)} />
      )}
      <Button label="Send to a friend" icon="share-variant" kind="ghost" onPress={share} />
      {device === "iphone" && (
        <Text style={[F.small, { textAlign: "center" }]}>The iPhone version uses the same rep counter, running in Safari. Video stays on the phone.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  chips: { flexDirection: "row", gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  numText: { color: C.accentInk, fontWeight: "900" },
});
