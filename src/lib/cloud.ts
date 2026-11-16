import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  Auth, createUserWithEmailAndPassword, EmailAuthProvider, getAuth, initializeAuth, linkWithCredential,
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile, User,
} from "firebase/auth";
import {
  Database, get, getDatabase, onDisconnect, onValue, ref, remove, serverTimestamp, set, update,
} from "firebase/database";
import { Platform } from "react-native";

/**
 * Cloud backend (Firebase, free Spark plan): accounts, progress sync, friends,
 * presence and live rooms. Everything goes through this file so the rest of
 * the app never talks to Firebase directly.
 */

type FirebaseConfig = { apiKey: string; authDomain: string; projectId: string; appId: string; databaseURL: string };
const cfg = (Constants.expoConfig?.extra as { firebase?: FirebaseConfig } | undefined)?.firebase;

export const cloudConfigured = !!cfg?.apiKey && !!cfg.databaseURL;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

function boot() {
  if (!cloudConfigured || app) return;
  app = getApps()[0] ?? initializeApp(cfg!);
  if (Platform.OS === "web") {
    auth = getAuth(app);
  } else {
    // React Native keeps the login on the phone with AsyncStorage.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require("@firebase/auth") as { getReactNativePersistence(s: unknown): never };
    try {
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      auth = getAuth(app);
    }
  }
  db = getDatabase(app);
}

export function cloud(): { auth: Auth; db: Database } {
  boot();
  if (!auth || !db) throw new Error("Cloud not configured");
  return { auth, db };
}

// ---------- Auth ----------

export type Account = { uid: string; email: string | null; name: string | null; guest: boolean };

const toAccount = (u: User): Account => ({ uid: u.uid, email: u.email, name: u.displayName, guest: u.isAnonymous });

/** Watch the signed-in user. Signs in as a guest automatically so friends and rooms work right away. */
export function watchAccount(cb: (a: Account | null) => void): () => void {
  if (!cloudConfigured) {
    cb(null);
    return () => {};
  }
  const { auth } = cloud();
  return onAuthStateChanged(auth, (u) => {
    if (u) cb(toAccount(u));
    else {
      cb(null);
      signInAnonymously(auth).catch(() => {});
    }
  });
}

/**
 * Create an account. A guest is upgraded in place (same id), so everything
 * they did as a guest, including friends, carries over.
 */
export async function createAccount(email: string, password: string, name: string): Promise<Account> {
  const { auth } = cloud();
  const cur = auth.currentUser;
  const cred = cur?.isAnonymous
    ? await linkWithCredential(cur, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  return toAccount(cred.user);
}

export async function signIn(email: string, password: string): Promise<Account> {
  const { auth } = cloud();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return toAccount(cred.user);
}

export async function signOut() {
  const { auth } = cloud();
  await fbSignOut(auth); // watchAccount then signs in a fresh guest
}

export function authErrorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use") || code.includes("credential-already-in-use")) return "That email already has an account. Sign in instead.";
  if (code.includes("invalid-email")) return "That email doesn't look right.";
  if (code.includes("weak-password")) return "Use at least 6 characters for the password.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is wrong.";
  if (code.includes("network")) return "No connection. Try again when you're online.";
  if (code.includes("operation-not-allowed")) return "Email sign-in isn't switched on in Firebase yet.";
  return "Something went wrong. Try again.";
}

// ---------- Progress sync ----------

export type SavedProfile = { json: string; updatedAt: number };

export async function pullProfile(uid: string): Promise<SavedProfile | null> {
  const snap = await get(ref(cloud().db, `users/${uid}/profile`));
  return snap.exists() ? (snap.val() as SavedProfile) : null;
}

export async function pushProfile(uid: string, json: string, publicInfo: PublicInfo) {
  const { db } = cloud();
  const at = Date.now();
  await update(ref(db, `users/${uid}`), {
    profile: { json, updatedAt: at },
    public: { ...publicInfo, updatedAt: at },
  });
}

// ---------- Friends ----------

export type PublicInfo = { name: string; rating: number; rank: string; code: string };
export type FriendStatus = "pending_out" | "pending_in" | "friends";
export type Friend = PublicInfo & { uid: string; status: FriendStatus; online: boolean };

/** Stable 6-character friend code from the account id. */
export function friendCodeFor(uid: string): string {
  const A = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) h = Math.imul(h ^ uid.charCodeAt(i), 16777619) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += A[h % A.length];
    h = Math.floor(h / A.length) ^ Math.imul(h, 2654435761) >>> 0;
  }
  return out;
}

