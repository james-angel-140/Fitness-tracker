import {
  calculateCompositeScore,
  parsePace,
  scoreLabel,
  type ScoreResult,
} from './score'

// ─── Raw JSON imports ─────────────────────────────────────────────────────────

import statsSnapshots from '@data/stats-snapshots.json'
import bodyWeightLog from '@data/body-weight-log.json'
import personalRecords from '@data/personal-records.json'
import compositeScores from '@data/composite-scores.json'
import sleepLogRaw from '@data/sleep-log.json'
// Vite glob imports — eager so all files are bundled synchronously
const workoutModules = import.meta.glob('@data/workouts/*.json', { eager: true })
const programModules = import.meta.glob('@data/programs/*.json', { eager: true })

// Pick the first (and only) active program file, whatever it's named
const programRaw: any = Object.values(programModules)[0] ?? { phases: [] }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatsSnapshot {
  date: string
  weight_kg: number
  body_fat_pct?: number
  vo2_max?: number
  resting_hr_bpm?: number
  pace_5k?: string | null
  pace_10k?: string | null
  fitbod?: { overall: number; push: number; pull: number; legs: number }
  notes?: string
}

export interface WeightEntry {
  date: string
  weight_kg: number
  change_kg?: number | null
  notes?: string
}

export interface LiftRecord {
  lift: string
  current_best_kg: number | null
  current_best_reps: number | string
  current_best_date: string | null
  notes?: string
  history: {
    date: string
    weight_kg: number
    reps: number | string
    estimated_1rm_kg?: number
    notes?: string
  }[]
}

export interface Workout {
  id: string
  date: string
  title?: string
  type: 'strength' | 'cardio' | 'hybrid' | 'walk'
  cardio_subtype?: string
  duration_min: number
  distance_km?: number
  avg_pace_per_km?: string
  avg_hr?: number
  calories?: number
  calories_active?: number
  calories_total?: number
  total_volume_kg?: number
  exercises?: { name: string; sets: { reps: number; weight_kg: number | null }[]; notes?: string }[]
  splits?: { km: number; type?: string; distance_km?: number; pace_per_km?: string; avg_hr?: number; notes?: string }[]
  notes?: string
  source?: string
  rpe?: number
  trimp?: number
}

export interface SleepEntry {
  date: string
  duration_hr: number
  sleep_hr?: number
  deep_hr?: number
  rem_hr?: number
  awake_hr?: number
  sleep_score?: number
  hrv_ms?: number
  resting_hr?: number
  respiratory_rate?: number
  notes?: string
  source: string
}

export interface TrainingLoadPoint {
  date: string
  trimp: number   // raw session load for that day
  atl: number     // acute training load: 7-day rolling average
  ctl: number     // chronic training load: 28-day rolling average
  acwr: number    // acute:chronic workload ratio (ATL / CTL)
}

export interface CompositeScoreEntry {
  date: string
  score: number
  categories: {
    cardio: number
    strength: number
    body_comp: number
    consistency: number
  }
  notes?: string
}

// ─── Processed data ───────────────────────────────────────────────────────────

export const sleepLog = (sleepLogRaw as { entries: SleepEntry[] }).entries
export const stats = statsSnapshots as StatsSnapshot[]
export const weightLog = bodyWeightLog as {
  goal_weight_kg: number
  starting_weight_kg: number
  entries: WeightEntry[]
}
export const prs = personalRecords as LiftRecord[]
export const scoreHistory = compositeScores as CompositeScoreEntry[]

export const workouts: Workout[] = Object.values(workoutModules)
  .map((m) => (m as { default: Workout }).default)
  .sort((a, b) => a.date.localeCompare(b.date))

// ─── Derived values ───────────────────────────────────────────────────────────

export const latestStats = stats.at(-1)!
export const latestWeight = weightLog.entries.at(-1)!

