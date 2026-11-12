import Constants from "expo-constants";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ExerciseId } from "@/domain/exercises";

/**
 * Live 1v1 duels over Supabase Realtime (presence + broadcast). No tables, no
 * stored video: players see each other in a queue channel, pair up, then send
 * rep counts on a private match channel. Off until a Supabase URL and
 * publishable (anon) key are set in app.json `extra` (see SETUP.md).
 */

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const URL = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const KEY = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const onlineConfigured = !!(URL && KEY);

let client: SupabaseClient | null = null;
async function sb(): Promise<SupabaseClient> {
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(URL, KEY, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } });
  }
  return client;
}

export type Player = { id: string; name: string; rating: number; t: number };

export type Match = {
  matchId: string;
  opponent: Player;
  /** Shared start time (ms since epoch) both phones count down to. */
  startAt: number;
  sendReps(n: number): void;
  onReps(cb: (n: number) => void): void;
  onLeft(cb: () => void): void;
  close(): void;
};

export type FindOpts = {
  me: Player;
  exercise: ExerciseId;
  /** Set to play one specific friend: both phones join the same room. */
  room?: string;
  signal: AbortSignal;
};

/** Deterministic pairing everyone in the queue agrees on: oldest first, in twos. */
export function pairFor(members: Player[], myId: string): Player | null {
  const sorted = [...members].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  const i = sorted.findIndex((m) => m.id === myId);
  if (i < 0) return null;
  const j = i % 2 === 0 ? i + 1 : i - 1;
  return sorted[j] ?? null;
}

export async function findMatch({ me, exercise, room, signal }: FindOpts): Promise<Match | null> {
  if (!onlineConfigured) return null;
  const supa = await sb();
  const topic = room ? `wr-room-${room}` : `wr-queue-${exercise}`;
  const queue = supa.channel(topic, { config: { presence: { key: me.id }, broadcast: { self: false } } });

  return new Promise<Match | null>((resolve) => {
    let done = false;
    const finish = (m: Match | null) => {
      if (done) return;
      done = true;
      queue.untrack().catch(() => {});
      supa.removeChannel(queue).catch(() => {});
      resolve(m);
    };
    signal.addEventListener("abort", () => finish(null));

    const members = (): Player[] =>
      Object.values(queue.presenceState<Player>()).map((list) => list[0]).filter(Boolean) as Player[];

    const tryPair = () => {
      const partner = pairFor(members(), me.id);
      // The lower id hosts: it picks the match id and start time.
      if (partner && me.id < partner.id) {
        const matchId = `${me.id}-${partner.id}`;
        const startAt = Date.now() + 6000;
        queue.send({ type: "broadcast", event: "invite", payload: { to: partner.id, from: me, matchId, startAt } });
      }
    };

    queue
      .on("presence", { event: "sync" }, tryPair)
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        if (payload.to !== me.id) return;
        const partner = pairFor(members(), me.id);
        if (partner && partner.id !== payload.from.id) return; // not who we'd pair with
        queue.send({ type: "broadcast", event: "accept", payload: { to: payload.from.id, from: me, matchId: payload.matchId } });
        openMatch(supa, payload.matchId, payload.from, payload.startAt).then(finish);
      })
      .on("broadcast", { event: "accept" }, ({ payload }) => {
        if (payload.to !== me.id) return;
        const [a] = String(payload.matchId).split("-");
        if (a !== me.id) return;
        // Host: use the start time it proposed (encoded in its own invite); resend for safety.
        openMatch(supa, payload.matchId, payload.from, Date.now() + 5000, true).then(finish);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await queue.track(me);
      });
  });
}

async function openMatch(supa: SupabaseClient, matchId: string, opponent: Player, startAt: number, host = false): Promise<Match> {
  const ch: RealtimeChannel = supa.channel(`wr-match-${matchId}`, { config: { broadcast: { self: false } } });
  const repCbs: ((n: number) => void)[] = [];
  const leftCbs: (() => void)[] = [];
  let start = startAt;
  ch.on("broadcast", { event: "reps" }, ({ payload }) => repCbs.forEach((cb) => cb(Number(payload.n) || 0)))
    .on("broadcast", { event: "start" }, ({ payload }) => {
      if (!host) start = Number(payload.startAt) || start;
    })
    .on("broadcast", { event: "bye" }, () => leftCbs.forEach((cb) => cb()));
  await new Promise<void>((res) => ch.subscribe((s) => s === "SUBSCRIBED" && res()));
  if (host) {
    // Repeat the start time until the round begins, in case the guest joined late.
    const send = () => ch.send({ type: "broadcast", event: "start", payload: { startAt } }).catch(() => {});
    send();
    const timer = setInterval(() => (Date.now() > startAt ? clearInterval(timer) : send()), 700);
  }
  // Give the guest a moment to hear the host's start time.
  if (!host) await new Promise((r) => setTimeout(r, 400));
  return {
    matchId,
    opponent,
    get startAt() {
      return start;
    },
    sendReps: (n) => void ch.send({ type: "broadcast", event: "reps", payload: { n } }),
    onReps: (cb) => void repCbs.push(cb),
    onLeft: (cb) => void leftCbs.push(cb),
    close: () => {
      ch.send({ type: "broadcast", event: "bye", payload: {} }).catch(() => {});
      supa.removeChannel(ch).catch(() => {});
    },
  };
}
