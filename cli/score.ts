// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface CardioInputs {
  vo2_max: number;
  zone2_pace_min_per_km: number; // decimal minutes, e.g. 8.383 for "8:23"
  resting_hr_bpm: number;
}

export interface StrengthInputs {
  fitbod_overall: number;
  bench_press_kg: number;
  deadlift_kg: number;
  leg_press_kg: number;
  pullup_reps: number;
  body_weight_kg: number; // used to compute ×BW ratios
}

export interface BodyCompInputs {
  body_fat_pct: number;
  weight_kg: number;
}

export interface ConsistencyInputs {
  sessions_per_week_avg: number;
  total_sessions_last_4_weeks: number;
  cardio_sessions_per_week_avg: number;
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
  contribution: number; // out of 40
}

export interface StrengthResult {
  fitbod_overall_score: number;
  bench_press_score: number;
  deadlift_score: number;
  leg_press_score: number;
  pullup_score: number;
  contribution: number; // out of 35
}

export interface BodyCompResult {
  body_fat_score: number;
  weight_vs_goal_score: number;
  contribution: number; // out of 25
}

export interface ConsistencyResult {
  sessions_per_week_score: number;
  total_sessions_4wk_score: number;
  cardio_sessions_score: number;
  score: number; // standalone 0–100, not part of composite
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
 * Cardio — 35% of composite score.
 *
 * Metrics:
 *   VO2 Max          floor 35  ceiling 60  higher better
 *   Zone 2 pace      floor 5.5 ceiling 9.0 lower better  (min/km)
 *   Resting HR       floor 38  ceiling 80  lower better  (bpm)
 *
 * contribution = avg(three scores) / 100 × 35
 */
export function calcCardio(inputs: CardioInputs): CardioResult {
  const vo2_max_score = round1(norm(inputs.vo2_max, 35, 60));
  const zone2_pace_score = round1(normInv(inputs.zone2_pace_min_per_km, 5.5, 9.0));
  const resting_hr_score = round1(normInv(inputs.resting_hr_bpm, 38, 80));

  const avg = (vo2_max_score + zone2_pace_score + resting_hr_score) / 3;
  const contribution = round1((avg / 100) * 35);

  return { vo2_max_score, zone2_pace_score, resting_hr_score, contribution };
}

/**
 * Strength — 40% of composite score.
 *
 * Metrics and weights within category:
 *   Fitbod Overall   floor 40  ceiling 90   30%  higher better
 *   Bench Press ×BW  floor 0.5 ceiling 1.5  20%  higher better
 *   Deadlift ×BW     floor 0.75 ceiling 2.0 20%  higher better
 *   Leg Press ×BW    floor 1.0 ceiling 3.0  15%  higher better
 *   Pull-ups (reps)  floor 0   ceiling 20   15%  higher better
 *
 * contribution = weighted_avg / 100 × 40
 */
export function calcStrength(inputs: StrengthInputs): StrengthResult {
  const bw = inputs.body_weight_kg;

  const fitbod_overall_score = round1(norm(inputs.fitbod_overall, 40, 90));
  const bench_press_score = round1(norm(inputs.bench_press_kg / bw, 0.5, 1.5));
  const deadlift_score = round1(norm(inputs.deadlift_kg / bw, 0.75, 2.0));
  const leg_press_score = round1(norm(inputs.leg_press_kg / bw, 1.0, 3.0));
  const pullup_score = round1(norm(inputs.pullup_reps, 0, 20));

  const weighted =
    fitbod_overall_score * 0.30 +
    bench_press_score    * 0.20 +
    deadlift_score       * 0.20 +
    leg_press_score      * 0.15 +
    pullup_score         * 0.15;

  const contribution = round1((weighted / 100) * 40);

  return {
    fitbod_overall_score,
    bench_press_score,
    deadlift_score,
    leg_press_score,
    pullup_score,
    contribution,
  };
}

/**
 * Body Composition — 25% of composite score.
 *
 * Metrics and weights within category:
 *   Body Fat %       floor 10%  ceiling 25%  60%  lower better
 *   Weight vs goal   floor 65kg ceiling 75kg  40%  higher better
 *
 * contribution = weighted_avg / 100 × 25
 */
export function calcBodyComp(inputs: BodyCompInputs): BodyCompResult {
  const body_fat_score = round1(normInv(inputs.body_fat_pct, 10, 25));
  const weight_vs_goal_score = round1(norm(inputs.weight_kg, 65, 75));

  const weighted = body_fat_score * 0.60 + weight_vs_goal_score * 0.40;
  const contribution = round1((weighted / 100) * 25);

  return { body_fat_score, weight_vs_goal_score, contribution };
}

/**
 * Consistency — standalone score (0–100), not part of the composite.
 *
 * Metrics and weights within category:
 *   Sessions/week (avg)        floor 0  ceiling 5   40%
 *   Total sessions last 4 wks  floor 0  ceiling 20  30%
 *   Cardio sessions/week       floor 0  ceiling 4   30%
 */
export function calcConsistency(inputs: ConsistencyInputs): ConsistencyResult {
  const sessions_per_week_score = round1(norm(inputs.sessions_per_week_avg, 0, 5));
  const total_sessions_4wk_score = round1(norm(inputs.total_sessions_last_4_weeks, 0, 20));
  const cardio_sessions_score = round1(norm(inputs.cardio_sessions_per_week_avg, 0, 4));

  const score = round1(
    sessions_per_week_score  * 0.40 +
    total_sessions_4wk_score * 0.30 +
    cardio_sessions_score    * 0.30,
  );

  return {
    sessions_per_week_score,
    total_sessions_4wk_score,
    cardio_sessions_score,
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
