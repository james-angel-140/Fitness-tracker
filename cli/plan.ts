/**
 * plan.ts
 *
 * Generates a new mesocycle using the Claude API.
 *
 * Sends to Claude:
 *   - Current stats, body comp, strength levels, PRs
 *   - 7-day sleep & HRV recovery data
 *   - 14-day training history + ACWR/CTL load metrics
 *   - Per-muscle volume status (MEV/MAV/MRV) over last 28 days
 *   - Active injuries and constraints
 *   - Existing mesocycle (for continuity)
 *   - Goal context (lean mass, shoulder health priority)
 *
 * Returns a Mesocycle JSON written to data/programs/mesocycle-YYYY-MM-DD.json
 *
 * Usage:
 *   npm run plan
 *   npm run plan -- "I want to add more leg frequency this block"
 *
 * After accepting: removes old mesocycle file, preloads sessions, optionally deploys.
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import 'dotenv/config'
import { readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import * as readline from 'readline'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

const DATA_DIR = join(__dirname, '../data')
const TODAY = new Date()
const TODAY_STR = TODAY.toISOString().slice(0, 10)
const EXTRA_CONTEXT = process.argv.slice(2).join(' ').trim()

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.')
  process.exit(1)
}

const client = new Anthropic()

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

const existingPrograms = readdirSync(join(DATA_DIR, 'programs'))
  .filter(f => f.endsWith('.json'))
  .map(f => ({ filename: f, data: JSON.parse(readFileSync(join(DATA_DIR, 'programs', f), 'utf-8')) }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(isoDate: string): number {
  return Math.floor((TODAY.getTime() - new Date(isoDate).getTime()) / 86_400_000)
}

function r1(n: number) { return Math.round(n * 10) / 10 }

function latestMetric(key: string): any {
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i][key] != null) return stats[i][key]
  }
  return null
}

function estimateRpe(w: any): number {
  if (w.rpe != null) return w.rpe
  if (w.type === 'walk') return 3
  if (w.cardio_subtype === 'zone2-run') return 4
  if (w.cardio_subtype === 'hiit') return 8
  if (w.cardio_subtype === 'run') return 7
  return 6
}

// ─── Build context payload ────────────────────────────────────────────────────

function buildContext(): string {
  const lines: string[] = []
  lines.push(`Today: ${TODAY_STR}`)

  // ── Stats ──
  lines.push('\n## CURRENT STATS')
  const latestWeight = weightLog.entries.at(-1)
  const vo2 = latestMetric('vo2_max')
  const rhr = latestMetric('resting_hr_bpm')
  const bf = latestMetric('body_fat_pct')
  lines.push(`Weight: ${latestWeight?.weight_kg ?? '—'} kg`)
  lines.push(`Body Fat: ${bf != null ? bf + '%' : '—'}`)
  lines.push(`VO2 Max: ${vo2 ?? '—'}`)
  lines.push(`Resting HR: ${rhr != null ? rhr + ' bpm' : '—'}`)

  const recentWeights = weightLog.entries.filter((e: any) => daysAgo(e.date) <= 14)
  if (recentWeights.length >= 2) {
    const change = r1(recentWeights.at(-1).weight_kg - recentWeights[0].weight_kg)
    lines.push(`Weight trend (14d): ${change > 0 ? '+' : ''}${change} kg  (${recentWeights[0].weight_kg} → ${recentWeights.at(-1).weight_kg} kg)`)
  }

  // ── Key PRs ──
  lines.push('\n## PERSONAL RECORDS (key lifts)')
  const keyLifts = ['Barbell Bench Press', 'Deadlift', 'Leg Press', 'Pull-up', 'Back Squat', 'Romanian Deadlift', 'Barbell Hip Thrust']
  for (const lift of keyLifts) {
    const pr = prs.find((p: any) => p.lift === lift)
    if (pr && pr.current_best_kg != null) {
      lines.push(`  ${pr.lift}: ${pr.current_best_kg}kg × ${pr.current_best_reps} (${pr.current_best_date})`)
    } else if (pr) {
      lines.push(`  ${pr.lift}: ${pr.current_best_reps} reps (${pr.current_best_date})`)
    }
  }

  // ── Sleep & recovery ──
  lines.push('\n## SLEEP & RECOVERY (last 7 days)')
  const recentSleep = sleepLog.entries.filter((e: any) => daysAgo(e.date) <= 7)
  if (recentSleep.length > 0) {
    const avgSleep = r1(recentSleep.reduce((s: number, e: any) => s + (e.sleep_hr ?? e.duration_hr), 0) / recentSleep.length)
    const hrvEntries = recentSleep.filter((e: any) => e.hrv_ms != null)
    const avgHrv = hrvEntries.length > 0
      ? Math.round(hrvEntries.reduce((s: number, e: any) => s + e.hrv_ms, 0) / hrvEntries.length)
      : null
    lines.push(`7-day avg: ${avgSleep}h sleep | HRV avg: ${avgHrv != null ? avgHrv + 'ms' : '—'}`)
    for (const e of [...recentSleep].reverse()) {
      const parts = [`${e.date}: ${e.sleep_hr ?? e.duration_hr}h`]
      if (e.hrv_ms != null) parts.push(`HRV ${e.hrv_ms}ms`)
      if (e.resting_hr != null) parts.push(`RHR ${e.resting_hr}bpm`)
      lines.push('  ' + parts.join(', '))
    }
  } else {
    lines.push('No sleep data in last 7 days.')
  }

  // ── Training last 14 days ──
  lines.push('\n## TRAINING HISTORY (last 14 days)')
  const recentWorkouts = allWorkouts.filter(w => daysAgo(w.date) <= 14)
  if (recentWorkouts.length === 0) {
    lines.push('No sessions logged in last 14 days.')
  } else {
    for (const w of [...recentWorkouts].reverse()) {
      const label = w.cardio_subtype ? `${w.type} (${w.cardio_subtype})` : w.type
      const parts = [`${w.date}: ${label}, ${w.duration_min ?? '?'} min`]
      if (w.rpe) parts.push(`RPE ${w.rpe}`)
      if (w.avg_hr) parts.push(`avg HR ${w.avg_hr}bpm`)
      if (w.exercises?.length) parts.push(`${w.exercises.length} exercises`)
      if (w.notes) parts.push(w.notes)
      lines.push('  ' + parts.join(' — '))
    }
  }

  // ── Training load ──
  lines.push('\n## TRAINING LOAD')
  const trimpByDate = new Map<string, number>()
  for (const w of allWorkouts) {
    if (daysAgo(w.date) > 28) continue
    const dur = w.duration_min ?? 45
    const t = w.trimp ?? dur * estimateRpe(w)
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
  const atl = r1(rollingAvg(TODAY_STR, 7))
  const ctl = r1(rollingAvg(TODAY_STR, 28))
  const acwr = ctl > 0 ? r1(atl / ctl) : 0
  const tsb = r1(ctl - atl)
  lines.push(`ATL (7-day avg TRIMP): ${atl}`)
  lines.push(`CTL (28-day avg TRIMP): ${ctl}`)
  lines.push(`ACWR: ${acwr} (optimal 0.8–1.3; above 1.3 = elevated injury risk)`)
  lines.push(`TSB (form): ${tsb} (positive = fresh, negative = fatigue)`)

  // ── Muscle volume status ──
  lines.push('\n## MUSCLE VOLUME STATUS (last 28 days → 4-week avg sets/week)')

  const exerciseLookup = new Map<string, any>()
  for (const ex of taxonomy.exercises) {
    exerciseLookup.set(ex.name.toLowerCase(), ex)
    for (const alias of ex.aliases ?? []) {
      exerciseLookup.set(alias.toLowerCase(), ex)
    }
  }

  const muscleSets28d = new Map<string, number>()
  const patternSets7d = new Map<string, number>()

  for (const w of allWorkouts) {
    if (w.type !== 'strength' && w.type !== 'hybrid') continue
    for (const ex of w.exercises ?? []) {
      const entry = exerciseLookup.get(ex.name.toLowerCase())
      if (!entry) continue
      const n = (ex.sets ?? []).length
      if (daysAgo(w.date) <= 28) {
        for (const muscle of entry.primary ?? []) {
          muscleSets28d.set(muscle, (muscleSets28d.get(muscle) ?? 0) + n)
        }
      }
      if (daysAgo(w.date) <= 7) {
        patternSets7d.set(entry.pattern, (patternSets7d.get(entry.pattern) ?? 0) + n)
      }
    }
  }

  const landmarks: Record<string, any> = taxonomy.volume_landmarks ?? {}
  const underMEV: string[] = []
  const overMRV: string[] = []

  for (const [muscle, lm] of Object.entries(landmarks).filter(([k]) => !k.startsWith('_'))) {
    const s28 = muscleSets28d.get(muscle) ?? 0
    const weekly = r1(s28 / 4)
    let status: string
    if (weekly < (lm as any).mev) { status = '⚠ BELOW MEV'; underMEV.push(muscle) }
    else if (weekly > (lm as any).mrv) { status = '↑ ABOVE MRV'; overMRV.push(muscle) }
    else { status = '✓ in range' }
    lines.push(`  ${muscle.padEnd(14)} ${String(weekly).padStart(4)} sets/wk  (MEV ${(lm as any).mev}–MRV ${(lm as any).mrv})  ${status}`)
  }

  const pushSets = patternSets7d.get('push') ?? 0
  const pullSets = patternSets7d.get('pull') ?? 0
  const ratio = pullSets > 0 ? r1(pushSets / pullSets) : null
  const { optimal_min, optimal_max } = taxonomy.push_pull_ratio ?? { optimal_min: 0.8, optimal_max: 1.2 }
  lines.push('')
  lines.push(`Movement patterns (7d): Push ${pushSets} · Pull ${pullSets} · Hinge ${patternSets7d.get('hinge') ?? 0} · Squat ${patternSets7d.get('squat') ?? 0}`)
  if (ratio !== null) {
    const ratioStatus = ratio > optimal_max ? `⚠ push-dominant (${ratio}×)` : ratio < optimal_min ? `pull-dominant (${ratio}×)` : `✓ balanced (${ratio}×)`
    lines.push(`Push:Pull ratio: ${ratioStatus}`)
  }
  if (underMEV.length > 0) lines.push(`\n  ⚠ Below MEV: ${underMEV.join(', ')} — need more volume`)
  if (overMRV.length > 0) lines.push(`  ↑ Above MRV: ${overMRV.join(', ')} — watch recovery`)

  // ── Injuries ──
  const activeInjuries = injuries.filter((i: any) => i.status !== 'resolved')
  if (activeInjuries.length > 0) {
    lines.push('\n## INJURIES (non-negotiable constraints)')
    for (const inj of activeInjuries) {
      lines.push(`  ⚠ ${inj.body_part} — ${inj.injury_type} (${inj.severity}, ${inj.status}, onset ${inj.date_onset})`)
      if (inj.affected_movements?.length > 0) lines.push(`    Avoid: ${inj.affected_movements.join(', ')}`)
      if (inj.rehab_exercises?.length > 0) lines.push(`    Rehab: ${inj.rehab_exercises.join(', ')}`)
      if (inj.notes) lines.push(`    Notes: ${inj.notes}`)
    }
  }

  // ── Existing mesocycle ──
  if (existingPrograms.length > 0) {
    lines.push('\n## EXISTING MESOCYCLE (for continuity)')
    for (const prog of existingPrograms) {
      lines.push(`File: ${prog.filename}`)
      lines.push(JSON.stringify(prog.data, null, 2))
    }
  }

  return lines.join('\n')
}

// ─── Mesocycle JSON schema ────────────────────────────────────────────────────

const MESOCYCLE_SCHEMA = {
  type: 'object',
  properties: {
    id:                  { type: 'string' },
    name:                { type: 'string' },
    goal:                { type: 'string' },
    start_date:          { type: 'string' },
    end_date:            { type: 'string' },
    baseline_calories:   { type: 'number' },
    baseline_protein_g:  { type: 'number' },
    notes:               { type: 'string' },
    weekly_split: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day:            { type: 'string' },
          focus:          { type: 'string' },
          muscle_groups:  { type: 'array', items: { type: 'string' } },
        },
        required: ['day', 'focus', 'muscle_groups'],
        additionalProperties: false,
      },
    },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:                     { type: 'string' },
          type:                     { type: 'string', enum: ['accumulation', 'intensification', 'deload'] },
          start_date:               { type: 'string' },
          end_date:                 { type: 'string' },
          focus:                    { type: 'string' },
          training_days_per_week:   { type: 'number' },
          zone2_sessions_per_week:  { type: 'number' },
          weeks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week:                 { type: 'number' },
                start_date:           { type: 'string' },
                end_date:             { type: 'string' },
                volume_modifier:      { type: 'number' },
                intensity_modifier:   { type: 'number' },
                calorie_target:       { type: 'number' },
                protein_target_g:     { type: 'number' },
                notes:                { type: 'string' },
              },
              required: ['week', 'start_date', 'end_date', 'volume_modifier', 'intensity_modifier', 'calorie_target', 'protein_target_g'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'type', 'start_date', 'end_date', 'focus', 'training_days_per_week', 'zone2_sessions_per_week', 'weeks'],
        additionalProperties: false,
      },
    },
  },
  required: ['id', 'name', 'goal', 'start_date', 'end_date', 'baseline_calories', 'baseline_protein_g', 'weekly_split', 'phases'],
  additionalProperties: false,
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert exercise physiologist and hypertrophy coach. Your job is to design data-driven mesocycles for lean mass accumulation and body recomposition.

## Goal
The athlete's primary goal is to maximise lean muscle mass while staying lean (body recomp). No upcoming events. Cardio is supportive — 1–2 Zone 2 sessions per week only, never the focus.

## Shoulder Health (critical constraint)
The athlete has a history of anterior shoulder impingement caused by front delt dominance. The weekly split and volume targets must always ensure:
- Rear delt direct work (face pulls, rear delt flies, reverse pec deck) is included every pull session
- rear_delts weekly sets must be equal to or greater than front_delts weekly sets
- Front delt MEV/MRV is intentionally lower than rear delt targets because bench press and OHP already provide secondary front delt stimulus
- Flag in the notes if any proposed week has rear_delts volume below MEV

## Mesocycle Structure
Design a 5–6 week block with this structure:
1. Accumulation (4–5 weeks): start near MEV, add 1–2 sets per muscle per week, peak near MAV/MRV by week 4
2. Deload (1 week): ~50% of peak volume, 60–70% of peak intensity, slight calorie reduction

## Nutrition Cycling
Set calorie and protein targets per week that align with training demand:
- Accumulation: slight surplus above TDEE (+150–300 kcal). More volume weeks = slightly higher calories.
- Deload: slight reduction (~200–300 below TDEE) since training stress drops
- Protein: 1.8–2.2g per kg body weight daily, consistent across all weeks
- baseline_calories and baseline_protein_g should reflect estimated TDEE for this athlete

## Weekly Split
Design a 4-day training split that:
- Has dedicated push, pull, and leg days
- Includes a second upper day focused on rear delts and arms (to fix the imbalance)
- Zone 2 cardio on 1–2 non-strength days
- At least 1 full rest day

## Volume Progression
Use the athlete's actual muscle volume data to determine starting sets for week 1:
- If a muscle is below MEV, week 1 starts at MEV
- If already above MEV, continue from current level
- Add 1–2 sets per muscle per week during accumulation
- Never exceed MRV in any week

## Load Management
- ACWR should stay 0.8–1.3 throughout the block
- If current ACWR is elevated, start week 1 conservatively
- volume_modifier: 1.0 = baseline, build to ~1.3 at peak, drop to ~0.5 for deload
- intensity_modifier: 1.0 = ~70–75% 1RM, build to ~1.1 at peak, drop to ~0.65 for deload

## Output Rules
- id must be "mesocycle-${TODAY_STR}"
- Dates must be real calendar dates starting from today
- Each week needs start_date and end_date as actual ISO dates
- The weekly_split array should cover all 7 days (Mon–Sun) including rest and cardio days
- Each week's notes should briefly explain the focus and any key adjustments for that week`

// ─── CLI helpers ──────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, answer => resolve(answer.trim())))
}

function showSummary(meso: any, message: Anthropic.Message) {
  const totalWeeks = meso.phases.reduce((s: number, p: any) => s + (p.weeks?.length ?? 0), 0)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(meso.name)
  console.log(`${meso.start_date} → ${meso.end_date}  (${totalWeeks} weeks)`)
  console.log(`Baseline: ${meso.baseline_calories} kcal/day · ${meso.baseline_protein_g}g protein`)
  console.log(`${'─'.repeat(60)}`)

  for (const phase of meso.phases) {
    console.log(`\n  ${phase.name} [${phase.type}]  ${phase.start_date} → ${phase.end_date}`)
    console.log(`  ${phase.focus}`)
    for (const week of phase.weeks ?? []) {
      console.log(`    Week ${week.week} (${week.start_date}): vol ×${week.volume_modifier}  int ×${week.intensity_modifier}  ${week.calorie_target} kcal  ${week.protein_target_g}g protein`)
    }
  }

  console.log('\n  Weekly split:')
  for (const day of meso.weekly_split ?? []) {
    console.log(`    ${day.day}: ${day.focus}`)
  }

  console.log(`\nTokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`)
  console.log(`${'─'.repeat(60)}\n`)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function generateMesocycle(extraContext: string): Promise<{
  meso: any
  filename: string
  outputPath: string
  message: Anthropic.Message
}> {
  const context = buildContext()

  console.log(`Generating mesocycle with Claude Opus...`)
  console.log(`Today: ${TODAY_STR}`)
  if (extraContext) console.log(`Extra context: "${extraContext}"`)
  console.log('')

  const dotInterval = setInterval(() => process.stdout.write('.'), 800)

  let message: Anthropic.Message
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate a new mesocycle starting from today (${TODAY_STR}). Use my current data to determine appropriate starting volumes, nutrition targets, and phase structure.${extraContext ? `\n\n## ADDITIONAL CONTEXT FROM ATHLETE\n${extraContext}` : ''}\n\n${context}`,
      }],
      output_config: {
        format: { type: 'json_schema', schema: MESOCYCLE_SCHEMA },
      },
    })
    message = await stream.finalMessage()
  } finally {
    clearInterval(dotInterval)
    console.log('\n')
  }

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) {
    console.error('No text block in response')
    process.exit(1)
  }

  let meso: any
  try {
    meso = JSON.parse(textBlock.text)
  } catch (e) {
    console.error('Failed to parse JSON response:', e)
    console.error('Raw response:', textBlock.text.slice(0, 500))
    process.exit(1)
  }

  const filename = `mesocycle-${TODAY_STR}.json`
  const outputPath = join(DATA_DIR, 'programs', filename)
  writeFileSync(outputPath, JSON.stringify(meso, null, 2))
  console.log(`Draft saved: data/programs/${filename}`)

  return { meso, filename, outputPath, message }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let extraContext = EXTRA_CONTEXT
  let { meso, filename, outputPath, message } = await generateMesocycle(extraContext)

  showSummary(meso, message)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  process.on('exit', () => rl.close())

  try {
    while (true) {
      const answer = (await ask(rl, 'Accept (a) / Deny (d) / Suggest changes (s): ')).toLowerCase()

      if (answer === 'a' || answer === 'accept') {
        // Remove all other program files — accepted mesocycle becomes the active one
        const programsDir = join(DATA_DIR, 'programs')
        const others = readdirSync(programsDir).filter(f => f.endsWith('.json') && f !== filename)
        for (const f of others) {
          unlinkSync(join(programsDir, f))
          console.log(`  Removed: data/programs/${f}`)
        }
        console.log(`\nActive mesocycle: data/programs/${filename}`)

        // Preload sessions for the next 7 days
        console.log('\nPreloading sessions for next 7 days...')
        const preloadResult = spawnSync('npx', ['tsx', join(__dirname, 'preload-sessions.ts')], {
          stdio: 'inherit',
          cwd: join(__dirname, '..'),
        })
        if (preloadResult.status !== 0) {
          console.warn('Session preload failed — sessions will use AI at runtime.')
        }

        const deployAnswer = (await ask(rl, '\nDeploy to dashboard now? (y/n): ')).toLowerCase()
        if (deployAnswer === 'y' || deployAnswer === 'yes') {
          console.log('\nBuilding and deploying dashboard...')
          const result = spawnSync('npm', ['run', 'deploy'], { stdio: 'inherit', cwd: join(__dirname, '..') })
          if (result.status === 0) console.log('Dashboard deployed.')
          else console.error('Deploy failed — check output above.')
        }
        break

      } else if (answer === 'd' || answer === 'deny') {
        unlinkSync(outputPath)
        console.log(`Discarded: data/programs/${filename}`)
        break

      } else if (answer === 's' || answer === 'suggest') {
        const feedback = await ask(rl, 'Your feedback: ')
        if (!feedback) { console.log('No feedback entered.'); continue }
        unlinkSync(outputPath)
        extraContext = [extraContext, feedback].filter(Boolean).join('\n')
        console.log('\nRegenerating with your feedback...\n')
        const result = await generateMesocycle(extraContext)
        meso = result.meso; filename = result.filename; outputPath = result.outputPath; message = result.message
        showSummary(meso, message)
      } else {
        console.log('Please enter a, d, or s.')
      }
    }
  } finally {
    rl.close()
  }
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
