/**
 * One Euro filter: smooths jitter when a joint is still, follows fast moves with
 * little lag. Works on real timestamps, so a late or dropped frame does not
 * distort the signal the way a fixed-step moving average would.
 * Reference: Casiez, Roussel, Vogel (CHI 2012).
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  /** @param t timestamp in ms */
  filter(x: number, t: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }
    // Clamp dt: a long gap (frames dropped) should not freeze the filter.
    const dt = Math.min(Math.max((t - this.tPrev) / 1000, 1 / 120), 0.5);
    this.tPrev = t;
    const dx = (x - this.xPrev) / dt;
    const aD = alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}

function alpha(cutoff: number, dt: number) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/**
 * Estimate the true turning point of a rep from the three samples around it.
 * If frames around the bottom were dropped, the lowest sample we saw may be
 * shallower than the real bottom. A parabola through (t0,a0),(t1,a1),(t2,a2)
 * gives the vertex. Returns null if the fit is not a valid minimum.
 */
export function parabolicMin(
  t0: number, a0: number,
  t1: number, a1: number,
  t2: number, a2: number,
): { t: number; a: number } | null {
  const d = (t0 - t1) * (t0 - t2) * (t1 - t2);
  if (d === 0) return null;
  const A = (t2 * (a1 - a0) + t1 * (a0 - a2) + t0 * (a2 - a1)) / d;
  const B = (t2 * t2 * (a0 - a1) + t1 * t1 * (a2 - a0) + t0 * t0 * (a1 - a2)) / d;
  if (A <= 0) return null; // not a minimum
  const tv = -B / (2 * A);
  if (tv < t0 || tv > t2) return null; // vertex outside the window
  const C = a0 - A * t0 * t0 - B * t0;
  return { t: tv, a: A * tv * tv + B * tv + C };
}
