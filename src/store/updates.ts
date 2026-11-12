import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * New-APK check. The app reads a small JSON file (set `expo.extra.updateFeedUrl`
 * in app.json) shaped like:
 *   { "versionCode": 2, "version": "0.2.0", "apkUrl": "https://…/weightrank.apk", "notes": "…" }
 * If its versionCode is higher than this build's, the Train screen shows an
 * "Update available" banner that opens the APK download. Off when the URL is empty.
 *
 * Code-only changes can also arrive silently through EAS Update once an Expo
 * account is connected; this check covers native changes that need a new APK.
 */
export type UpdateInfo = { versionCode: number; version: string; apkUrl: string; notes?: string };

export function currentVersionCode(): number {
  return Number(Constants.expoConfig?.android?.versionCode ?? 0);
}

export function isNewer(feed: Pick<UpdateInfo, "versionCode">, current: number): boolean {
  return Number.isFinite(feed.versionCode) && feed.versionCode > current;
}

export function useApkUpdate(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    const url = (Constants.expoConfig?.extra as { updateFeedUrl?: string } | undefined)?.updateFeedUrl;
    if (!url || Platform.OS !== "android") return;
    let cancelled = false;
    fetch(url, { headers: { "cache-control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((feed: UpdateInfo | null) => {
        if (!cancelled && feed?.apkUrl && isNewer(feed, currentVersionCode())) setInfo(feed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}
