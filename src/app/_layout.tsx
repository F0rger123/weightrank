import { Stack } from "expo-router";
import { useEffect } from "react";
import { warmupPose } from "../../modules/pose-camera";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountProvider } from "@/store/account";
import { ProfileProvider } from "@/store/profile";
import { C } from "@/ui/theme";
import { IntroSplash } from "@/ui/IntroSplash";
import { InviteToast } from "@/ui/InviteToast";
import { UpdateBanner } from "@/ui/UpdateBanner";

export default function RootLayout() {
  // Load the pose model while the intro plays, so the first workout opens instantly.
  useEffect(() => warmupPose(), []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
    <SafeAreaProvider>
      <ProfileProvider>
      <AccountProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "fade" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="train/[exercise]" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="duel/[exercise]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="fight/[exercise]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="challenge" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="install" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="placement" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="friends" options={{ animation: "slide_from_right" }} />
        </Stack>
        <UpdateBanner />
        <InviteToast />
        <IntroSplash />
      </AccountProvider>
      </ProfileProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
