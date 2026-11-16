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
 * Smooths every landmark coordinate with its own One Euro filter. Removes the
 * shimmer in raw pose output so form checks and the skeleton don't flicker,
 * while fast movement still comes through with little lag.
 */
export class LandmarkSmoother {
  private fs: OneEuroFilter[] = [];
  constructor(private minCutoff = 2, private beta = 0.05) {}
  reset() {
    this.fs = [];
  }
  smooth(values: number[], t: number): number[] {
    const out = new Array<number>(values.length);
    for (let i = 0; i < values.length; i++) {
      const f = this.fs[i] ?? (this.fs[i] = new OneEuroFilter(this.minCutoff, this.beta));
      out[i] = f.filter(values[i], t);
    }
    return out;
  }
}
