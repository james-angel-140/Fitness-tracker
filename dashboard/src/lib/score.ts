// Re-export score logic for use in the dashboard.
// Identical to cli/score.ts — shared via copy to keep the dashboard
// self-contained (no workspace cross-dependency needed).

export interface CardioInputs {
  vo2_max: number
  zone2_pace_min_per_km: number
  resting_hr_bpm: number
}

export interface StrengthInputs {
  fitbod_overall: number
  bench_press_kg: number
  deadlift_kg: number
  leg_press_kg: number
  pullup_reps: number
  body_weight_kg: number
}

export interface BodyCompInputs {
  body_fat_pct: number
  weight_kg: number
}

export interface ConsistencyInputs {
  sessions_per_week_avg: number
  total_sessions_last_4_weeks: number
  cardio_sessions_per_week_avg: number
}

export interface ScoreInputs {
  cardio: CardioInputs
  strength: StrengthInputs
  body_comp: BodyCompInputs
  consistency: ConsistencyInputs
}

export interface CardioResult {
  vo2_max_score: number
  zone2_pace_score: number
  resting_hr_score: number
  contribution: number // out of 40
}

export interface StrengthResult {
  fitbod_overall_score: number
  bench_press_score: number
  deadlift_score: number
  leg_press_score: number
  pullup_score: number
  contribution: number // out of 35
}

export interface BodyCompResult {
  body_fat_score: number
  weight_vs_goal_score: number
  contribution: number // out of 25
}

export interface ConsistencyResult {
  sessions_per_week_score: number
  total_sessions_4wk_score: number
  cardio_sessions_score: number
  score: number // standalone 0–100, not part of composite
}

export interface ScoreResult {
  score: number
  cardio: CardioResult
  strength: StrengthResult
  body_comp: BodyCompResult
  consistency: ConsistencyResult
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
function norm(v: number, floor: number, ceiling: number) {
  return clamp(((v - floor) / (ceiling - floor)) * 100, 0, 100)
}
function normInv(v: number, floor: number, ceiling: number) {
  return 100 - norm(v, floor, ceiling)
}
function r1(n: number) {
  return Math.round(n * 10) / 10
}

export function parsePace(pace: string): number {
  const [mins, secs] = pace.split(':').map(Number)
  return mins + secs / 60
}

export function scoreLabel(score: number): string {
  if (score < 30) return 'Beginner'
  if (score < 50) return 'Building'
  if (score < 65) return 'Solid'
  if (score < 75) return 'Strong'
  if (score < 85) return 'High Performance'
  return 'Elite'
}

export function scoreLabelColor(score: number): string {
  if (score < 30) return 'text-red-400'
  if (score < 50) return 'text-amber-400'
  if (score < 65) return 'text-yellow-400'
  if (score < 75) return 'text-lime-400'
  if (score < 85) return 'text-emerald-400'
  return 'text-cyan-400'
}

export function calcCardio(inputs: CardioInputs): CardioResult {
  const vo2_max_score = r1(norm(inputs.vo2_max, 35, 60))
  const zone2_pace_score = r1(normInv(inputs.zone2_pace_min_per_km, 5.5, 9.0))
  const resting_hr_score = r1(normInv(inputs.resting_hr_bpm, 38, 80))
  const avg = (vo2_max_score + zone2_pace_score + resting_hr_score) / 3
  return { vo2_max_score, zone2_pace_score, resting_hr_score, contribution: r1((avg / 100) * 35) }
}

export function calcStrength(inputs: StrengthInputs): StrengthResult {
  const bw = inputs.body_weight_kg
  const fitbod_overall_score = r1(norm(inputs.fitbod_overall, 40, 90))
  const bench_press_score = r1(norm(inputs.bench_press_kg / bw, 0.5, 1.5))
  const deadlift_score = r1(norm(inputs.deadlift_kg / bw, 0.75, 2.0))
  const leg_press_score = r1(norm(inputs.leg_press_kg / bw, 1.0, 3.0))
  const pullup_score = r1(norm(inputs.pullup_reps, 0, 20))
  const weighted =
    fitbod_overall_score * 0.3 +
    bench_press_score * 0.2 +
    deadlift_score * 0.2 +
    leg_press_score * 0.15 +
    pullup_score * 0.15
  return {
    fitbod_overall_score,
    bench_press_score,
    deadlift_score,
    leg_press_score,
    pullup_score,
    contribution: r1((weighted / 100) * 40),
  }
}

export function calcBodyComp(inputs: BodyCompInputs): BodyCompResult {
  const body_fat_score = r1(normInv(inputs.body_fat_pct, 10, 25))
  const weight_vs_goal_score = r1(norm(inputs.weight_kg, 65, 75))
  const weighted = body_fat_score * 0.6 + weight_vs_goal_score * 0.4
  return { body_fat_score, weight_vs_goal_score, contribution: r1((weighted / 100) * 25) }
}

export function calcConsistency(inputs: ConsistencyInputs): ConsistencyResult {
  const sessions_per_week_score = r1(norm(inputs.sessions_per_week_avg, 0, 5))
  const total_sessions_4wk_score = r1(norm(inputs.total_sessions_last_4_weeks, 0, 20))
  const cardio_sessions_score = r1(norm(inputs.cardio_sessions_per_week_avg, 0, 4))
  const score = r1(
    sessions_per_week_score * 0.4 +
    total_sessions_4wk_score * 0.3 +
    cardio_sessions_score * 0.3
  )
  return {
    sessions_per_week_score,
    total_sessions_4wk_score,
    cardio_sessions_score,
    score,
  }
}

export function calculateCompositeScore(inputs: ScoreInputs): ScoreResult {
  const cardio = calcCardio(inputs.cardio)
  const strength = calcStrength(inputs.strength)
  const body_comp = calcBodyComp(inputs.body_comp)
  const consistency = calcConsistency(inputs.consistency)
  const score = r1(
    cardio.contribution +
    strength.contribution +
    body_comp.contribution,
  )
  return { score, cardio, strength, body_comp, consistency }
}
