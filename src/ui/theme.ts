/** WeightRank look: near-black, chalk white, one loud lime accent. Red/green only for outcomes. */
export const C = {
  bg: "#07080A",
  surface: "#121419",
  surface2: "#1A1D24",
  line: "#252A33",
  text: "#F4F6F8",
  muted: "#8C95A3",
  faint: "#555D69",
  accent: "#C8FF3D",
  accent2: "#8BEA1C",
  accentInk: "#07080A",
  good: "#3DDC84",
  bad: "#FF4D5E",
  warn: "#FFB020",
  violet: "#8B7CFF",
};

export const R = { sm: 10, md: 16, lg: 22, pill: 999 };

export const F = {
  display: { fontSize: 46, fontWeight: "900" as const, letterSpacing: -1.5, color: C.text, fontStyle: "italic" as const },
  h1: { fontSize: 30, fontWeight: "900" as const, letterSpacing: -0.8, color: C.text },
  h2: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3, color: C.text },
  body: { fontSize: 15, fontWeight: "600" as const, color: C.text },
  small: { fontSize: 13, fontWeight: "600" as const, color: C.muted },
  label: { fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.6, color: C.muted, textTransform: "uppercase" as const },
  number: { fontVariant: ["tabular-nums" as const] },
};
