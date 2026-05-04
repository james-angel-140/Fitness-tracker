// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface CardioInputs {
  vo2_max: number;
  zone2_pace_min_per_km: number; // decimal minutes, e.g. 8.383 for "8:23"
  resting_hr_bpm: number;
}

export interface StrengthInputs {
  bench_press_kg: number;
  deadlift_kg: number;
  squat_kg: number;
  leg_press_kg: number;
  pullup_reps: number;
  body_weight_kg: number; // used to compute ×BW ratios
}

export interface BodyCompInputs {
  body_fat_pct: number;
  weight_kg: number;
}

export interface ConsistencyInputs {
  cardio_sessions_7d: number;
  strength_sessions_7d: number;
  cardio_sessions_28d: number;
  strength_sessions_28d: number;
}

export interface ScoreInputs {
  cardio: CardioInputs;
  strength: StrengthInputs;
  body_comp: BodyCompInputs;
  consistency: ConsistencyInputs;
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

export interface CardioResult {
  vo2_max_score: number;
  zone2_pace_score: number;
  resting_hr_score: number;
  contribution: number; // out of 15
}

export interface StrengthResult {
  bench_press_score: number;
  deadlift_score: number;
  squat_score: number;
  leg_press_score: number;
  pullup_score: number;
  contribution: number; // out of 40
}

export interface BodyCompResult {
  body_fat_score: number;
  weight_vs_goal_score: number;
  contribution: number; // out of 35
}

export interface ConsistencyResult {
  // Short-term (7d) sub-scores 0–100
  cardio_7d_score: number;
  strength_7d_score: number;
  short_term_score: number; // avg of above
  // Long-term (28d) sub-scores 0–100
  cardio_28d_score: number;
  strength_28d_score: number;
  long_term_score: number;  // avg of above
  score: number; // standalone 0–100: short 40% + long 60%
}

export interface ScoreResult {
  score: number;
  cardio: CardioResult;
  strength: StrengthResult;
  body_comp: BodyCompResult;
  consistency: ConsistencyResult;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normalise a value to 0–100. Higher = better. */
function norm(value: number, floor: number, ceiling: number): number {
  return clamp(((value - floor) / (ceiling - floor)) * 100, 0, 100);
}

/** Normalise a value to 0–100. Lower = better (inverted). */
function normInv(value: number, floor: number, ceiling: number): number {
  return 100 - norm(value, floor, ceiling);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Category calculators ────────────────────────────────────────────────────

/**
 * Cardio — 15% of composite score.
 *
 * Metrics:
 *   VO2 Max          floor 35  ceiling 60  higher better
 *   Zone 2 pace      floor 5.5 ceiling 9.0 lower better  (min/km)
 *   Resting HR       floor 38  ceiling 80  lower better  (bpm)
 *
 * contribution = avg(three scores) / 100 × 15
 */
export function calcCardio(inputs: CardioInputs): CardioResult {
  const vo2_max_score = round1(norm(inputs.vo2_max, 35, 60));
  const zone2_pace_score = round1(normInv(inputs.zone2_pace_min_per_km, 5.5, 9.0));
  const resting_hr_score = round1(normInv(inputs.resting_hr_bpm, 38, 80));

  const avg = (vo2_max_score + zone2_pace_score + resting_hr_score) / 3;
  const contribution = round1((avg / 100) * 15);

  return { vo2_max_score, zone2_pace_score, resting_hr_score, contribution };
}

/**
 * Strength — 40% of composite score. Primary focus for lean mass goals.
 *
 * Metrics and weights within category:
 *   Bench Press ×BW  floor 0.5 ceiling 1.5  25%  higher better
 *   Deadlift ×BW     floor 0.75 ceiling 2.0 25%  higher better
 *   Back Squat ×BW   floor 0.5 ceiling 1.75 20%  higher better
 *   Leg Press ×BW    floor 1.0 ceiling 3.0  15%  higher better
 *   Pull-ups (reps)  floor 0   ceiling 20   15%  higher better
 *
 * contribution = weighted_avg / 100 × 40
 */
export function calcStrength(inputs: StrengthInputs): StrengthResult {
  const bw = inputs.body_weight_kg;

  const bench_press_score = round1(norm(inputs.bench_press_kg / bw, 0.5, 1.5));
  const deadlift_score = round1(norm(inputs.deadlift_kg / bw, 0.75, 2.0));
  const squat_score = round1(norm(inputs.squat_kg / bw, 0.5, 1.75));
  const leg_press_score = round1(norm(inputs.leg_press_kg / bw, 1.0, 3.0));
  const pullup_score = round1(norm(inputs.pullup_reps, 0, 20));

  const weighted =
    bench_press_score * 0.25 +
    deadlift_score    * 0.25 +
    squat_score       * 0.20 +
    leg_press_score   * 0.15 +
    pullup_score      * 0.15;

  const contribution = round1((weighted / 100) * 40);

  return {
    bench_press_score,
    deadlift_score,
    squat_score,
    leg_press_score,
    pullup_score,
    contribution,
  };
}

/**
 * Body Composition — 35% of composite score. Reflects lean mass / recomp goal.
 *
 * Metrics and weights within category:
 *   Body Fat %       floor 8%   ceiling 22%  70%  lower better
 *   Weight vs goal   floor 75kg ceiling 90kg  30%  higher better (lean mass gain)
 *
 * contribution = weighted_avg / 100 × 35
 */
export function calcBodyComp(inputs: BodyCompInputs): BodyCompResult {
  const body_fat_score = round1(normInv(inputs.body_fat_pct, 8, 22));
  const weight_vs_goal_score = round1(norm(inputs.weight_kg, 75, 90));

  const weighted = body_fat_score * 0.70 + weight_vs_goal_score * 0.30;
  const contribution = round1((weighted / 100) * 35);

  return { body_fat_score, weight_vs_goal_score, contribution };
}

/**
 * Consistency — standalone score (0–100), not part of the composite.
 *
 * Short-term (last 7 days) — weight 40%:
 *   Cardio sessions   ceiling 2   50% of short-term
 *   Strength sessions ceiling 2   50% of short-term
 *
 * Long-term (last 28 days) — weight 60%:
 *   Cardio sessions   ceiling 8   50% of long-term
 *   Strength sessions ceiling 8   50% of long-term
 */
export function calcConsistency(inputs: ConsistencyInputs): ConsistencyResult {
  const cardio_7d_score    = round1(norm(inputs.cardio_sessions_7d,   0, 2));
  const strength_7d_score  = round1(norm(inputs.strength_sessions_7d, 0, 2));
  const short_term_score   = round1((cardio_7d_score + strength_7d_score) / 2);

  const cardio_28d_score   = round1(norm(inputs.cardio_sessions_28d,   0, 8));
  const strength_28d_score = round1(norm(inputs.strength_sessions_28d, 0, 8));
  const long_term_score    = round1((cardio_28d_score + strength_28d_score) / 2);

  const score = round1(short_term_score * 0.40 + long_term_score * 0.60);

  return {
    cardio_7d_score,
    strength_7d_score,
    short_term_score,
    cardio_28d_score,
    strength_28d_score,
    long_term_score,
    score,
  };
}

/** Top-level: run all categories. Composite score = cardio + strength + body_comp (max 100). Consistency is separate. */
export function calculateCompositeScore(inputs: ScoreInputs): ScoreResult {
  const cardio = calcCardio(inputs.cardio);
  const strength = calcStrength(inputs.strength);
  const body_comp = calcBodyComp(inputs.body_comp);
  const consistency = calcConsistency(inputs.consistency);

  const score = round1(
    cardio.contribution +
    strength.contribution +
    body_comp.contribution,
  );

  return { score, cardio, strength, body_comp, consistency };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Parse "8:23" pace string → decimal minutes (8.383...) */
export function parsePace(pace: string): number {
  const [mins, secs] = pace.split(':').map(Number);
  return mins + secs / 60;
}

/** Map a score to its qualitative label. */
export function scoreLabel(score: number): string {
  if (score < 30) return 'Beginner';
  if (score < 50) return 'Building';
  if (score < 65) return 'Solid';
  if (score < 75) return 'Strong';
  if (score < 85) return 'High Performance';
  return 'Elite';
}
