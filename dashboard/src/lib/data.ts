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
import nutritionLogRaw from '@data/nutrition/daily-log.json'
import taxonomyRaw from '@data/exercise-taxonomy.json'
import injuriesRaw from '@data/injuries.json'
// Vite glob imports — eager so all files are bundled synchronously
const workoutModules = import.meta.glob('@data/workouts/*.json', { eager: true })
const programModules = import.meta.glob('@data/programs/*.json', { eager: true })
const eventModules   = import.meta.glob('@data/events/*.json',   { eager: true })

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
  notes?: string
}

export interface WeightEntry {
  date: string
  weight_kg: number
  body_fat_pct?: number
  lean_mass_kg?: number
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
  tsb: number     // training stress balance: CTL - ATL (positive = fresh/peaking)
}

export interface ReadinessPoint {
  date: string
  score: number        // 0–100 composite
  hrv_score: number
  sleep_score: number
  rhr_score: number
  load_score: number
  flag: 'green' | 'amber' | 'red'
}

export interface OneRMDataPoint {
  date: string
  est1rm: number
}

export interface Zone2DataPoint {
  date: string
  pace: number       // decimal min/km
  pace_str: string
  avg_hr?: number
}

export interface NutritionEntry {
  date: string
  time?: string
  description?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  not_tracked?: boolean
}

export interface DailyNutrition {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  entries: NutritionEntry[]
}

export interface ComplianceWeek {
  weekStart: string
  planned: number
  actual: number
  pct: number
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
  goal_body_fat_pct?: number
  starting_weight_kg: number
  entries: WeightEntry[]
}

export const goalWeightKg  = weightLog.goal_weight_kg
export const goalBodyFatPct = weightLog.goal_body_fat_pct ?? 14
export const prs = personalRecords as LiftRecord[]
export const scoreHistory = compositeScores as CompositeScoreEntry[]

export const workouts: Workout[] = Object.values(workoutModules)
  .map((m) => (m as { default: Workout }).default)
  .sort((a, b) => a.date.localeCompare(b.date))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

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

export const latestZone2Run = workouts
  .filter((w) => w.cardio_subtype === 'zone2-run' && w.avg_pace_per_km)
  .at(-1)

// Consistency windows
const today = new Date()
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
const squatPR = findPR('Back Squat')
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
    bench_press_kg: benchPR.current_best_kg ?? 60,
    deadlift_kg: deadliftPR.current_best_kg ?? 70,
    squat_kg: squatPR.current_best_kg ?? 60,
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

// Always compute today's ATL/CTL/ACWR so rest days don't freeze the stat tile
export const todayLoad = (() => {
  const atl = rollingAvg(trimpByDate, TODAY_STR, 7)
  const ctl = rollingAvg(trimpByDate, TODAY_STR, 28)
  return {
    date: TODAY_STR,
    trimp: trimpByDate.get(TODAY_STR) ?? 0,
    atl:  Math.round(atl * 10) / 10,
    ctl:  Math.round(ctl * 10) / 10,
    acwr: ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0,
    tsb:  Math.round((ctl - atl) * 10) / 10,
  }
})()

// Next upcoming event — resolved after TODAY_STR is defined
const eventRaw: any = Object.values(eventModules)
  .map((m: any) => (m as any).default ?? m)
  .sort((a: any, b: any) => a.date.localeCompare(b.date))
  .find((e: any) => e.date >= TODAY_STR) ?? null

export interface UpcomingEvent {
  name: string
  date: string
  goal?: string
}

export interface ActiveProgram {
  name: string
  goal: string
  start_date: string
  end_date: string
  taper_start_date?: string
}

export const nextEvent: UpcomingEvent | null = eventRaw
  ? { name: eventRaw.name, date: eventRaw.date, goal: eventRaw.goal }
  : null

