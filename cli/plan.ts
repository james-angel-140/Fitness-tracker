/**
 * plan.ts
 *
 * Generates a rolling AI-powered training plan using the Claude API.
 *
 * Sends to Claude:
 *   - Current fitness context (sleep, HRV, training load, stats)
 *   - Existing program + when it was last generated
 *   - Goals and upcoming events
 *   - Sport science steering instructions
 *
 * Returns a structured JSON plan matching schema/program.ts,
 * written to data/programs/ai-plan-YYYY-MM-DD.json
 *
 * Usage:
 *   npm run plan
 *
 * Requires:
 *   ANTHROPIC_API_KEY environment variable
 */

import 'dotenv/config'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

const DATA_DIR = join(__dirname, '../data')
const TODAY = new Date()
const TODAY_STR = TODAY.toISOString().slice(0, 10)

// Extra context passed via CLI, e.g: npm run plan -- "heavy night out, feeling rough"
const EXTRA_CONTEXT = process.argv.slice(2).join(' ').trim()

// ─── Check API key ────────────────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.')
  console.error('Get your key at: https://console.anthropic.com/settings/keys')
  console.error('Then run: export ANTHROPIC_API_KEY=sk-ant-...')
  process.exit(1)
}

const client = new Anthropic()

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

const existingPrograms = readdirSync(join(DATA_DIR, 'programs'))
  .filter(f => f.endsWith('.json'))
  .map(f => ({
    filename: f,
    data: JSON.parse(readFileSync(join(DATA_DIR, 'programs', f), 'utf-8')),
  }))

const eventFiles = existsSync(join(DATA_DIR, 'events'))
  ? readdirSync(join(DATA_DIR, 'events'))
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(DATA_DIR, 'events', f), 'utf-8')))
  : []

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
  if (w.cardio_subtype === 'stationary-bike') return 5
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
  const fitbod = latestMetric('fitbod')

  lines.push(`Weight: ${latestWeight?.weight_kg ?? '—'} kg (goal: 75 kg)`)
  lines.push(`Body Fat: ${bf != null ? bf + '%' : '—'} (goal: 14%)`)
  lines.push(`VO2 Max: ${vo2 ?? '—'} (target: 45+)`)
  lines.push(`Resting HR: ${rhr != null ? rhr + ' bpm' : '—'} (goal: <50 bpm)`)
  if (fitbod) {
    lines.push(`Fitbod: Overall ${fitbod.overall} · Push ${fitbod.push} · Pull ${fitbod.pull} · Legs ${fitbod.legs} (floor: 58)`)
  }

  const recentWeights = weightLog.entries.filter((e: any) => daysAgo(e.date) <= 7)
  if (recentWeights.length >= 2) {
    const change = r1(recentWeights.at(-1).weight_kg - recentWeights[0].weight_kg)
    lines.push(`Weight trend (7d): ${change > 0 ? '+' : ''}${change} kg`)
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
      if (e.deep_hr) parts.push(`deep ${e.deep_hr}h`)
      if (e.rem_hr) parts.push(`REM ${e.rem_hr}h`)
      lines.push('  ' + parts.join(', '))
    }
    // HRV warning
    const latest = recentSleep.at(-1)
    if (latest?.hrv_ms != null && avgHrv != null) {
      const drop = ((avgHrv - latest.hrv_ms) / avgHrv) * 100
      if (drop > 15) lines.push(`  ⚠ HRV dropped ${Math.round(drop)}% below average — recovery concern`)
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
      if (w.distance_km) parts.push(`${w.distance_km}km`)
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
  lines.push(`ATL (7-day avg TRIMP): ${atl}`)
  lines.push(`CTL (28-day avg TRIMP): ${ctl}`)
  lines.push(`ACWR: ${acwr} (optimal range: 0.8–1.3)`)

  // ── Personal records ──
  lines.push('\n## PERSONAL RECORDS')
  const keyLifts = ['Barbell Bench Press', 'Deadlift', 'Leg Press', 'Pull-up', 'Back Squat']
  for (const lift of keyLifts) {
    const pr = prs.find((p: any) => p.lift === lift)
    if (pr && pr.current_best_kg != null) {
      lines.push(`  ${pr.lift}: ${pr.current_best_kg}kg × ${pr.current_best_reps} (${pr.current_best_date})`)
    } else if (pr) {
      lines.push(`  ${pr.lift}: ${pr.current_best_reps} reps (${pr.current_best_date})`)
    }
  }

  // ── Upcoming events ──
  if (eventFiles.length > 0) {
    lines.push('\n## UPCOMING EVENTS')
    for (const event of eventFiles) {
      const daysUntil = Math.ceil((new Date(event.date).getTime() - TODAY.getTime()) / 86_400_000)
      lines.push(`${event.name} — ${event.date} (${daysUntil} days away)`)
      lines.push(`  Goal: ${event.goal}`)
      if (event.training_focus) lines.push(`  Training focus: ${event.training_focus}`)
      if (event.taper_plan) lines.push(`  Taper plan: ${event.taper_plan}`)
      if (event.prep_notes) lines.push(`  Prep notes: ${event.prep_notes}`)
    }
  }

  // ── Existing program ──
  if (existingPrograms.length > 0) {
    lines.push('\n## EXISTING PROGRAM (for reference and continuity)')
    for (const prog of existingPrograms) {
      lines.push(`File: ${prog.filename}`)
      lines.push(JSON.stringify(prog.data, null, 2))
    }
  }

  return lines.join('\n')
}

// ─── Program JSON schema for structured output ────────────────────────────────