/** Scan backwards through stats snapshots to find the most recent non-null value for a field. */
function latestMetric<K extends keyof StatsSnapshot>(key: K): StatsSnapshot[K] | undefined {
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i][key] != null) return stats[i][key]
  }
  return undefined
}

export const latestVo2 = latestMetric('vo2_max')
export const latestRhr = latestMetric('resting_hr_bpm')
export const latestBodyFat = latestMetric('body_fat_pct')
export const latestFitbod = latestMetric('fitbod')

export const latestZone2Run = workouts
  .filter((w) => w.cardio_subtype === 'zone2-run' && w.avg_pace_per_km)
  .at(-1)

// Consistency windows
const today = new Date('2026-04-12') // matches CLAUDE.md currentDate
const sevenDaysAgo = new Date(today)
sevenDaysAgo.setDate(today.getDate() - 7)
const twentyEightDaysAgo = new Date(today)
twentyEightDaysAgo.setDate(today.getDate() - 28)

const cardioTypes = new Set(['cardio', 'walk'])
const strengthTypes = new Set(['strength', 'hybrid'])

const workouts28d = workouts.filter((w) => new Date(w.date) >= twentyEightDaysAgo)
const workouts7d  = workouts.filter((w) => new Date(w.date) >= sevenDaysAgo)

export const cardio_sessions_7d    = workouts7d.filter((w) => cardioTypes.has(w.type)).length
export const strength_sessions_7d  = workouts7d.filter((w) => strengthTypes.has(w.type)).length
export const cardio_sessions_28d   = workouts28d.filter((w) => cardioTypes.has(w.type)).length
export const strength_sessions_28d = workouts28d.filter((w) => strengthTypes.has(w.type)).length

function findPR(lift: string): LiftRecord {
  const r = prs.find((p) => p.lift === lift)
  if (!r) throw new Error(`No PR for "${lift}"`)
  return r
}

const benchPR = findPR('Barbell Bench Press')
const deadliftPR = findPR('Deadlift')
const legPressPR = findPR('Leg Press')
const pullupPR = findPR('Pull-up')

const zone2PaceDecimal = latestZone2Run?.avg_pace_per_km
  ? parsePace(latestZone2Run.avg_pace_per_km)
  : 8.0

// Weight trend: merge stats snapshots + daily weigh-in entries, deduplicate by date
const weightByDate = new Map<string, number>()
stats.forEach((s) => weightByDate.set(s.date, s.weight_kg))
weightLog.entries.forEach((e) => weightByDate.set(e.date, e.weight_kg))

export const weightTrend = Array.from(weightByDate.entries())
  .map(([date, weight_kg]) => ({ date, value: weight_kg }))
  .sort((a, b) => a.date.localeCompare(b.date))

// 7-day rolling average weight — smoother signal for score calculation
export const weightTrendWithAvg: { date: string; value: number; avg7?: number }[] =
  weightTrend.map((point, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1)
    const avg7 = Math.round((window.reduce((s, p) => s + p.value, 0) / window.length) * 10) / 10
    return { ...point, avg7 }
  })

// Latest 7-day average weight (used in score calculation for stability)
export const latestWeightAvg7 =
  weightTrendWithAvg.at(-1)?.avg7 ?? latestWeight.weight_kg

export const scoreInputs = {
  cardio: {
    vo2_max: latestStats.vo2_max ?? 40,
    zone2_pace_min_per_km: zone2PaceDecimal,
    resting_hr_bpm: latestStats.resting_hr_bpm ?? 55,
  },
  strength: {
    fitbod_overall: latestStats.fitbod?.overall ?? 50,
    bench_press_kg: benchPR.current_best_kg ?? 60,
    deadlift_kg: deadliftPR.current_best_kg ?? 70,
    leg_press_kg: legPressPR.current_best_kg ?? 100,
    pullup_reps: Number(pullupPR.current_best_reps),
    body_weight_kg: latestWeightAvg7,
  },
  body_comp: {
    body_fat_pct: latestStats.body_fat_pct ?? 15,
    weight_kg: latestWeightAvg7,
  },
  consistency: {
    cardio_sessions_7d,
    strength_sessions_7d,
    cardio_sessions_28d,
    strength_sessions_28d,
  },
}