export const activeProgram: ActiveProgram = {
  name:             programRaw.name        ?? 'Active Program',
  goal:             programRaw.goal        ?? '',
  start_date:       programRaw.start_date  ?? TODAY_STR,
  end_date:         programRaw.end_date    ?? TODAY_STR,
  taper_start_date: programRaw.taper_start_date,
}

// ─── Active mesocycle / current week nutrition targets ────────────────────────

export interface ActiveMesocycleWeek {
  mesocycleName: string
  phaseName: string
  phaseType: string
  weekNumber: number
  weekStart: string
  weekEnd: string
  calorie_target: number
  protein_target_g: number
  volume_modifier: number
  intensity_modifier: number
  notes?: string
  totalWeeks: number
  currentWeekInMeso: number
}

export const activeMesocycleWeek: ActiveMesocycleWeek | null = (() => {
  const meso = programRaw
  if (!meso?.phases) return null

  let weekInMeso = 0
  for (const phase of meso.phases) {
    for (const week of (phase.weeks ?? [])) {
      weekInMeso++
      if (TODAY_STR >= week.start_date && TODAY_STR <= week.end_date) {
        const totalWeeks = meso.phases.reduce((acc: number, p: any) => acc + (p.weeks?.length ?? 0), 0)
        return {
          mesocycleName: meso.name ?? 'Active Mesocycle',
          phaseName: phase.name,
          phaseType: phase.type,
          weekNumber: week.week,
          weekStart: week.start_date,
          weekEnd: week.end_date,
          calorie_target: week.calorie_target,
          protein_target_g: week.protein_target_g,
          volume_modifier: week.volume_modifier,
          intensity_modifier: week.intensity_modifier,
          notes: week.notes,
          totalWeeks,
          currentWeekInMeso: weekInMeso,
        }
      }
    }
  }
  return null
})()

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
    tsb: Math.round((ctl - atl) * 10) / 10,
  }
})

// ─── Daily Readiness Score (Body Battery) ─────────────────────────────────────
// 50% HRV deviation from 7-day baseline · 30% sleep quality · 10% overnight RHR · 10% inverted ATL

const sortedSleep = [...sleepLog].sort((a, b) => a.date.localeCompare(b.date))

export const readiness: ReadinessPoint[] = sortedSleep.map((e, i, arr) => {
  // HRV — ratio to 7-day rolling baseline (excluding today)
  const prevHrv = arr.slice(Math.max(0, i - 7), i).filter((s) => s.hrv_ms != null)
  const hrvBaseline = prevHrv.length > 0
    ? prevHrv.reduce((s, x) => s + x.hrv_ms!, 0) / prevHrv.length
    : null
  const hrv_score = e.hrv_ms != null
    ? hrvBaseline != null
      ? clamp((e.hrv_ms / hrvBaseline) * 75, 0, 100)
      : clamp((e.hrv_ms - 20) / (150 - 20) * 100, 0, 100)
    : 60

  // Sleep — 5h → 0, 9h → 100
  const sleepHrs = e.sleep_hr ?? e.duration_hr
  const sleep_score = clamp((sleepHrs - 5) / (9 - 5) * 100, 0, 100)

  // Overnight RHR — 40 bpm → 100, 75 bpm → 0
  const rhr_score = e.resting_hr != null
    ? clamp((75 - e.resting_hr) / (75 - 40) * 100, 0, 100)
    : 65

  // Training load — high ATL → low score
  const atl = rollingAvg(trimpByDate, e.date, 7)
  const load_score = clamp((1 - atl / 100) * 100, 0, 100)

  const score = Math.round(0.5 * hrv_score + 0.3 * sleep_score + 0.1 * rhr_score + 0.1 * load_score)

  return {
    date: e.date,
    score,
    hrv_score: Math.round(hrv_score),
    sleep_score: Math.round(sleep_score),
    rhr_score: Math.round(rhr_score),
    load_score: Math.round(load_score),
    flag: score >= 70 ? 'green' : score >= 50 ? 'amber' : 'red',
  }
})

