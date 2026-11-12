import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/ui/haptics";
import { C } from "@/ui/theme";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const tab = (title: string, icon: Icon) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: unknown; focused: boolean }) => (
    <View style={{ alignItems: "center", gap: 3 }}>
      <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: focused ? C.accent : "transparent", marginBottom: 2 }} />
      <MaterialCommunityIcons name={icon} color={String(color)} size={24} />
    </View>
  ),
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Sit above Android's gesture bar / nav buttons instead of under them.
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.line,
          height: 62 + bottom,
          paddingBottom: bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={tab("Train", "dumbbell")} />
      <Tabs.Screen name="duel" options={tab("Duel", "sword-cross")} />
      <Tabs.Screen name="adventure" options={tab("Adventure", "castle")} />
      <Tabs.Screen name="progress" options={tab("Progress", "chart-line-variant")} />
    </Tabs>
  );
}
