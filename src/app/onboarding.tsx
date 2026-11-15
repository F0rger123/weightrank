import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, FitnessLevel, kgToLb, LEVEL_TEXT, lbToKg, placementRating } from "@/domain/placement";
import { rankFor } from "@/domain/rating";
import { useProfile } from "@/store/profile";
import { Button, Chip } from "@/ui/bits";
import { Mark } from "@/ui/Logo";
import { Pulse, Tap } from "@/ui/motion";
import { RulerPicker } from "@/ui/RulerPicker";
import { C, F, R } from "@/ui/theme";

type Step = "hello" | "name" | "age" | "weight" | "height" | "level" | "test";
const ORDER: Step[] = ["hello", "name", "age", "weight", "height", "level", "test"];

/** First launch: one question per screen, then a placement test sets the starting rank. */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { profile, completeOnboarding } = useProfile();
  const [i, setI] = useState(0);
  const [name, setName] = useState(profile.name.startsWith("Athlete ") ? "" : profile.name);
  const [age, setAge] = useState(25);
  const [us, setUsRaw] = useState(true);
  const [weight, setWeight] = useState(170); // lb or kg, matching `us`
  const [height, setHeight] = useState(70); // inches or cm, matching `us`
  const setUs = (v: boolean) => {
    if (v === us) return;
    setWeight((w) => Math.round(v ? kgToLb(w) : lbToKg(w)));
    setHeight((h) => Math.round(v ? h / 2.54 : h * 2.54));
    setUsRaw(v);
  };
  const [level, setLevel] = useState<FitnessLevel | null>(null);
  const step = ORDER[i];

  const body = (): Body => ({
    age,
    weightKg: us ? lbToKg(weight) : weight,
    heightCm: us ? height * 2.54 : height,
    level: level ?? "some",
  });

  const valid: Record<Step, boolean> = {
    hello: true,
    name: true,
    age: true,
    weight: true,
    height: true,
    level: !!level,
    test: true,
  };

  const next = () => setI((n) => Math.min(ORDER.length - 1, n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  const skipTest = () => {
    const b = body();
    completeOnboarding(b, placementRating(b, null), null, name);
    router.replace({ pathname: "/placement", params: { reveal: "1" } });
  };
  const takeTest = () => router.push({ pathname: "/placement", params: { body: JSON.stringify(body()), name } });

  const preview = rankFor(placementRating(body(), null));

  return (
    <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.top}>
        {i > 0 ? (
          <Tap onPress={back} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={C.text} /></Tap>
        ) : <View style={{ width: 44 }} />}
        <View style={s.dots}>
          {ORDER.map((_, k) => <View key={k} style={[s.dot, k <= i && { backgroundColor: C.accent, width: k === i ? 22 : 8 }]} />)}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <Animated.View key={step} entering={SlideInRight.duration(260)} exiting={SlideOutLeft.duration(200)} style={s.body}>
        {step === "hello" && (
          <View style={{ alignItems: "center", gap: 18 }}>
            <Pulse min={0.92} ms={1200}><Mark size={120} /></Pulse>
            <Text style={[F.display, { textAlign: "center" }]}>Find your rank</Text>
            <Text style={[F.body, { textAlign: "center", color: C.muted }]}>
              A few quick questions and an optional 60-second push-up test. We use it to start you against opponents at your level.
            </Text>
          </View>
        )}

        {step === "name" && (
          <Q title="What should we call you?" hint="Friends and opponents see this.">
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.faint} style={s.input} maxLength={16} autoFocus returnKeyType="next" onSubmitEditing={() => valid[step] && next()} />
          </Q>
        )}

        {step === "age" && (
          <Q title="How old are you?" hint="Only used to estimate your level if you skip the test.">
            <RulerPicker min={10} max={90} value={age} onChange={setAge} unit="years" />
          </Q>
        )}

        {step === "weight" && (
          <Q title="Your weight?" hint="Stays on your phone.">
            <Units us={us} setUs={setUs} />
            <RulerPicker key={us ? "lb" : "kg"} min={us ? 80 : 35} max={us ? 400 : 180} value={weight} onChange={setWeight} unit={us ? "lb" : "kg"} />
          </Q>
        )}

        {step === "height" && (
          <Q title="Your height?" hint="Stays on your phone.">
            <Units us={us} setUs={setUs} />
            {us ? (
              <RulerPicker key="in" min={48} max={90} value={height} onChange={setHeight} majorEvery={12} format={(v) => `${Math.floor(v / 12)}'${v % 12}"`} />
            ) : (
              <RulerPicker key="cm" min={120} max={230} value={height} onChange={setHeight} unit="cm" />
            )}
          </Q>
        )}

        {step === "level" && (
          <Q title="How fit are you right now?">
            <View style={{ gap: 10 }}>
              {(Object.keys(LEVEL_TEXT) as FitnessLevel[]).map((l) => (
                <Tap key={l} onPress={() => setLevel(l)} style={[s.choice, level === l && s.choiceOn]}>
                  <Text style={[F.h2, level === l && { color: C.accentInk }]}>{LEVEL_TEXT[l].title}</Text>
                  <Text style={[F.small, level === l && { color: "#07080Aaa" }]}>{LEVEL_TEXT[l].detail}</Text>
                </Tap>
              ))}
            </View>
          </Q>
        )}

        {step === "test" && (
          <Q title="Placement test" hint="Do as many full push-ups as you can in 60 seconds. Knees up, chest all the way down. Your result sets your starting rank.">
            <View style={[s.choice, { alignItems: "center", gap: 6 }]}>
              <MaterialCommunityIcons name="timer-outline" size={36} color={C.accent} />
              <Text style={F.small}>Without the test we'd start you around</Text>
              <Text style={[F.h1, { color: preview.color }]}>{preview.name}</Text>
            </View>
          </Q>
        )}
        <Animated.View entering={FadeIn} style={{ gap: 10, marginTop: 24 }}>
        {step === "test" ? (
          <>
            <Button label="Take the 60-second test" icon="arm-flex" onPress={takeTest} />
            <Button label="Skip, estimate my rank" kind="ghost" onPress={skipTest} />
          </>
        ) : (
          <Button label={step === "hello" ? "Let's go" : "Next"} icon="arrow-right" onPress={next} disabled={!valid[step]} />
        )}
        </Animated.View>
      </Animated.View>

    </View>
  );
}

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 14 }}>
      <Text style={F.h1}>{title}</Text>
      {hint && <Text style={F.small}>{hint}</Text>}
      {children}
    </View>
  );
}

function Units({ us, setUs }: { us: boolean; setUs(v: boolean): void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Chip label="lb / ft" on={us} onPress={() => setUs(true)} />
      <Chip label="kg / cm" on={!us} onPress={() => setUs(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.surface2 },
  body: { flex: 1, justifyContent: "flex-start", paddingTop: "18%" },
  input: { height: 64, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, color: C.text, paddingHorizontal: 18, fontSize: 26, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  unit: { color: C.muted, fontSize: 20, fontWeight: "800" },
  choice: { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line, gap: 2 },
  choiceOn: { backgroundColor: C.accent, borderColor: C.accent },
});