export const todayReadiness = readiness.at(-1) ?? null

// ─── Zone 2 Pace Trend + Linear Projection ────────────────────────────────────

export const zone2Trend: Zone2DataPoint[] = workouts
  .filter((w) => w.cardio_subtype === 'zone2-run' && w.avg_pace_per_km)
  .map((w) => ({
    date: w.date,
    pace: parsePace(w.avg_pace_per_km!),
    pace_str: w.avg_pace_per_km!,
    avg_hr: w.avg_hr,
  }))

// Linear regression: x = days since first session, y = pace (lower = faster = better)
export const zone2Regression: { slope: number; intercept: number; refDate: string } | null = (() => {
  if (zone2Trend.length < 2) return null
  const t0 = new Date(zone2Trend[0].date).getTime()
  const pts = zone2Trend.map((p) => ({
    x: (new Date(p.date).getTime() - t0) / 86_400_000,
    y: p.pace,
  }))
  const n = pts.length
  const sumX = pts.reduce((s, p) => s + p.x, 0)
  const sumY = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, refDate: zone2Trend[0].date }
})()

// ─── Estimated 1RM Trends (Epley: weight × (1 + reps / 30)) ──────────────────

const EXERCISE_NAME_MAP: Record<string, string> = {
  'Barbell Bench Press':    'Barbell Bench Press',
  'Bench Press':            'Barbell Bench Press',
  'Deadlift':               'Deadlift',
  'Romanian Deadlift':      'Romanian Deadlift',
  'RDL':                    'Romanian Deadlift',
  'Leg Press':              'Leg Press',
  'Back Squat':             'Back Squat',
  'Squat':                  'Back Squat',
  'Barbell Hip Thrust':     'Barbell Hip Thrust',
  'Hip Thrust':             'Barbell Hip Thrust',
  'Barbell Shoulder Press': 'Barbell Shoulder Press',
  'Overhead Press':         'Barbell Shoulder Press',
  'OHP':                    'Barbell Shoulder Press',
  'Lat Pulldown':           'Lat Pulldown',
  'Cable Row':              'Cable Row',
  'Seated Leg Curl':        'Seated Leg Curl',
  'Leg Curl':               'Seated Leg Curl',
}

function epley1RM(weight: number, reps: number): number {
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10
}

export const oneRmTrends: Record<string, OneRMDataPoint[]> = {}

for (const w of workouts) {
  if (!w.exercises) continue
  for (const ex of w.exercises) {
    const liftName = EXERCISE_NAME_MAP[ex.name]
    if (!liftName) continue
    let best = 0
    for (const set of ex.sets) {
      if (set.weight_kg == null || set.weight_kg === 0 || set.reps < 1) continue
      const est = epley1RM(set.weight_kg, set.reps)
      if (est > best) best = est
    }
    if (best > 0) {
      if (!oneRmTrends[liftName]) oneRmTrends[liftName] = []
      const existing = oneRmTrends[liftName].find((p) => p.date === w.date)
      if (existing) { if (best > existing.est1rm) existing.est1rm = best }
      else oneRmTrends[liftName].push({ date: w.date, est1rm: best })
    }
  }
}
// Also seed from PR history so the trend goes back further than the workout files
function parseReps(repsVal: number | string): number {
  if (typeof repsVal === 'number') return repsVal
  const match = String(repsVal).match(/\d+/)
  return match ? parseInt(match[0]) : 1
}

