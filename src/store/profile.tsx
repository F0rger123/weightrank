import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACHIEVEMENTS, dailyQuests, dayKey, questProgress, Session, sessionsOn, xpFor,
} from "@/domain/progress";
import type { Body } from "@/domain/placement";
import { setHapticsEnabled } from "@/ui/haptics";
import { applyDelta, rankFor, RankId, RANKS, ratingDelta, START_RATING } from "@/domain/rating";

/** Everything the app remembers, stored on the phone. */
export type Profile = {
  version: 1;
  rating: number;
  games: number;
  peakRank: RankId;
  xp: number;
  adventureStage: number;
  sessions: Session[];
  /** Quest ids whose XP has been paid out. */
  questsPaid: string[];
  achievements: string[];
  settings: { facing: "front" | "back"; voice: boolean; vibrate?: boolean };
  /** Random id for online play; never tied to an account. */
  playerId: string;
  /** Name shown to friends and online opponents. */
  name: string;
  /** Finished the first-launch setup (body details + placement). */
  onboarded?: boolean;
  body?: Body;
  /** Push-ups in the placement test, null if skipped. */
  placementReps?: number | null;
  /** Best daily streak seen, for the streak celebration. */
  lastStreakCelebrated?: number;
  /** Adventure: level id -> best stars. */
  campaign?: Record<string, number>;
  /** Last local change (ms), for cloud sync. */
  updatedAt?: number;
  /** Account this profile was last synced with. */
  syncedUid?: string;
};

function rankForId(r: number): RankId {
  return rankFor(r).id;
}

function randomId(): string {
  return Array.from({ length: 12 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");
}

const KEY = "weightrank.profile.v1";
/** Keep the history bounded so storage stays small. */
const MAX_SESSIONS = 2000;

export const NEW_PROFILE: Profile = {
  version: 1,
  rating: START_RATING,
  games: 0,
  peakRank: rankFor(START_RATING).id,
  xp: 0,
  adventureStage: 1,
  sessions: [],
  questsPaid: [],
  achievements: [],
  settings: { facing: "front", voice: true },
  playerId: "",
  name: "",
};

export type SaveResult = {
  xpGained: number;
  ratingDelta?: number;
  questsDone: string[];
  newAchievements: string[];
  rankUp?: RankId;
};

type Ctx = {
  profile: Profile;
  ready: boolean;
  /** Record a finished session; pays out XP, quests and achievements. */
  saveSession(s: Session, duel?: { opponentRating: number }, extra?: { adventureCleared?: boolean; level?: { id: string; stars: number } }): SaveResult;
  setSettings(patch: Partial<Profile["settings"]>): void;
  setName(name: string): void;
  /** First-launch setup: body details and placement result set the starting rating. */
  completeOnboarding(body: Body, rating: number, placementReps: number | null, name?: string): void;
  patch(p: Partial<Profile>): void;
  /** Replace the whole profile with one from the cloud (keeps its timestamp). */
  replace(p: Profile): void;
  resetAll(): void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(NEW_PROFILE);
  const [ready, setReady] = useState(false);
  const ref = useRef(profile);
  ref.current = profile;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? ({ ...NEW_PROFILE, ...(JSON.parse(raw) as Profile) } as Profile) : { ...NEW_PROFILE };
        if (!saved.playerId) saved.playerId = randomId();
        if (!saved.name) saved.name = `Athlete ${saved.playerId.slice(0, 4).toUpperCase()}`;
        ref.current = saved;
        setProfile(saved);
        AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => setHapticsEnabled(profile.settings.vibrate !== false), [profile.settings.vibrate]);

  const commit = useCallback((next: Profile, touch = true) => {
    if (touch) next = { ...next, updatedAt: Date.now() };
    ref.current = next;
    setProfile(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const saveSession = useCallback<Ctx["saveSession"]>((s, duel, extra) => {
    const p = ref.current;
    const result: SaveResult = { xpGained: 0, questsDone: [], newAchievements: [] };
    let rating = p.rating;
    let games = p.games;
    if (duel && s.outcome) {
      const d = ratingDelta(p.rating, duel.opponentRating, s.outcome, p.games);
      rating = applyDelta(p.rating, d);
      result.ratingDelta = rating - p.rating;
      games++;
    }
    const sessions = [...p.sessions, s].slice(-MAX_SESSIONS);
    let xp = p.xp + xpFor(s);

    // Daily quests
    const today = dayKey(new Date(s.at));
    const todays = sessionsOn(sessions, today);
    const questsPaid = [...p.questsPaid.filter((id) => id.startsWith(today))];
    for (const q of dailyQuests(today)) {
      if (!questsPaid.includes(q.id) && questProgress(q, todays) >= q.goal) {
        questsPaid.push(q.id);
        xp += q.xp;
        result.questsDone.push(q.title);
      }
    }

    const oldIdx = RANKS.findIndex((r) => r.id === p.peakRank);
    const newRank = rankFor(rating);
    const newIdx = RANKS.indexOf(newRank);
    const peakRank = newIdx > oldIdx ? newRank.id : p.peakRank;
    if (newIdx > oldIdx) result.rankUp = newRank.id;
    const campaign = { ...(p.campaign ?? {}) };
    if (extra?.level) campaign[extra.level.id] = Math.max(campaign[extra.level.id] ?? 0, extra.level.stars);
    const cleared = Object.values(campaign).filter((v) => v > 0).length;
    const adventureStage = Math.max(p.adventureStage + (extra?.adventureCleared && !extra.level ? 1 : 0), cleared + 1);

    const stats = { sessions, rating, peakRank, adventureStage };
    const achievements = [...p.achievements];
    for (const a of ACHIEVEMENTS) {
      if (!achievements.includes(a.id) && a.done(stats)) {
        achievements.push(a.id);
        result.newAchievements.push(a.title);
      }
    }
    result.xpGained = xp - p.xp;
    commit({ ...p, rating, games, peakRank, xp, sessions, questsPaid, achievements, adventureStage, campaign });
    return result;
  }, [commit]);

  const setSettings = useCallback((patch: Partial<Profile["settings"]>) => {
    const p = ref.current;
    commit({ ...p, settings: { ...p.settings, ...patch } });
  }, [commit]);

  const setName = useCallback((name: string) => {
    commit({ ...ref.current, name: name.trim().slice(0, 16) || ref.current.name });
  }, [commit]);

  const completeOnboarding = useCallback((body: Body, rating: number, placementReps: number | null, name?: string) => {
    const p = ref.current;
    // Someone who has already played keeps their earned rating unless they retook the test.
    const keep = p.games > 0 && placementReps === null;
    const r = keep ? p.rating : rating;
    commit({ ...p, body, placementReps, onboarded: true, rating: r, name: name?.trim() || p.name, peakRank: keep ? p.peakRank : rankForId(r) });
  }, [commit]);

  const patch = useCallback((x: Partial<Profile>) => commit({ ...ref.current, ...x }), [commit]);
  const replace = useCallback((x: Profile) => commit({ ...NEW_PROFILE, ...x }, false), [commit]);

  const resetAll = useCallback(() => {
    const p = ref.current;
    commit({ ...NEW_PROFILE, playerId: p.playerId, name: p.name });
  }, [commit]);

  const value = useMemo(() => ({ profile, ready, saveSession, setSettings, setName, completeOnboarding, patch, replace, resetAll }), [profile, ready, saveSession, setSettings, setName, completeOnboarding, patch, replace, resetAll]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(ProfileContext);
  if (!c) throw new Error("useProfile outside ProfileProvider");
  return c;
}
