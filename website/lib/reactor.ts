/** Exponential midpoint solver with illustrative effective coefficients. */
export type Conditions = {
  inlet: number;
  jacket: number;
  flow: number;
  length: number;
  concentration: number;
};
export const DEFAULT_CONDITIONS: Conditions = {
  inlet: 420,
  jacket: 420,
  flow: 1,
  length: 2,
  concentration: 1,
};
export const ILLUSTRATIVE_PARAMETERS = [
  Math.log(2),
  Math.log(0.35),
  3500,
  7000,
  1.2,
  -2,
  3,
];
const clip = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const decay = (x: number) => Math.exp(-clip(x, 0, 700));
function phi(b: number, step: number) {
  const x = clip(b * step, 0, 700);
  return x < 1e-10 ? step : (step * -Math.expm1(-x)) / x;
}
export function simulateYield(c: Conditions, p = ILLUSTRATIVE_PARAMETERS) {
  if (
    !Object.values(c).every(Number.isFinite) ||
    c.inlet <= 0 ||
    c.jacket <= 0 ||
    c.flow <= 0 ||
    c.concentration <= 0 ||
    c.length < 0
  )
    throw new Error(
      'Temperatures, flow, and concentration must be positive; length must be nonnegative.',
    );
  const [ln1, ln2, e1, e2, h, beta1, beta2] = p;
  const tau = c.length / c.flow,
    ds = 1 / 160,
    hm = ds / 2;
  const dt1 = beta1 * c.concentration,
    dt2 = beta2 * c.concentration;
  const rates = (temperature: number) => {
    const inv = 1 / temperature - 1 / 425;
    return [
      tau * Math.exp(clip(ln1 - e1 * inv, -700, 700)),
      tau * Math.exp(clip(ln2 - e2 * inv, -700, 700)),
    ];
  };
  let aFraction = 1,
    bFraction = 0,
    temperature = c.inlet;
  for (let step = 0; step < 160; step++) {
    let [a, b] = rates(temperature);
    let r1 = a * aFraction,
      r2 = b * bFraction;
    const aMid = aFraction * decay(a * hm);
    const bMid = bFraction * decay(b * hm) + r1 * phi(b, hm);
    const tMid =
      c.jacket +
      (temperature - c.jacket) * decay(h * tau * hm) +
      (dt1 * r1 + dt2 * r2) * hm;
    [a, b] = rates(tMid);
    r1 = a * aMid;
    r2 = b * bMid;
    const aNext = aFraction * decay(a * ds);
    bFraction = bFraction * decay(b * ds) + r1 * phi(b, ds);
    temperature =
      c.jacket +
      (temperature - c.jacket) * decay(h * tau * ds) +
      (dt1 * r1 + dt2 * r2) * ds;
    aFraction = clip(aNext, 0, 1);
    bFraction = clip(bFraction, 0, 1);
  }
  return clip(bFraction, 0, 1) * 100;
}
export function operatingCurve(c: Conditions) {
  return Array.from({ length: 81 }, (_, index) => {
    const length = index / 20;
    return { length, yield: simulateYield({ ...c, length }) };
  });
}