for (const pr of prs) {
  // Current best
  if (pr.current_best_kg != null && pr.current_best_date != null) {
    const reps = parseReps(pr.current_best_reps)
    const est = epley1RM(pr.current_best_kg, reps)
    if (!oneRmTrends[pr.lift]) oneRmTrends[pr.lift] = []
    const ex = oneRmTrends[pr.lift].find((p) => p.date === pr.current_best_date)
    if (ex) { if (est > ex.est1rm) ex.est1rm = est }
    else oneRmTrends[pr.lift].push({ date: pr.current_best_date, est1rm: est })
  }
  // History entries
  for (const h of pr.history ?? []) {
    if (h.weight_kg == null || h.weight_kg === 0) continue
    const reps = parseReps(h.reps)
    const est = (h as any).estimated_1rm_kg ?? epley1RM(h.weight_kg, reps)
    if (!oneRmTrends[pr.lift]) oneRmTrends[pr.lift] = []
    const ex = oneRmTrends[pr.lift].find((p) => p.date === h.date)
    if (ex) { if (est > ex.est1rm) ex.est1rm = est }
    else oneRmTrends[pr.lift].push({ date: h.date, est1rm: est })
  }
}

for (const k of Object.keys(oneRmTrends)) {
  oneRmTrends[k].sort((a, b) => a.date.localeCompare(b.date))
}

/** Best (peak) estimated 1RM for a lift across all history. */
export function peakEst1rm(liftName: string): number | null {
  const trend = oneRmTrends[liftName]
  if (!trend || trend.length === 0) return null
  return Math.max(...trend.map((p) => p.est1rm))
}

/** Estimated 1RM from the current PR record (what they can do right now). */
export function currentEst1rm(liftName: string): number | null {
  const pr = prs.find((p) => p.lift === liftName)
  if (!pr || pr.current_best_kg == null) return null
  return epley1RM(pr.current_best_kg, parseReps(pr.current_best_reps))
}

// ─── Periodization Compliance ─────────────────────────────────────────────────

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

const allProgramDays: { date: string; focus: string }[] = ((programRaw as any).phases ?? [])
  .flatMap((phase: any) =>
    (phase.days ?? []).map((d: any) => ({ date: d.date as string, focus: (d.focus ?? '') as string }))
  )

const plannedTrainDays = allProgramDays.filter((d) => !/^rest/i.test(d.focus) && d.date <= TODAY_STR)
const workoutDateSet = new Set(workouts.map((w) => w.date))

const weekCompMap = new Map<string, { planned: number; actual: number }>()
for (const s of plannedTrainDays) {
  const wk = isoWeekStart(s.date)
  if (!weekCompMap.has(wk)) weekCompMap.set(wk, { planned: 0, actual: 0 })
  weekCompMap.get(wk)!.planned++
  if (workoutDateSet.has(s.date)) weekCompMap.get(wk)!.actual++
}

export const complianceByWeek: ComplianceWeek[] = Array.from(weekCompMap.entries())
  .map(([ws, { planned, actual }]) => ({
    weekStart: ws,
    planned,
    actual,
    pct: planned > 0 ? Math.round((actual / planned) * 100) : 0,
  }))
  .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

export const overallCompliance = complianceByWeek.reduce(
  (acc, w) => {
    acc.planned += w.planned
    acc.actual  += w.actual
    acc.pct = acc.planned > 0 ? Math.round((acc.actual / acc.planned) * 100) : 0
    return acc
  },
  { planned: 0, actual: 0, pct: 0 },
)

// ─── Nutrition Log ────────────────────────────────────────────────────────────

export const nutritionLog = nutritionLogRaw as NutritionEntry[]

const nutritionByDate = new Map<string, NutritionEntry[]>()
for (const entry of nutritionLog) {
  if (entry.not_tracked) continue
  if (!nutritionByDate.has(entry.date)) nutritionByDate.set(entry.date, [])
  nutritionByDate.get(entry.date)!.push(entry)
}

export const dailyNutrition: DailyNutrition[] = Array.from(nutritionByDate.entries())
  .map(([date, entries]) => ({
    date,
    calories: entries.reduce((s, e) => s + (e.calories ?? 0), 0),
    protein_g: entries.reduce((s, e) => s + (e.protein_g ?? 0), 0),
    carbs_g: entries.reduce((s, e) => s + (e.carbs_g ?? 0), 0),
    fat_g: entries.reduce((s, e) => s + (e.fat_g ?? 0), 0),
    entries,
  }))
  .sort((a, b) => a.date.localeCompare(b.date))

