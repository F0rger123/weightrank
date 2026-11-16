import Constants from "expo-constants";

type Extra = { webUrl?: string; updateFeedUrl?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Hosted web app (for iPhone users and shareable https links). Empty until hosting is set up. */
export const WEB_URL = extra.webUrl || process.env.EXPO_PUBLIC_WEB_URL || "";

/** Where Android users download the latest APK. */
export const APK_URL = "https://github.com/F0rger123/weightrank/releases/latest";

/** Shown in Settings so it is obvious which build is installed. */
export const APP_VERSION = Constants.expoConfig?.version ?? "?";