export async function claimFriendCode(uid: string): Promise<string> {
  const code = friendCodeFor(uid);
  await set(ref(cloud().db, `codes/${code}`), uid).catch(() => {});
  return code;
}

export async function sendFriendRequest(myUid: string, code: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const { db } = cloud();
  const clean = code.trim().toUpperCase();
  const snap = await get(ref(db, `codes/${clean}`));
  if (!snap.exists()) return { ok: false, error: "No player with that code." };
  const them = snap.val() as string;
  if (them === myUid) return { ok: false, error: "That's your own code." };
  const pub = await get(ref(db, `users/${them}/public`));
  const theirMine = await get(ref(db, `users/${myUid}/friends/${them}`));
  if (theirMine.exists() && theirMine.val().status === "pending_in") {
    await acceptFriend(myUid, them);
    return { ok: true, name: (pub.val()?.name as string) ?? "Friend" };
  }
  await update(ref(db), {
    [`users/${myUid}/friends/${them}`]: { status: "pending_out", at: serverTimestamp() },
    [`users/${them}/friends/${myUid}`]: { status: "pending_in", at: serverTimestamp() },
  });
  return { ok: true, name: (pub.val()?.name as string) ?? "Player" };
}

export async function acceptFriend(myUid: string, them: string) {
  await update(ref(cloud().db), {
    [`users/${myUid}/friends/${them}`]: { status: "friends", at: serverTimestamp() },
    [`users/${them}/friends/${myUid}`]: { status: "friends", at: serverTimestamp() },
  });
}

export async function removeFriend(myUid: string, them: string) {
  await update(ref(cloud().db), {
    [`users/${myUid}/friends/${them}`]: null,
    [`users/${them}/friends/${myUid}`]: null,
  });
}

/** Live list of friends with their public info and online status. */
export function watchFriends(myUid: string, cb: (f: Friend[]) => void): () => void {
  const { db } = cloud();
  const extra = new Map<string, () => void>();
  const info = new Map<string, PublicInfo>();
  const online = new Map<string, boolean>();
  let statuses: Record<string, { status: FriendStatus }> = {};
  const emit = () =>
    cb(
      Object.entries(statuses).map(([uid, v]) => ({
        uid,
        status: v.status,
        online: online.get(uid) ?? false,
        ...(info.get(uid) ?? { name: "Player", rating: 0, rank: "", code: "" }),
      })),
    );
  const off = onValue(ref(db, `users/${myUid}/friends`), (snap) => {
    statuses = (snap.val() ?? {}) as typeof statuses;
    for (const uid of Object.keys(statuses)) {
      if (extra.has(uid)) continue;
      const a = onValue(ref(db, `users/${uid}/public`), (s) => {
        if (s.exists()) info.set(uid, s.val());
        emit();
      });
      const b = onValue(ref(db, `status/${uid}/online`), (s) => {
        online.set(uid, !!s.val());
        emit();
      });
      extra.set(uid, () => {
        a();
        b();
      });
    }
    emit();
  });
  return () => {
    off();
    extra.forEach((f) => f());
  };
}

/** Marks me online while the app is open; Firebase clears it if the connection drops. */
export function goOnline(uid: string) {
  const { db } = cloud();
  const r = ref(db, `status/${uid}`);
  const conn = ref(db, ".info/connected");
  return onValue(conn, (s) => {
    if (!s.val()) return;
    onDisconnect(r).set({ online: false, lastSeen: serverTimestamp() }).then(() => set(r, { online: true, lastSeen: serverTimestamp() }));
  });
}

// ---------- Live room invites ----------

export type Invite = { code: string; from: string; name: string; exercise: string; at: number };

export async function sendRoomInvite(myUid: string, myName: string, to: string, code: string, exercise: string) {
  await set(ref(cloud().db, `users/${to}/invites/${code}`), { from: myUid, name: myName, exercise, at: Date.now() });
}

export function watchInvites(myUid: string, cb: (i: Invite[]) => void): () => void {
  return onValue(ref(cloud().db, `users/${myUid}/invites`), (snap) => {
    const v = (snap.val() ?? {}) as Record<string, Omit<Invite, "code">>;
    const fresh = Object.entries(v)
      .map(([code, i]) => ({ code, ...i }))
      .filter((i) => Date.now() - i.at < 10 * 60_000)
      .sort((a, b) => b.at - a.at);
    cb(fresh);
  });
}

export async function clearInvite(myUid: string, code: string) {
  await remove(ref(cloud().db, `users/${myUid}/invites/${code}`));
}