export const todayNutrition = dailyNutrition.find((d) => d.date === TODAY_STR) ?? null
export const nutritionTargets = { calories: 2300, protein_g: 165, carbs_g: 250, fat_g: 65 }

// ─── Muscle Group Volume Balance ──────────────────────────────────────────────
// Source: exercise-taxonomy.json (wger muscle IDs + Israetel MEV/MAV/MRV)

const taxonomy = taxonomyRaw as typeof taxonomyRaw

// Build lookup: all known names/aliases → taxonomy entry
type TaxonomyExercise = typeof taxonomy.exercises[number]
const exerciseLookup = new Map<string, TaxonomyExercise>()
for (const ex of taxonomy.exercises) {
  exerciseLookup.set(ex.name.toLowerCase(), ex)
  for (const alias of ex.aliases) {
    exerciseLookup.set(alias.toLowerCase(), ex)
  }
}

export interface MuscleVolumePoint {
  muscle: string          // e.g. "chest"
  sets_7d: number
  sets_28d: number
  mev: number
  mav_lo: number
  mav_hi: number
  mrv: number
  status_7d: 'under' | 'optimal' | 'over'   // relative to MEV/MRV
}

export interface PatternVolumePoint {
  pattern: string   // push / pull / hinge / squat / core
  sets_7d: number
  sets_28d: number
}

// Count direct sets per muscle per window from strength workouts
function countSets(windowDays: number): Map<string, number> {
  const cutoff = new Date(TODAY_STR)
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const counts = new Map<string, number>()
  for (const w of workouts) {
    if (w.date < cutoffStr) continue
    if (w.type !== 'strength' && w.type !== 'hybrid') continue
    for (const ex of w.exercises ?? []) {
      const entry = exerciseLookup.get(ex.name.toLowerCase())
      if (!entry) continue
      const n = ex.sets.length
      for (const muscle of entry.primary) {
        counts.set(muscle, (counts.get(muscle) ?? 0) + n)
      }
    }
  }
  return counts
}

function countPatternSets(windowDays: number): Map<string, number> {
  const cutoff = new Date(TODAY_STR)
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const counts = new Map<string, number>()
  for (const w of workouts) {
    if (w.date < cutoffStr) continue
    if (w.type !== 'strength' && w.type !== 'hybrid') continue
    for (const ex of w.exercises ?? []) {
      const entry = exerciseLookup.get(ex.name.toLowerCase())
      if (!entry) continue
      const pattern = entry.pattern
      counts.set(pattern, (counts.get(pattern) ?? 0) + ex.sets.length)
    }
  }
  return counts
}

const sets7d  = countSets(7)
const sets28d = countSets(28)
const pattern7d  = countPatternSets(7)
const pattern28d = countPatternSets(28)

const landmarks = taxonomy.volume_landmarks as unknown as Record<string, { mev: number; mav_lo: number; mav_hi: number; mrv: number }>

// Only surface muscles that appear in the taxonomy landmarks (skip metadata keys starting with _)
export const muscleVolume: MuscleVolumePoint[] = Object.entries(landmarks).filter(([k]) => !k.startsWith('_')).map(([muscle, lm]) => {
  const s7  = sets7d.get(muscle)  ?? 0
  const s28 = sets28d.get(muscle) ?? 0
  // Scale 28d volume to weekly average for status comparison
  const weekly = s28 / 4
  const status_7d: 'under' | 'optimal' | 'over' =
    weekly < lm.mev ? 'under' : weekly > lm.mrv ? 'over' : 'optimal'
  return { muscle, sets_7d: s7, sets_28d: s28, ...lm, status_7d }
})