export const currentScore: ScoreResult = calculateCompositeScore(scoreInputs)
export const currentScoreLabel = scoreLabel(currentScore.score)

// VO2 / RHR trend from stats snapshots
export const vo2Trend = stats
  .filter((s) => s.vo2_max != null)
  .map((s) => ({ date: s.date, value: s.vo2_max! }))

export const rhrTrend = stats
  .filter((s) => s.resting_hr_bpm != null)
  .map((s) => ({ date: s.date, value: s.resting_hr_bpm! }))

// Body fat trend with 7-day rolling average
const bfPoints = stats
  .filter((s) => s.body_fat_pct != null)
  .map((s) => ({ date: s.date, value: s.body_fat_pct! }))

export const bodyFatTrend: { date: string; value: number; avg7?: number }[] =
  bfPoints.map((point, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1)
    const avg7 = Math.round((window.reduce((s, p) => s + p.value, 0) / window.length) * 10) / 10
    return { ...point, avg7 }
  })

// ─── Training Load (TRIMP-based) ──────────────────────────────────────────────
// TRIMP = duration_min × rpe (if rpe absent, estimate from workout type)
// ATL = 7-day rolling average daily TRIMP
// CTL = 28-day rolling average daily TRIMP
// ACWR = ATL / CTL  (>1.3 = elevated injury risk; <0.8 = detraining)

function estimateRpe(w: Workout): number {
  if (w.rpe != null) return w.rpe
  if (w.type === 'walk') return 3
  if (w.cardio_subtype === 'zone2-run') return 4
  if (w.cardio_subtype === 'hiit') return 8
  if (w.cardio_subtype === 'run') return 7
  if (w.cardio_subtype === 'stationary-bike') return 5
  if (w.type === 'strength') return 6
  if (w.type === 'cardio') return 6
  return 5
}

function rollingAvg(trimpByDate: Map<string, number>, endDate: string, days: number): number {
  let sum = 0
  const end = new Date(endDate)
  for (let i = 0; i < days; i++) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    sum += trimpByDate.get(d.toISOString().slice(0, 10)) ?? 0
  }
  return sum / days
}

// Build a map of date → daily TRIMP (sum if multiple sessions in one day)
const trimpByDate = new Map<string, number>()
for (const w of workouts) {
  const t = w.trimp != null ? w.trimp
    : w.duration_min != null ? w.duration_min * estimateRpe(w)
    : null
  if (t != null) {
    trimpByDate.set(w.date, (trimpByDate.get(w.date) ?? 0) + t)
  }
}

// Emit one data point per workout date so the chart is sparse (not every calendar day)
const workoutDates = Array.from(new Set(workouts.map((w) => w.date))).sort()

// ─── Program / upcoming sessions ─────────────────────────────────────────────

export interface ProgramDay {
  day_of_week: string
  date: string
  focus: string
  session: string
  phase: string
}

const TODAY_STR = new Date().toISOString().slice(0, 10)

export const upcomingSessions: ProgramDay[] = (programRaw as any).phases
  .flatMap((phase: any) =>
    (phase.days ?? []).map((d: any) => ({ ...d, phase: phase.name }))
  )
  .filter((d: any) => d.date >= TODAY_STR)
  .slice(0, 3)

export const trainingLoad: TrainingLoadPoint[] = workoutDates.map((date) => {
  const atl = rollingAvg(trimpByDate, date, 7)
  const ctl = rollingAvg(trimpByDate, date, 28)
  return {
    date,
    trimp: trimpByDate.get(date) ?? 0,
    atl: Math.round(atl * 10) / 10,
    ctl: Math.round(ctl * 10) / 10,
    acwr: ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0,
  }
})
