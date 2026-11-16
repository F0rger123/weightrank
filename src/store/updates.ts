import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";

/**
 * Self-updating APK. On launch the app reads `latest.json` from the newest
 * GitHub release:
 *   { "versionCode": 4, "version": "0.4.0", "apkUrl": "https://…/WeightRank-0.4.0.apk", "notes": "…" }
 * If it's newer than this build, the app downloads the APK in the background
 * and then opens Android's installer. Android always asks for one "Install"
 * tap; apps can't silently replace themselves.
 */
export type UpdateInfo = { versionCode: number; version: string; apkUrl: string; notes?: string };

export type UpdateState =
  | { kind: "idle" }
  | { kind: "downloading"; info: UpdateInfo; progress: number }
  | { kind: "ready"; info: UpdateInfo; install(): void }
  | { kind: "failed"; info: UpdateInfo; retry(): void };

export const UPDATE_FEED =
  (Constants.expoConfig?.extra as { updateFeedUrl?: string } | undefined)?.updateFeedUrl ||
  "https://github.com/F0rger123/weightrank/releases/latest/download/latest.json";

export function currentVersionCode(): number {
  return Number(Constants.expoConfig?.android?.versionCode ?? 0);
}

export function isNewer(feed: Pick<UpdateInfo, "versionCode">, current: number): boolean {
  return Number.isFinite(feed.versionCode) && feed.versionCode > current;
}

async function download(info: UpdateInfo, onProgress: (p: number) => void): Promise<string> {
  const FS = await import("expo-file-system/legacy");
  const dest = `${FS.cacheDirectory}WeightRank-${info.versionCode}.apk`;
  const existing = await FS.getInfoAsync(dest);
  if (existing.exists && (existing.size ?? 0) > 1_000_000) return dest;
  const task = FS.createDownloadResumable(info.apkUrl, dest, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const res = await task.downloadAsync();
  if (!res || res.status !== 200) throw new Error(`download failed (${res?.status})`);
  return dest;
}

async function openInstaller(file: string, info: UpdateInfo) {
  try {
    const FS = await import("expo-file-system/legacy");
    const IL = await import("expo-intent-launcher");
    const uri = await FS.getContentUriAsync(file);
    await IL.startActivityAsync("android.intent.action.VIEW", {
      data: uri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: "application/vnd.android.package-archive",
    });
  } catch {
    // Fallback: let the browser download it.
    Linking.openURL(info.apkUrl);
  }
}

/** Checks once per launch, downloads automatically, then offers the installer. */
export function useApkUpdate(): UpdateState {
  const [state, setState] = useState<UpdateState>({ kind: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android" || started.current) return;
    started.current = true;
    let cancelled = false;

    const run = async (info: UpdateInfo) => {
      setState({ kind: "downloading", info, progress: 0 });
      try {
        const file = await download(info, (p) => !cancelled && setState({ kind: "downloading", info, progress: p }));
        if (cancelled) return;
        const install = () => openInstaller(file, info);
        setState({ kind: "ready", info, install });
        install(); // open the installer straight away
      } catch {
        if (!cancelled) setState({ kind: "failed", info, retry: () => run(info) });
      }
    };

    fetch(UPDATE_FEED, { headers: { "cache-control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((feed: UpdateInfo | null) => {
        if (!cancelled && feed?.apkUrl && isNewer(feed, currentVersionCode())) run(feed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
