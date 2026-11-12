import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({ default: { expoConfig: { android: { versionCode: 3 } } } }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

describe("apk update check", () => {
  it("only flags a higher versionCode", async () => {
    const { isNewer, currentVersionCode } = await import("../../store/updates");
    expect(currentVersionCode()).toBe(3);
    expect(isNewer({ versionCode: 4 }, 3)).toBe(true);
    expect(isNewer({ versionCode: 3 }, 3)).toBe(false);
    expect(isNewer({ versionCode: NaN }, 3)).toBe(false);
  });
});
