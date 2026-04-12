/**
 * context.ts
 *
 * Prints a structured 7-day summary for the AI agent to use as context
 * before making training recommendations.
 *
 * Usage:
 *   npm run context
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(__dirname, '../data')
const TODAY = new Date('2026-04-11')

function daysAgo(isoDate: string): number {
  return Math.floor((TODAY.getTime() - new Date(isoDate).getTime()) / 86_400_000)
}

function withinDays(isoDate: string, days: number): boolean {
  return daysAgo(isoDate) <= days
}

function r1(n: number) { return Math.round(n * 10) / 10 }

// ─── Load data ────────────────────────────────────────────────────────────────

const stats: any[] = JSON.parse(readFileSync(join(DATA_DIR, 'stats-snapshots.json'), 'utf-8'))
const weightLog: any = JSON.parse(readFileSync(join(DATA_DIR, 'body-weight-log.json'), 'utf-8'))
const sleepLog: any = JSON.parse(readFileSync(join(DATA_DIR, 'sleep-log.json'), 'utf-8'))
const prs: any[] = JSON.parse(readFileSync(join(DATA_DIR, 'personal-records.json'), 'utf-8'))

const workoutFiles = readdirSync(join(DATA_DIR, 'workouts'))
  .filter(f => f.endsWith('.json'))
  .sort()
const allWorkouts: any[] = workoutFiles.map(f =>
  JSON.parse(readFileSync(join(DATA_DIR, 'workouts', f), 'utf-8'))
)

const programs: any[] = readdirSync(join(DATA_DIR, 'programs'))
  .map(f => JSON.parse(readFileSync(join(DATA_DIR, 'programs', f), 'utf-8')))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function latestMetric(key: string): any {
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i][key] != null) return stats[i][key]
  }
  return null
}

function formatWorkout(w: any): string {
  const parts: string[] = []
  const label = w.cardio_subtype
    ? `${w.type} (${w.cardio_subtype})`
    : w.type
  const dur = w.duration_min != null ? `${w.duration_min} min` : 'duration unknown'
  parts.push(`${w.date} — ${label}, ${dur}`)
  if (w.avg_hr) parts.push(`avg HR ${w.avg_hr} bpm`)
  if (w.avg_pace_per_km) parts.push(`pace ${w.avg_pace_per_km}/km`)
  if (w.distance_km) parts.push(`${w.distance_km}km`)
  if (w.total_volume_kg) parts.push(`volume ${w.total_volume_kg}kg`)
  if (w.rpe) parts.push(`RPE ${w.rpe}`)
  if (w.notes) parts.push(`— ${w.notes}`)
  return '  • ' + parts.join(', ')
}

// ─── Build output ─────────────────────────────────────────────────────────────

const lines: string[] = []
const hr = '─'.repeat(60)

lines.push(hr)
lines.push(`  7-DAY CONTEXT SNAPSHOT  —  ${TODAY.toDateString()}`)
lines.push(hr)

// ── Current stats ─────────────────────────────────────────────────────────────
lines.push('\n## CURRENT STATS\n')

const latestWeight = weightLog.entries.at(-1)
const vo2 = latestMetric('vo2_max')
const rhr = latestMetric('resting_hr_bpm')
const bf = latestMetric('body_fat_pct')
const fitbod = latestMetric('fitbod')

lines.push(`  Weight:      ${latestWeight?.weight_kg ?? '—'} kg  (goal: 75 kg)`)
lines.push(`  Body Fat:    ${bf != null ? bf + '%' : '—'}  (goal: 14%)`)
lines.push(`  VO2 Max:     ${vo2 ?? '—'}  (target: 45+ post-Hyrox)`)
lines.push(`  Resting HR:  ${rhr != null ? rhr + ' bpm' : '—'}  (goal: <50 bpm)`)
if (fitbod) {
  lines.push(`  Fitbod:      Overall ${fitbod.overall} · Push ${fitbod.push} · Pull ${fitbod.pull} · Legs ${fitbod.legs}  (floor: 58)`)
}

// ── Recent weight trend ───────────────────────────────────────────────────────
const recentWeights = weightLog.entries.filter((e: any) => withinDays(e.date, 7))
if (recentWeights.length >= 2) {
  const change = r1(recentWeights.at(-1).weight_kg - recentWeights[0].weight_kg)
  const dir = change > 0 ? `+${change}` : String(change)
  lines.push(`  Weight trend (7d): ${dir} kg  (${recentWeights[0].weight_kg} → ${recentWeights.at(-1).weight_kg} kg)`)
}

// ── Sleep (last 7 days) ───────────────────────────────────────────────────────
lines.push('\n## SLEEP & RECOVERY (last 7 days)\n')

const recentSleep = sleepLog.entries.filter((e: any) => withinDays(e.date, 7))

if (recentSleep.length === 0) {
  lines.push('  No sleep data in the last 7 days. Run: npm run import:health')
} else {
  const avgSleep = r1(recentSleep.reduce((s: number, e: any) => s + (e.sleep_hr ?? e.duration_hr), 0) / recentSleep.length)
  const avgHrv = recentSleep.filter((e: any) => e.hrv_ms != null).length > 0
    ? Math.round(recentSleep.filter((e: any) => e.hrv_ms != null)
        .reduce((s: number, e: any) => s + e.hrv_ms, 0) /
        recentSleep.filter((e: any) => e.hrv_ms != null).length)
    : null

  lines.push(`  7-day avg sleep: ${avgSleep}h  |  7-day avg HRV: ${avgHrv != null ? avgHrv + 'ms' : '—'}`)
  lines.push('')

  for (const e of [...recentSleep].reverse()) {
    const hrs = e.sleep_hr ?? e.duration_hr
    const quality = hrs >= 7.5 ? '✓' : hrs >= 6.5 ? '~' : '⚠'
    const parts = [`${e.date}  ${quality}  ${hrs}h sleep`]
    if (e.deep_hr) parts.push(`deep ${e.deep_hr}h`)
    if (e.rem_hr) parts.push(`REM ${e.rem_hr}h`)
    if (e.hrv_ms != null) parts.push(`HRV ${e.hrv_ms}ms`)
    if (e.resting_hr != null) parts.push(`overnight RHR ${e.resting_hr}bpm`)
    lines.push('  • ' + parts.join('  ·  '))
  }

  // HRV trend flag
  if (recentSleep.length >= 2 && avgHrv != null) {
    const latest = recentSleep.at(-1)
    if (latest?.hrv_ms != null) {
      const drop = ((avgHrv - latest.hrv_ms) / avgHrv) * 100
      if (drop > 15) {
        lines.push(`\n  ⚠  HRV dropped ${Math.round(drop)}% below 7-day avg — signs of accumulated fatigue. Consider recovery session or rest.`)
      } else if (drop > 8) {
        lines.push(`\n  ~  HRV is ${Math.round(drop)}% below 7-day avg — moderate fatigue signal. Monitor load today.`)
      }
    }
  }
}

// ── Training last 7 days ──────────────────────────────────────────────────────
lines.push('\n## TRAINING (last 7 days)\n')

const recentWorkouts = allWorkouts.filter(w => withinDays(w.date, 7))

if (recentWorkouts.length === 0) {
  lines.push('  No workouts logged in the last 7 days.')
} else {
  const strengthSessions = recentWorkouts.filter(w => w.type === 'strength' || w.type === 'hybrid')
  const cardioSessions = recentWorkouts.filter(w => w.type === 'cardio')
  const walkSessions = recentWorkouts.filter(w => w.type === 'walk')
  const totalMins = recentWorkouts.reduce((s, w) => s + (w.duration_min ?? 0), 0)

  lines.push(`  Sessions: ${recentWorkouts.length} total  (${strengthSessions.length} strength · ${cardioSessions.length} cardio · ${walkSessions.length} walk)`)
  lines.push(`  Total training time: ${totalMins} min`)
  lines.push('')

  for (const w of [...recentWorkouts].reverse()) {
    lines.push(formatWorkout(w))
  }
}

// Days since last session
const lastWorkout = allWorkouts.at(-1)
if (lastWorkout) {
  const daysSince = daysAgo(lastWorkout.date)
  if (daysSince === 0) lines.push('\n  Last session: today')
  else if (daysSince === 1) lines.push('\n  Last session: yesterday')
  else lines.push(`\n  ⚠  Last session: ${daysSince} days ago`)
}

// Days since last leg session
const lastLegs = [...allWorkouts].reverse().find(w =>
  w.type === 'strength' && (
    w.id?.includes('leg') ||
    w.exercises?.some((e: any) => /squat|deadlift|leg press|lunge|hip thrust/i.test(e.name))
  )
)
if (lastLegs) {
  const d = daysAgo(lastLegs.date)
  if (d > 5) lines.push(`  ⚠  Last leg session: ${d} days ago (${lastLegs.date})`)
}

// ── Training load ─────────────────────────────────────────────────────────────
lines.push('\n## TRAINING LOAD\n')

// Compute TRIMP per session over last 28 days
function estimateRpe(w: any): number {
  if (w.rpe != null) return w.rpe
  if (w.type === 'walk') return 3
  if (w.cardio_subtype === 'zone2-run') return 4
  if (w.cardio_subtype === 'hiit') return 8
  if (w.cardio_subtype === 'run') return 7
  if (w.cardio_subtype === 'stationary-bike') return 5
  return 6
}

const trimpByDate = new Map<string, number>()
for (const w of allWorkouts) {
  if (daysAgo(w.date) > 28) continue
  const dur = w.duration_min ?? 45  // fallback for workouts missing duration
  const t = (w.trimp ?? dur * estimateRpe(w))
  trimpByDate.set(w.date, (trimpByDate.get(w.date) ?? 0) + t)
}

function rollingAvg(endDate: string, days: number): number {
  let sum = 0
  const end = new Date(endDate)
  for (let i = 0; i < days; i++) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    sum += trimpByDate.get(d.toISOString().slice(0, 10)) ?? 0
  }
  return sum / days
}

const todayStr = TODAY.toISOString().slice(0, 10)
const atl = r1(rollingAvg(todayStr, 7))
const ctl = r1(rollingAvg(todayStr, 28))
const acwr = ctl > 0 ? r1(atl / ctl) : 0

const tsb = r1(ctl - atl)
const acwrStatus =
  acwr > 1.3 ? '⚠  HIGH — elevated injury risk, consider reducing load'
  : acwr < 0.8 ? '~  LOW — below training base, risk of detraining'
  : '✓  OPTIMAL — good training stimulus'

const tsbStatus =
  tsb > 15  ? '(very fresh — possible detraining if sustained)'
  : tsb > 0  ? '(fresh / peaking)'
  : tsb > -10 ? '(slight fatigue — normal training state)'
  : '(significant fatigue — recovery priority)'

lines.push(`  ATL (7-day avg TRIMP):   ${atl}`)
lines.push(`  CTL (28-day avg TRIMP):  ${ctl}`)
lines.push(`  ACWR:                    ${acwr}  — ${acwrStatus}`)
lines.push(`  TSB (Form):              ${tsb}  — ${tsbStatus}`)

// ── Daily readiness ───────────────────────────────────────────────────────────
lines.push('\n## DAILY READINESS\n')

// Compute readiness for today from sleep + load data
const todaySleep = sleepLog.entries.at(-1) as any
const recentSleepForHrv = sleepLog.entries.slice(-8, -1).filter((e: any) => e.hrv_ms != null)
const hrvBaseline = recentSleepForHrv.length > 0
  ? recentSleepForHrv.reduce((s: number, e: any) => s + e.hrv_ms, 0) / recentSleepForHrv.length
  : null

if (!todaySleep) {
  lines.push('  No sleep data — run import:health to sync latest recovery data.')
} else {
  const sleepHrs = todaySleep.sleep_hr ?? todaySleep.duration_hr

  function clampR(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

  const hrv_score = todaySleep.hrv_ms != null
    ? hrvBaseline != null
      ? Math.round(clampR((todaySleep.hrv_ms / hrvBaseline) * 75, 0, 100))
      : Math.round(clampR((todaySleep.hrv_ms - 20) / 130 * 100, 0, 100))
    : 60
  const sleep_score = Math.round(clampR((sleepHrs - 5) / 4 * 100, 0, 100))
  const rhr_score   = todaySleep.resting_hr != null
    ? Math.round(clampR((75 - todaySleep.resting_hr) / 35 * 100, 0, 100))
    : 65
  const load_score  = Math.round(clampR((1 - atl / 100) * 100, 0, 100))
  const score = Math.round(0.5 * hrv_score + 0.3 * sleep_score + 0.1 * rhr_score + 0.1 * load_score)
  const flag = score >= 70 ? '✓  GREEN — ready to train' : score >= 50 ? '~  AMBER — moderate, monitor effort' : '⚠  RED — prioritise recovery'

  lines.push(`  Readiness score:  ${score} / 100  — ${flag}`)
  lines.push(`    HRV:       ${hrv_score}/100${todaySleep.hrv_ms != null ? ` (${todaySleep.hrv_ms}ms${hrvBaseline != null ? ` vs ${Math.round(hrvBaseline)}ms baseline` : ''})` : ' (no data)'}`)
  lines.push(`    Sleep:     ${sleep_score}/100 (${sleepHrs}h)`)
  lines.push(`    Resting HR:${rhr_score}/100${todaySleep.resting_hr != null ? ` (${todaySleep.resting_hr}bpm)` : ' (no data)'}`)
  lines.push(`    Load:      ${load_score}/100 (ATL ${atl})`)
}

// ── Program context ───────────────────────────────────────────────────────────
lines.push('\n## ACTIVE PROGRAM\n')

if (programs.length === 0) {
  lines.push('  No active program found in data/programs/')
} else {
  const prog = programs[0]
  lines.push(`  Program: ${prog.name ?? prog.id ?? 'Unknown'}`)
  if (prog.goal) lines.push(`  Goal:    ${prog.goal}`)
  if (prog.phases) {
    // Find which phase we're in today
    for (const phase of prog.phases) {
      const start = new Date(phase.start_date)
      const end = new Date(phase.end_date)
      if (TODAY >= start && TODAY <= end) {
        lines.push(`  Current phase: ${phase.name} (${phase.start_date} → ${phase.end_date})`)
        lines.push(`  Phase focus: ${phase.focus ?? '—'}`)
        // Find today's planned session
        const todayPlan = phase.sessions?.find((s: any) => s.date === todayStr)
        if (todayPlan) {
          lines.push(`  Today's planned session: ${todayPlan.focus ?? todayPlan.session ?? '—'}`)
        }
        break
      }
    }
  }
}

// ── Key PRs for reference ─────────────────────────────────────────────────────
lines.push('\n## CURRENT PRs (key lifts)\n')
const keyLifts = ['Barbell Bench Press', 'Deadlift', 'Leg Press', 'Pull-up', 'Back Squat']
for (const lift of keyLifts) {
  const pr = prs.find((p: any) => p.lift === lift)
  if (pr && pr.current_best_kg != null) {
    lines.push(`  ${pr.lift}: ${pr.current_best_kg}kg × ${pr.current_best_reps}  (${pr.current_best_date})`)
  } else if (pr) {
    lines.push(`  ${pr.lift}: ${pr.current_best_reps} reps  (${pr.current_best_date})`)
  }
}

// ── Footer ────────────────────────────────────────────────────────────────────
lines.push('\n' + hr)
lines.push('  Use this snapshot to inform training recommendations for today or the next few days.')
lines.push('  Read fitness-tracker.md for full goals, program, and event context.')
lines.push(hr + '\n')

console.log(lines.join('\n'))