export const patternVolume: PatternVolumePoint[] = ['push', 'pull', 'hinge', 'squat', 'core'].map((pattern) => ({
  pattern,
  sets_7d:  pattern7d.get(pattern)  ?? 0,
  sets_28d: pattern28d.get(pattern) ?? 0,
}))

// Push : Pull ratio (7-day)
const pushSets7d = pattern7d.get('push') ?? 0
const pullSets7d = pattern7d.get('pull') ?? 0
export const pushPullRatio7d = pullSets7d > 0 ? Math.round((pushSets7d / pullSets7d) * 100) / 100 : null

const { optimal_min, optimal_max } = taxonomy.push_pull_ratio
export const pushPullStatus: 'optimal' | 'push-dominant' | 'pull-dominant' | 'no-data' =
  pushPullRatio7d === null ? 'no-data'
  : pushPullRatio7d > optimal_max ? 'push-dominant'
  : pushPullRatio7d < optimal_min ? 'pull-dominant'
  : 'optimal'

// ─── Injuries ─────────────────────────────────────────────────────────────────

export interface Injury {
  id: string
  body_part: string
  injury_type: string
  severity: 'mild' | 'moderate' | 'severe'
  status: 'active' | 'rehab' | 'resolved'
  date_onset: string
  date_resolved?: string
  affected_movements: string[]
  rehab_exercises?: string[]
  notes?: string
}

export const injuries = injuriesRaw as Injury[]
export const activeInjuries = injuries.filter((i) => i.status !== 'resolved')

// ─── Weight Prediction ────────────────────────────────────────────────────────
//
// TDEE is derived in two stages:
//
// Stage 1 — Katch-McArdle BMR from lean mass (Withings):
//   BMR = 370 + 21.6 × lean_mass_kg
//   Base TDEE = BMR × 1.2  (sedentary NEAT; workout calories added separately)
//   This is more accurate than a fixed number because it updates as body comp changes.
//
// Stage 2 — Self-calibration (kicks in when enough overlapping data exists):
//   Uses actual weight change + logged calories to back-calculate real-world TDEE:
//   Calibrated TDEE = (total_calories_in − Δweight_kg × 7700) / logged_days
//   Requires ≥5 logged nutrition days bracketed by two weight measurements.
//   Once available, this overrides the Katch-McArdle estimate.

// --- Stage 1: Katch-McArdle BMR ---
const latestLeanMassEntry = [...weightLog.entries]
  .reverse()
  .find((e) => e.lean_mass_kg != null)

const latestLeanMassKg = latestLeanMassEntry?.lean_mass_kg ?? null
const bmrKcal = latestLeanMassKg != null
  ? Math.round(370 + 21.6 * latestLeanMassKg)
  : 1700  // fallback if no lean mass data
const katchMcArdleTdee = Math.round(bmrKcal * 1.2)

// --- Workout calories per date ---
const workoutCalsByDate = new Map<string, number>()
for (const w of workouts) {
  const burned = w.calories_active ?? w.calories ?? 0
  if (burned > 0) {
    workoutCalsByDate.set(w.date, (workoutCalsByDate.get(w.date) ?? 0) + burned)
  }
}

// --- Raw daily data (calories in + workout burn, last 14 days with nutrition logged) ---
export interface DayCalorieBalance {
  date: string
  calories_in: number
  calories_burned: number  // workout active calories from Apple Watch
  balance: number          // calories_in − (effective_tdee + calories_burned)
}

const nutritionDateSet = new Set(dailyNutrition.map((d) => d.date))
const last14DayStrs: string[] = []
for (let i = 13; i >= 0; i--) {
  const d = new Date(TODAY_STR)
  d.setDate(d.getDate() - i)
  last14DayStrs.push(d.toISOString().slice(0, 10))
}
const last14WithData = last14DayStrs.filter((d) => nutritionDateSet.has(d))

