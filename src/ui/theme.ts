/** WeightRank look: near-black, chalk white, one loud lime accent. Red/green only for outcomes. */
export const C = {
  bg: "#0B0D10",
  surface: "#14171C",
  surface2: "#1C2027",
  line: "#272C35",
  text: "#F2F4F7",
  muted: "#8A93A0",
  faint: "#5A626E",
  accent: "#C8FF3D",
  accentInk: "#0B0D10",
  good: "#3DDC84",
  bad: "#FF4D5E",
  warn: "#FFB020",
};

export const R = { sm: 10, md: 16, lg: 24, pill: 999 };

export const F = {
  display: { fontSize: 44, fontWeight: "900" as const, letterSpacing: -1.5, color: C.text },
  h1: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.6, color: C.text },
  h2: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3, color: C.text },
  body: { fontSize: 15, fontWeight: "500" as const, color: C.text },
  small: { fontSize: 13, fontWeight: "600" as const, color: C.muted },
  label: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4, color: C.muted, textTransform: "uppercase" as const },
  number: { fontVariant: ["tabular-nums" as const] },
};