const PROGRAM_SCHEMA = {
  type: 'object',
  properties: {
    id:                 { type: 'string' },
    name:               { type: 'string' },
    goal:               { type: 'string' },
    start_date:         { type: 'string' },
    end_date:           { type: 'string' },
    days_per_week:      { type: 'number' },
    rest_days_per_week: { type: 'number' },
    taper_start_date:   { type: 'string' },
    notes:              { type: 'string' },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:          { type: 'string' },
          start_date:    { type: 'string' },
          end_date:      { type: 'string' },
          duration_days: { type: 'number' },
          focus:         { type: 'string' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_of_week: { type: 'string' },
                date:        { type: 'string' },
                focus:       { type: 'string' },
                session:     { type: 'string' },
              },
              required: ['day_of_week', 'date', 'focus', 'session'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'start_date', 'end_date', 'duration_days', 'focus', 'days'],
        additionalProperties: false,
      },
    },
  },
  required: ['id', 'name', 'goal', 'start_date', 'end_date', 'days_per_week', 'rest_days_per_week', 'phases'],
  additionalProperties: false,
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite exercise physiologist and sports scientist. Your job is to generate personalized, data-driven training plans that peak the athlete for their goals and upcoming events.

## Load Management (ATL/CTL/ACWR)
Use the athlete's training load data to drive all scheduling decisions:
- Optimal ACWR: 0.8–1.3. Above 1.3 = elevated injury risk, reduce load before adding stimulus
- CTL should rise gradually during build phases — avoid large week-on-week spikes
- If ACWR is already high at plan generation time, start the plan conservatively and let load settle before building

## Training Priorities
Derive the athlete's training priorities directly from their goals, upcoming events, and current fitness data. Don't apply generic sport templates — read what matters most given where they are right now, how far out the event is, and what their weakest links are. Structure phases around those priorities.

## Recovery
Let the recovery data drive rest day placement and session intensity. Use HRV trends, sleep quality, and ACWR together — not any single metric in isolation. The plan should be responsive to the athlete's actual recovery capacity, not a fixed rule.

## Session Design
- **Zone 2 cardio:** strict HR 120–130 bpm. Pace follows HR — never chase pace. Include duration target.
- **Strength sessions:** the athlete uses Fitbod for exercise selection and progressive overload. Your job is to direct the session type and focus — e.g. "Lower body — posterior chain focus" or "Upper body — push focus (chest, shoulders, triceps)" or "Upper body — pull focus (back, biceps)". Fitbod handles the rest.
- **All other sessions** (simulations, intervals, etc.): be specific — include structure, targets, and intent.

## Plan Continuity
An existing program will be provided for reference. Your default position should be to keep it — don't change things for the sake of it. Only deviate from the existing plan when the data gives you a clear reason to:
- ACWR is outside the 0.8–1.3 window and the current plan would make it worse
- Recovery signals (HRV, sleep) suggest the planned load is too high for the coming days
- Extra context provided by the athlete (illness, travel, soreness, life events) changes what's appropriate
- The event timeline has shifted enough that the phase structure no longer makes sense

If the existing plan is broadly sound and load is in range, carry it forward with minimal changes. Preference continuity over novelty.

## Output Rules
- Generate a complete plan from today to the event date, organised into meaningful phases
- Each phase must have a clear strategic purpose
- Session entries must be specific and actionable — include enough detail that the athlete knows exactly what to do and why
- Date every session with the actual ISO date (YYYY-MM-DD)
- Recommend the optimal number of sessions per week based on the data — don't default to a fixed number
- The id field must be: "ai-plan-${TODAY_STR}"`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generatePlan() {
  const context = buildContext()

  console.log(`Generating training plan with Claude Opus...`)
  console.log(`Today: ${TODAY_STR}`)
  if (EXTRA_CONTEXT) console.log(`Extra context: "${EXTRA_CONTEXT}"`)
  console.log('')

  let dotInterval: ReturnType<typeof setInterval> | null = setInterval(
    () => process.stdout.write('.'),
    800
  )

  let message: Anthropic.Message
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my current fitness data. Generate an optimised training plan from today (${TODAY_STR}) through my next event, accounting for my current load, recovery state, and any existing program structure.${EXTRA_CONTEXT ? `\n\n## ADDITIONAL CONTEXT FROM ATHLETE\n${EXTRA_CONTEXT}` : ''}\n\n${context}`,
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: PROGRAM_SCHEMA,
        },
      },
    })

    message = await stream.finalMessage()
  } finally {
    if (dotInterval) {
      clearInterval(dotInterval)
      dotInterval = null
      console.log('\n')
    }
  }

  // Extract and parse the JSON response
  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) {
    console.error('No text block in response')
    process.exit(1)
  }

  let plan: any
  try {
    plan = JSON.parse(textBlock.text)
  } catch (e) {
    console.error('Failed to parse response as JSON:', e)
    console.error('Raw response:', textBlock.text.slice(0, 500))
    process.exit(1)
  }

  // Write plan to data/programs/
  const filename = `ai-plan-${TODAY_STR}.json`
  const outputPath = join(DATA_DIR, 'programs', filename)
  writeFileSync(outputPath, JSON.stringify(plan, null, 2))

  console.log(`Plan written to: data/programs/${filename}`)
  console.log('')

  // Summary
  const totalSessions = plan.phases.reduce((s: number, p: any) => s + p.days.length, 0)
  console.log(`${plan.name}`)
  console.log(`${plan.start_date} → ${plan.end_date}`)
  console.log(`${plan.phases.length} phases · ${totalSessions} sessions`)
  console.log('')

  for (const phase of plan.phases) {
    console.log(`  ${phase.name} (${phase.start_date} → ${phase.end_date})`)
    console.log(`  ${phase.focus}`)
    for (const day of phase.days) {
      console.log(`    ${day.date} ${day.day_of_week}: ${day.focus}`)
    }
    console.log('')
  }

  console.log(`Tokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`)
}

generatePlan().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
