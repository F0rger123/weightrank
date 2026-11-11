import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { C } from "@/ui/theme";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const tab = (title: string, icon: Icon) => ({
  title,
  tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <MaterialCommunityIcons name={icon} color={String(color)} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.line, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={tab("Train", "dumbbell")} />
      <Tabs.Screen name="duel" options={tab("Duel", "sword-cross")} />
      <Tabs.Screen name="adventure" options={tab("Adventure", "castle")} />
      <Tabs.Screen name="progress" options={tab("Progress", "chart-line-variant")} />
    </Tabs>
  );
}
