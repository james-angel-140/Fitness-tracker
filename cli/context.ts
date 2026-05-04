/**
 * context.ts
 *
 * Prints a structured 7-day summary for the AI agent to use as context
 * before making training recommendations.
 *
 * Usage:
 *   npm run context
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(__dirname, '../data')
const TODAY = new Date()

function daysAgo(isoDate: string): number {
  return Math.floor((TODAY.getTime() - new Date(isoDate).getTime()) / 86_400_000)
}

function withinDays(isoDate: string, days: number): boolean {
  return daysAgo(isoDate) <= days
}

function r1(n: number) { return Math.round(n * 10) / 10 }

// ─── Load data ────────────────────────────────────────────────────────────────

const stats: any[] = JSON.parse(readFileSync(join(DATA_DIR, 'stats-snapshots.json'), 'utf-8'))
const taxonomy: any = JSON.parse(readFileSync(join(DATA_DIR, 'exercise-taxonomy.json'), 'utf-8'))
const weightLog: any = JSON.parse(readFileSync(join(DATA_DIR, 'body-weight-log.json'), 'utf-8'))
const sleepLog: any = JSON.parse(readFileSync(join(DATA_DIR, 'sleep-log.json'), 'utf-8'))
const prs: any[] = JSON.parse(readFileSync(join(DATA_DIR, 'personal-records.json'), 'utf-8'))
const injuries: any[] = existsSync(join(DATA_DIR, 'injuries.json'))
  ? JSON.parse(readFileSync(join(DATA_DIR, 'injuries.json'), 'utf-8'))
  : []

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

lines.push(`  Weight:      ${latestWeight?.weight_kg ?? '—'} kg  (goal: lean mass to 80–82 kg)`)
lines.push(`  Body Fat:    ${bf != null ? bf + '%' : '—'}  (goal: ≤14%)`)
lines.push(`  VO2 Max:     ${vo2 ?? '—'}  (supportive — maintain ≥43)`)
lines.push(`  Resting HR:  ${rhr != null ? rhr + ' bpm' : '—'}  (goal: <50 bpm)`)
if (fitbod) {
  lines.push(`  Fitbod:      Overall ${fitbod.overall} · Push ${fitbod.push} · Pull ${fitbod.pull} · Legs ${fitbod.legs}  (target: ≥65)`)
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

// ── Injuries ──────────────────────────────────────────────────────────────────
const activeInjuries = injuries.filter((i: any) => i.status !== 'resolved')
if (activeInjuries.length > 0) {
  lines.push('\n## INJURIES\n')
  lines.push(`  ⚠  Active injuries (${activeInjuries.length}):`)
  for (const inj of activeInjuries) {
    const daysSinceOnset = daysAgo(inj.date_onset)
    const onsetLabel = daysSinceOnset === 0 ? 'today' : daysSinceOnset === 1 ? '1 day ago' : `${daysSinceOnset} days ago`
    lines.push(`  • ${inj.body_part} — ${inj.injury_type} (${inj.severity}, ${inj.status}, onset ${onsetLabel})`)
    if (inj.affected_movements?.length > 0) {
      lines.push(`    Avoid: ${inj.affected_movements.join(', ')}`)
    }
    if (inj.rehab_exercises?.length > 0) {
      lines.push(`    Rehab: ${inj.rehab_exercises.join(', ')}`)
    }
    if (inj.notes) {
      lines.push(`    Notes: ${inj.notes}`)
    }
  }
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
    for (const phase of prog.phases) {
      const start = new Date(phase.start_date)
      const end = new Date(phase.end_date)
      if (TODAY >= start && TODAY <= end) {
        lines.push(`  Current phase: ${phase.name} [${phase.type ?? ''}] (${phase.start_date} → ${phase.end_date})`)
        lines.push(`  Phase focus: ${phase.focus ?? '—'}`)
        // Find current week within the phase
        const currentWeek = (phase.weeks ?? []).find((w: any) => todayStr >= w.start_date && todayStr <= w.end_date)
        if (currentWeek) {
          lines.push(`  Week ${currentWeek.week}: vol ×${currentWeek.volume_modifier}  int ×${currentWeek.intensity_modifier}  ${currentWeek.calorie_target} kcal  ${currentWeek.protein_target_g}g protein`)
          if (currentWeek.notes) lines.push(`  Week notes: ${currentWeek.notes}`)
        }
        // Show today's split from weekly_split
        const dayOfWeek = TODAY.toLocaleDateString('en-US', { weekday: 'short' })
        const splitDay = (prog.weekly_split ?? []).find((d: any) => d.day === dayOfWeek)
        if (splitDay) {
          lines.push(`  Today's planned focus (${dayOfWeek}): ${splitDay.focus}`)
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

// ── Muscle volume balance ─────────────────────────────────────────────────────
lines.push('\n## MUSCLE VOLUME BALANCE (last 7 days vs MEV/MRV)\n')

// Build exercise lookup from taxonomy
const taxExercises: any[] = taxonomy.exercises ?? []
const taxLookup = new Map<string, any>()
for (const ex of taxExercises) {
  taxLookup.set(ex.name.toLowerCase(), ex)
  for (const alias of ex.aliases ?? []) {
    taxLookup.set(alias.toLowerCase(), ex)
  }
}

// Count sets per muscle and pattern in last 7 days
const muscleSets7d = new Map<string, number>()
const patternSets7d = new Map<string, number>()

for (const w of allWorkouts) {
  if (daysAgo(w.date) > 7) continue
  if (w.type !== 'strength' && w.type !== 'hybrid') continue
  for (const ex of w.exercises ?? []) {
    const entry = taxLookup.get(ex.name.toLowerCase())
    if (!entry) continue
    const n = (ex.sets ?? []).length
    for (const muscle of entry.primary ?? []) {
      muscleSets7d.set(muscle, (muscleSets7d.get(muscle) ?? 0) + n)
    }
    const pattern = entry.pattern
    patternSets7d.set(pattern, (patternSets7d.get(pattern) ?? 0) + n)
  }
}

// Also count over 28 days for weekly average comparison
const muscleSets28d = new Map<string, number>()
for (const w of allWorkouts) {
  if (daysAgo(w.date) > 28) continue
  if (w.type !== 'strength' && w.type !== 'hybrid') continue
  for (const ex of w.exercises ?? []) {
    const entry = taxLookup.get(ex.name.toLowerCase())
    if (!entry) continue
    const n = (ex.sets ?? []).length
    for (const muscle of entry.primary ?? []) {
      muscleSets28d.set(muscle, (muscleSets28d.get(muscle) ?? 0) + n)
    }
  }
}

const landmarks: Record<string, any> = taxonomy.volume_landmarks ?? {}
const underMEV: string[] = []
const overMRV: string[] = []
const muscleLines: string[] = []

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', lats: 'Lats', upper_back: 'Upper back',
  front_delts: 'Front delts', rear_delts: 'Rear delts',
  triceps: 'Triceps', biceps: 'Biceps', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', lower_back: 'Lower back', abs: 'Abs',
}

for (const [muscle, lm] of Object.entries(landmarks).filter(([k]) => !k.startsWith('_'))) {
  const s7  = muscleSets7d.get(muscle)  ?? 0
  const s28 = muscleSets28d.get(muscle) ?? 0
  const weekly = s28 / 4
  const label = MUSCLE_LABELS[muscle] ?? muscle

  let statusSymbol: string
  if (weekly < lm.mev) {
    statusSymbol = '⚠'
    underMEV.push(label)
  } else if (weekly > lm.mrv) {
    statusSymbol = '↑'
    overMRV.push(label)
  } else {
    statusSymbol = '✓'
  }

  muscleLines.push(
    `  ${statusSymbol}  ${label.padEnd(14)} ${String(s7).padStart(2)} sets/7d  (MEV ${lm.mev}–MRV ${lm.mrv}, 4wk avg: ${r1(weekly)})`
  )
}

lines.push(...muscleLines)

// Push:Pull ratio
const pushSets = patternSets7d.get('push') ?? 0
const pullSets = patternSets7d.get('pull') ?? 0
const ratio = pullSets > 0 ? Math.round((pushSets / pullSets) * 100) / 100 : null

lines.push('')
lines.push(`  Movement patterns (7d): Push ${pushSets} · Pull ${pullSets} · Hinge ${patternSets7d.get('hinge') ?? 0} · Squat ${patternSets7d.get('squat') ?? 0} · Core ${patternSets7d.get('core') ?? 0}`)
if (ratio !== null) {
  const { optimal_min, optimal_max } = taxonomy.push_pull_ratio ?? { optimal_min: 0.8, optimal_max: 1.2 }
  const ratioStatus = ratio > optimal_max
    ? `⚠  push-dominant (${ratio}×) — elevated anterior shoulder risk`
    : ratio < optimal_min
    ? `~  pull-dominant (${ratio}×)`
    : `✓  balanced (${ratio}×)`
  lines.push(`  Push:Pull ratio: ${ratioStatus}`)
}
if (underMEV.length > 0) {
  lines.push(`\n  ⚠  Below MEV (may need more volume): ${underMEV.join(', ')}`)
}
if (overMRV.length > 0) {
  lines.push(`  ↑  Above MRV (recovery watch): ${overMRV.join(', ')}`)
}

// ── Footer ────────────────────────────────────────────────────────────────────
lines.push('\n' + hr)
lines.push('  Use this snapshot to inform training recommendations for today or the next few days.')
lines.push('  Read fitness-tracker.md for full goals, program, and event context.')
lines.push(hr + '\n')

console.log(lines.join('\n'))
