import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authErrorText, createAccount, signIn, signOut } from "@/lib/cloud";
import { useAccount } from "@/store/account";
import { useProfile } from "@/store/profile";
import { Button, Card, Chip } from "@/ui/bits";
import { haptic } from "@/ui/haptics";
import { Tap } from "@/ui/motion";
import { C, F, R } from "@/ui/theme";

/** Create an account or sign in, so progress follows you to any phone. */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { account, enabled, sync, friendCode } = useAccount();
  const { profile } = useProfile();
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = account && !account.guest;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") await createAccount(email.trim(), password, name.trim());
      else await signIn(email.trim(), password);
      haptic.win();
    } catch (e) {
      haptic.reject();
      setError(authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
      <View style={s.top}>
        <Tap onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={C.text} /></Tap>
        <Text style={F.h1}>Account</Text>
      </View>

      {!enabled ? (
        <Card><Text style={F.body}>Accounts aren't switched on in this build.</Text></Card>
      ) : signedIn ? (
        <>
          <Card style={{ gap: 10 }} glow={C.good}>
            <View style={s.row}>
              <MaterialCommunityIcons name="account-check" size={28} color={C.good} />
              <View style={{ flex: 1 }}>
                <Text style={F.h2}>{account.name || profile.name}</Text>
                <Text style={F.small}>{account.email}</Text>
              </View>
            </View>
            <View style={s.row}>
              <MaterialCommunityIcons name={sync === "error" ? "cloud-alert" : sync === "syncing" ? "cloud-sync" : "cloud-check"} size={20} color={sync === "error" ? C.bad : C.accent} />
              <Text style={F.small}>{sync === "error" ? "Couldn't save to the cloud. It retries on your next change." : sync === "syncing" ? "Saving…" : "Progress saved to your account"}</Text>
            </View>
            <Text style={F.small}>Friend code: <Text style={{ color: C.text, fontWeight: "900", letterSpacing: 2 }}>{friendCode}</Text></Text>
          </Card>
          <Text style={[F.small, { textAlign: "center" }]}>Sign in with the same email on another phone and your rank, stats and adventure progress come with you.</Text>
          <Button label="Sign out" kind="ghost" icon="logout" onPress={() => signOut()} />
        </>
      ) : (
        <>
          <Text style={F.small}>Save your rank, stats and adventure progress, and pick up on any phone. Free.</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Create account" on={mode === "create"} onPress={() => setMode("create")} />
            <Chip label="Sign in" on={mode === "signin"} onPress={() => setMode("signin")} />
          </View>
          <Card style={{ gap: 12 }}>
            {mode === "create" && (
              <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboard="email-address" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" secure />
            {error && <Text style={[F.small, { color: C.bad }]}>{error}</Text>}
            <Button label={busy ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"} icon="arrow-right" onPress={submit} disabled={busy || !email || password.length < 6} />
          </Card>
          {mode === "create" && <Text style={[F.small, { textAlign: "center" }]}>Everything you've done so far moves into the new account.</Text>}
          {mode === "signin" && <Text style={[F.small, { textAlign: "center" }]}>Signing in loads that account's progress onto this phone.</Text>}
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, secure }: {
  label: string; value: string; onChange(v: string): void; placeholder: string; keyboard?: "email-address"; secure?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={F.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        keyboardType={keyboard}
        autoCapitalize={keyboard || secure ? "none" : "words"}
        autoCorrect={false}
        secureTextEntry={secure}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 16, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { height: 52, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, color: C.text, paddingHorizontal: 16, fontSize: 16, fontWeight: "700" },
});
