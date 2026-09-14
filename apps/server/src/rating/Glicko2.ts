export interface GlickoRating {
  rating: number;
  rd: number;
  volatility: number;
}

const SCALE = 173.7178;
const TAU = 0.5;
const EPSILON = 0.000001;
const MAX_RD = 350;
const RATING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export function inflateRdForInactivity(
  player: GlickoRating,
  elapsedMs: number,
  ratingPeriodMs = RATING_PERIOD_MS,
): GlickoRating {
  validate(player);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('elapsed time must be non-negative');
  if (!Number.isFinite(ratingPeriodMs) || ratingPeriodMs <= 0) throw new Error('rating period must be positive');

  const periods = Math.floor(elapsedMs / ratingPeriodMs);
  if (periods === 0) return { ...player };
  const phi = player.rd / SCALE;
  const volatility = player.volatility;
  return {
    ...player,
    rd: Math.min(MAX_RD, Math.hypot(phi, Math.sqrt(periods) * volatility) * SCALE),
  };
}

export function updateGlicko2(
  player: GlickoRating,
  opponent: GlickoRating,
  score: number,
): GlickoRating {
  validate(player);
  validate(opponent);
  if (score !== 0 && score !== 0.5 && score !== 1) throw new Error('score must be 0, 0.5 or 1');

  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const opponentMu = (opponent.rating - 1500) / SCALE;
  const opponentPhi = opponent.rd / SCALE;
  const g = 1 / Math.sqrt(1 + (3 * opponentPhi ** 2) / Math.PI ** 2);
  const expected = 1 / (1 + Math.exp(-g * (mu - opponentMu)));
  const variance = 1 / (g ** 2 * expected * (1 - expected));
  const delta = variance * g * (score - expected);
  const volatility = solveVolatility(player.volatility, phi, delta, variance);
  const phiStar = Math.hypot(phi, volatility);
  const newPhi = 1 / Math.sqrt(1 / phiStar ** 2 + 1 / variance);
  const newMu = mu + newPhi ** 2 * g * (score - expected);

  return {
    rating: newMu * SCALE + 1500,
    rd: newPhi * SCALE,
    volatility,
  };
}

function solveVolatility(current: number, phi: number, delta: number, variance: number): number {
  const a = Math.log(current ** 2);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const denominator = 2 * (phi ** 2 + variance + ex) ** 2;
    return (ex * (delta ** 2 - phi ** 2 - variance - ex)) / denominator - (x - a) / TAU ** 2;
  };

  let A = a;
  let B: number;
  if (delta ** 2 > phi ** 2 + variance) {
    B = Math.log(delta ** 2 - phi ** 2 - variance);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k += 1;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  return Math.exp(A / 2);
}

function validate(value: GlickoRating): void {
  if (![value.rating, value.rd, value.volatility].every(Number.isFinite)) {
    throw new Error('rating values must be finite');
  }
  if (value.rd <= 0 || value.volatility <= 0)
    throw new Error('rating deviation and volatility must be positive');
}
