import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useProfile } from "@/store/profile";
import { IslandTabBar } from "@/ui/IslandTabBar";
import { C } from "@/ui/theme";

export default function TabsLayout() {
  const { profile, ready } = useProfile();
  // First launch: set up body details and placement before anything else.
  if (ready && !profile.onboarded) return <Redirect href="/onboarding" />;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: C.bg },
          // Our own floating island replaces the stock bar.
          tabBarStyle: { display: "none" },
          animation: "none",
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Train" }} />
        <Tabs.Screen name="duel" options={{ title: "Duel" }} />
        <Tabs.Screen name="adventure" options={{ title: "Adventure" }} />
        <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      </Tabs>
      <IslandTabBar />
    </View>
  );
}
