import { ExerciseId } from "./exercises";

/**
 * Friend challenges that need no server: the challenge travels inside the link
 * (or a short code), the friend does the same 60-second round and tries to beat it.
 */

export type Challenge = { exercise: ExerciseId; reps: number; name: string };

const EX: ExerciseId[] = ["pushup", "squat", "dip", "pullup"];
// Crockford base32: no I, L, O, U so codes are easy to read aloud.
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function checksum(n: number): number {
  let h = 7;
  for (let i = 0; i < 4; i++) h = (h * 31 + ((n >> (i * 4)) & 0xf)) & 0x1f;
  return h;
}

/**
 * 4-character code: exercise (2 bits) + reps (8 bits) + nonce (5 bits) + checksum (5 bits).
 * Shown as "WR-XXXX". The name only travels in links.
 */
export function encodeCode(c: Pick<Challenge, "exercise" | "reps">, nonce = Math.floor(Math.random() * 32)): string {
  const ex = Math.max(0, EX.indexOf(c.exercise));
  const reps = Math.max(0, Math.min(255, Math.round(c.reps)));
  const body = (ex << 13) | (reps << 5) | (nonce & 0x1f); // 15 bits
  const n = (body << 5) | checksum(body); // 20 bits
  let out = "";
  for (let i = 3; i >= 0; i--) out += B32[(n >> (i * 5)) & 0x1f];
  return `WR-${out}`;
}

export function decodeCode(raw: string): Pick<Challenge, "exercise" | "reps"> | null {
  const s = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^WR/, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (s.length !== 4) return null;
  let n = 0;
  for (const ch of s) {
    const v = B32.indexOf(ch);
    if (v < 0) return null;
    n = (n << 5) | v;
  }
  const body = n >> 5;
  if (checksum(body) !== (n & 0x1f)) return null;
  const ex = EX[(body >> 13) & 0x3];
  const reps = (body >> 5) & 0xff;
  return { exercise: ex, reps };
}

/** Compact, URL-safe payload for links: "pushup.31.Alex". */
export function encodeLinkData(c: Challenge): string {
  const name = c.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 16);
  return `${c.exercise}.${Math.round(c.reps)}.${encodeURIComponent(name)}`;
}

export function decodeLinkData(d: string): Challenge | null {
  const [ex, reps, ...nameParts] = d.split(".");
  if (!EX.includes(ex as ExerciseId)) return null;
  const n = Number(reps);
  if (!Number.isInteger(n) || n < 0 || n > 255) return null;
  let name = "A friend";
  try {
    name = decodeURIComponent(nameParts.join(".")) || name;
  } catch {}
  return { exercise: ex as ExerciseId, reps: n, name: name.slice(0, 16) };
}

/**
 * Link to share. Uses the hosted web app when one is configured (opens anywhere,
 * including iPhones), otherwise the app's own weightrank:// link.
 */
export function challengeLink(c: Challenge, webUrl?: string): string {
  const d = encodeLinkData(c);
  return webUrl ? `${webUrl.replace(/\/$/, "")}/challenge?d=${d}` : `weightrank://challenge?d=${d}`;
}

/** Live duel room links, for playing a friend at the same time. */
export function roomLink(room: string, webUrl?: string): string {
  return webUrl ? `${webUrl.replace(/\/$/, "")}/room/${room}` : `weightrank://room/${room}`;
}

export function newRoomCode(r: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += B32[Math.floor(r() * 32)];
  return s;
}

/** Even pace for a friend's score: we only know their total, so spread it over the minute. */
export function ghostRepTimes(reps: number, seconds = 60): number[] {
  return Array.from({ length: reps }, (_, i) => ((i + 1) / (reps + 0.5)) * (seconds - 1));
}
