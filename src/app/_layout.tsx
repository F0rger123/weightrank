import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider } from "@/store/profile";
import { C } from "@/ui/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "fade" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="train/[exercise]" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="duel/[exercise]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="fight/[exercise]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
        </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
