import { get, off, onDisconnect, onValue, ref, remove, runTransaction, set, update } from "firebase/database";
import { ExerciseId } from "@/domain/exercises";
import { pairFor, Player } from "@/domain/pairing";
import { cloud, cloudConfigured } from "./cloud";

/**
 * Live 1v1 duels over Firebase Realtime Database. Ranked play waits in a
 * per-exercise queue; friends meet in a room by code. Both phones count down
 * to the same start time and see each other's reps live.
 */

export const onlineConfigured = cloudConfigured;

export type { Player };
export { pairFor };

export type Match = {
  matchId: string;
  opponent: Player;
  /** Shared start time (ms since epoch) both phones count down to. */
  readonly startAt: number;
  sendReps(n: number): void;
  onReps(cb: (n: number) => void): void;
  onLeft(cb: () => void): void;
  close(): void;
};

export type FindOpts = {
  /** id must be the signed-in account id (rules check it). */
  me: Player;
  exercise: ExerciseId;
  /** Set to play one specific friend: both phones join the same room. */
  room?: string;
  signal: AbortSignal;
};

const START_DELAY = 6000;

export async function findMatch({ me, exercise, room, signal }: FindOpts): Promise<Match | null> {
  if (!onlineConfigured) return null;
  const { db, auth } = cloud();
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const self = { ...me, id: uid };

  if (room) return joinRoom(room, self, exercise, signal);

  // Ranked queue
  const qRef = ref(db, `queue/${exercise}`);
  const mine = ref(db, `queue/${exercise}/${uid}`);
  await set(mine, { name: self.name, rating: self.rating, t: Date.now(), match: null });
  onDisconnect(mine).remove();

  return new Promise<Match | null>((resolve) => {
    let done = false;
    const finish = (m: Match | null) => {
      if (done) return;
      done = true;
      off(qRef);
      remove(mine).catch(() => {});
      resolve(m);
    };
    signal.addEventListener("abort", () => finish(null));

    onValue(qRef, async (snap) => {
      if (done) return;
      const v = (snap.val() ?? {}) as Record<string, { name: string; rating: number; t: number; match?: string }>;
      // Someone already paired me: they wrote the room id into my queue entry.
      const assigned = v[uid]?.match;
      if (assigned) {
        finish(await joinRoom(assigned, self, exercise, signal));
        return;
      }
      const members: Player[] = Object.entries(v)
        .filter(([, p]) => !p.match)
        .map(([id, p]) => ({ id, name: p.name, rating: p.rating, t: p.t }));
      const partner = pairFor(members, uid);
      // Lower id hosts: claims the partner atomically, then both join the room.
      if (partner && uid < partner.id) {
        const roomId = `m${uid.slice(0, 6)}${partner.id.slice(0, 6)}${Date.now().toString(36)}`;
        const claimed = await runTransaction(ref(db, `queue/${exercise}/${partner.id}/match`), (cur) => (cur ? undefined : roomId));
        if (claimed.committed) finish(await joinRoom(roomId, self, exercise, signal));
      }
    });
  });
}

async function joinRoom(code: string, me: Player, exercise: ExerciseId, signal: AbortSignal): Promise<Match | null> {
  const { db } = cloud();
  const roomRef = ref(db, `rooms/${code}`);
  const meRef = ref(db, `rooms/${code}/players/${me.id}`);
  await update(roomRef, { exercise, createdAt: Date.now() });
  await set(meRef, { name: me.name, rating: me.rating, reps: 0, joinedAt: Date.now(), left: false });
  onDisconnect(meRef).update({ left: true });

  return new Promise<Match | null>((resolve) => {
    let resolved = false;
    signal.addEventListener("abort", () => {
      if (resolved) return;
      resolved = true;
      off(roomRef);
      remove(meRef).catch(() => {});
      resolve(null);
    });
    onValue(roomRef, async (snap) => {
      if (resolved) return;
      const r = snap.val() as { players?: Record<string, { name: string; rating: number; joinedAt: number; left?: boolean }>; startAt?: number } | null;
      const players = Object.entries(r?.players ?? {}).filter(([, p]) => !p.left);
      const other = players.find(([id]) => id !== me.id);
      if (!other) return;
      // The lower id sets the shared start time once both are in.
      if (!r?.startAt) {
        if (me.id < other[0]) await runTransaction(ref(db, `rooms/${code}/startAt`), (cur) => cur ?? Date.now() + START_DELAY);
        return;
      }
      resolved = true;
      off(roomRef);
      const [oid, op] = other;
      resolve(makeMatch(code, me.id, { id: oid, name: op.name, rating: op.rating, t: op.joinedAt }, r.startAt));
    });
  });
}

function makeMatch(code: string, myId: string, opponent: Player, startAt: number): Match {
  const { db } = cloud();
  const theirs = ref(db, `rooms/${code}/players/${opponent.id}`);
  const repCbs: ((n: number) => void)[] = [];
  const leftCbs: (() => void)[] = [];
  const unsub = onValue(theirs, (s) => {
    const p = s.val() as { reps?: number; left?: boolean } | null;
    if (!p || p.left) leftCbs.forEach((cb) => cb());
    else repCbs.forEach((cb) => cb(p.reps ?? 0));
  });
  return {
    matchId: code,
    opponent,
    startAt,
    sendReps: (n) => void set(ref(db, `rooms/${code}/players/${myId}/reps`), n).catch(() => {}),
    onReps: (cb) => void repCbs.push(cb),
    onLeft: (cb) => void leftCbs.push(cb),
    close: () => {
      unsub();
      update(ref(db, `rooms/${code}/players/${myId}`), { left: true }).catch(() => {});
    },
  };
}

/** Is anyone waiting in this exercise's queue right now? (for the lobby counter) */
export async function queueSize(exercise: ExerciseId): Promise<number> {
  if (!onlineConfigured) return 0;
  const s = await get(ref(cloud().db, `queue/${exercise}`));
  return s.exists() ? Object.keys(s.val()).length : 0;
}
