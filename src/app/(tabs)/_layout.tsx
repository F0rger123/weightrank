import { Tabs } from "expo-router";
import { View } from "react-native";
import { IslandTabBar } from "@/ui/IslandTabBar";
import { C } from "@/ui/theme";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: C.bg },
          // Our own floating island replaces the stock bar.
          tabBarStyle: { display: "none" },
          animation: "shift",
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