// Raw intake/burn — balance filled in after TDEE is resolved
const rawDailyData = last14WithData.map((date) => {
  const nut = dailyNutrition.find((n) => n.date === date)!
  return {
    date,
    calories_in: nut.calories,
    calories_burned: workoutCalsByDate.get(date) ?? 0,
  }
})

// --- Stage 2: Self-calibration ---
// Find the best window where weight measurements bracket logged nutrition days.
// Requires ≥5 nutrition days and ≥5 total days between weight entries.
const weightByDateMap = new Map(weightLog.entries.map((e) => [e.date, e.weight_kg]))
const sortedWeightDates = weightLog.entries.map((e) => e.date).sort()

let calibratedTdee: number | null = null
let calibrationDays = 0
let calibrationWindow = ''

for (let i = sortedWeightDates.length - 1; i >= 1; i--) {
  const endDate   = sortedWeightDates[i]
  const startDate = sortedWeightDates[i - 1]
  const spanDays  = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000

  if (spanDays < 5) continue  // need a meaningful window

  // Nutrition days strictly between the two weight measurements (or on endDate)
  const windowNutrition = rawDailyData.filter((d) => d.date > startDate && d.date <= endDate)
  if (windowNutrition.length < 5) continue

  const totalIn       = windowNutrition.reduce((s, d) => s + d.calories_in, 0)
  const startWeight   = weightByDateMap.get(startDate)!
  const endWeight     = weightByDateMap.get(endDate)!
  const deltaKg       = endWeight - startWeight

  // actual_TDEE × logged_days = total_calories_in − delta_kg × 7700
  const estimate = (totalIn - deltaKg * 7700) / windowNutrition.length
  if (estimate > 1200 && estimate < 5000) {
    calibratedTdee   = Math.round(estimate)
    calibrationDays  = windowNutrition.length
    calibrationWindow = `${startDate} → ${endDate}`
    break
  }
}

// Effective TDEE: calibrated if available, otherwise Katch-McArdle
const effectiveTdee = calibratedTdee ?? katchMcArdleTdee
const tdeeSource: 'calibrated' | 'katch-mcardleale' = calibratedTdee != null ? 'calibrated' : 'katch-mcardleale'

// --- Final balance using effective TDEE ---
export const calorieBalance14d: DayCalorieBalance[] = rawDailyData.map((d) => ({
  ...d,
  balance: d.calories_in - (effectiveTdee + d.calories_burned),
}))

// 7-day subset
const last7Cutoff = (() => { const d = new Date(TODAY_STR); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) })()
const balance7d = calorieBalance14d.filter((d) => d.date > last7Cutoff)
const _n = balance7d.length

const avg7dCaloriesIn  = _n > 0 ? Math.round(balance7d.reduce((s, d) => s + d.calories_in, 0) / _n) : 0
const avg7dCalsBurned  = _n > 0 ? Math.round(balance7d.reduce((s, d) => s + d.calories_burned, 0) / _n) : 0
const avg7dBalance     = _n > 0 ? Math.round(balance7d.reduce((s, d) => s + d.balance, 0) / _n) : 0

// Projection: linear at avg daily balance; 7700 kcal = 1 kg fat
const projectedWeightChange7d = Math.round((avg7dBalance * 7 / 7700) * 100) / 100
const projectedWeight7d       = Math.round((latestWeightAvg7 + projectedWeightChange7d) * 10) / 10

export const weightPrediction = {
  // TDEE inputs
  latestLeanMassKg,
  bmrKcal,
  katchMcArdleTdee,
  calibratedTdee,
  calibrationDays,
  calibrationWindow,
  effectiveTdee,
  tdeeSource,
  // Summary
  daysWithData: _n,
  avg7dCaloriesIn,
  avg7dCalsBurned,
  avg7dBalance,
  projectedWeightChange7d,
  projectedWeight7d,
  currentWeight: latestWeightAvg7,
}
