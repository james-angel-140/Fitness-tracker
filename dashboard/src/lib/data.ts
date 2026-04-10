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

// Vite glob import — eager so all workouts are bundled synchronously
const workoutModules = import.meta.glob('@data/workouts/*.json', { eager: true })

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
  notes?: string
  source?: string
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

export const latestZone2Run = workouts
  .filter((w) => w.cardio_subtype === 'zone2-run' && w.avg_pace_per_km)
  .at(-1)

// 4-week consistency window
const today = new Date('2026-04-10') // matches CLAUDE.md currentDate
const fourWeeksAgo = new Date(today)
fourWeeksAgo.setDate(today.getDate() - 28)

const recentWorkouts = workouts.filter((w) => new Date(w.date) >= fourWeeksAgo)
const cardioTypes = ['cardio', 'walk']
const cardioCount = recentWorkouts.filter((w) => cardioTypes.includes(w.type)).length

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
    body_weight_kg: latestWeight.weight_kg,
  },
  body_comp: {
    body_fat_pct: latestStats.body_fat_pct ?? 15,
    weight_kg: latestWeight.weight_kg,
  },
  consistency: {
    sessions_per_week_avg: Math.round((recentWorkouts.length / 4) * 100) / 100,
    total_sessions_last_4_weeks: recentWorkouts.length,
    cardio_sessions_per_week_avg: Math.round((cardioCount / 4) * 100) / 100,
  },
}

export const currentScore: ScoreResult = calculateCompositeScore(scoreInputs)
export const currentScoreLabel = scoreLabel(currentScore.score)

// Weight trend: merge stats snapshots + daily weigh-in entries, deduplicate by date
const weightByDate = new Map<string, number>()
stats.forEach((s) => weightByDate.set(s.date, s.weight_kg))
weightLog.entries.forEach((e) => weightByDate.set(e.date, e.weight_kg))

export const weightTrend = Array.from(weightByDate.entries())
  .map(([date, weight_kg]) => ({ date, value: weight_kg }))
  .sort((a, b) => a.date.localeCompare(b.date))

// VO2 / RHR trend from stats snapshots
export const vo2Trend = stats
  .filter((s) => s.vo2_max != null)
  .map((s) => ({ date: s.date, value: s.vo2_max! }))

export const rhrTrend = stats
  .filter((s) => s.resting_hr_bpm != null)
  .map((s) => ({ date: s.date, value: s.resting_hr_bpm! }))
