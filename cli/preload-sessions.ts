/**
 * preload-sessions.ts
 *
 * Pre-generates AI workout sessions for the next 7 non-rest days in the active
 * program and saves them to data/sessions/YYYY-MM-DD.json.
 *
 * Run on your computer (where ANTHROPIC_API_KEY is available) before deploying
 * to GitHub Pages. The dashboard reads these static files instead of calling
 * the API at runtime — so sessions are available on mobile with no backend.
 *
 * Usage:
 *   npm run preload-sessions
 *   npm run preload-sessions -- --force   # regenerate even if file exists
 *
 * Called automatically by npm run plan after accepting a new plan.
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import 'dotenv/config'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

const DATA_DIR = join(__dirname, '../data')
const SESSIONS_DIR = join(DATA_DIR, 'sessions')
const TODAY = new Date().toISOString().slice(0, 10)
const FORCE = process.argv.includes('--force')
const DAYS_AHEAD = 7

// ─── Check API key ─────────────────────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set.')
  process.exit(1)
}

const client = new Anthropic()

// ─── Load data ─────────────────────────────────────────────────────────────────

const taxonomy: any = JSON.parse(readFileSync(join(DATA_DIR, 'exercise-taxonomy.json'), 'utf-8'))
const prs: any[] = JSON.parse(readFileSync(join(DATA_DIR, 'personal-records.json'), 'utf-8'))

const workoutFiles = readdirSync(join(DATA_DIR, 'workouts'))
  .filter(f => f.endsWith('.json'))
  .sort()
const allWorkouts: any[] = workoutFiles.map(f =>
  JSON.parse(readFileSync(join(DATA_DIR, 'workouts', f), 'utf-8'))
)

const programFiles = readdirSync(join(DATA_DIR, 'programs')).filter(f => f.endsWith('.json'))
if (programFiles.length === 0) {
  console.error('No active program found in data/programs/. Run npm run plan first.')
  process.exit(1)
}
const program: any = JSON.parse(readFileSync(join(DATA_DIR, 'programs', programFiles[0]), 'utf-8'))

// ─── Derive next DAYS_AHEAD non-rest days from mesocycle weekly_split ─────────
//
// The new mesocycle format has a weekly_split (Mon–Sun with focus/muscle_groups)
// rather than per-date days[]. We project the split onto actual calendar dates
// and find the current week's phase/nutrition context for each day.

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getUpcomingDaysFromMesocycle(): { date: string; focus: string; session: string }[] {
  const weeklySplit: any[] = program.weekly_split ?? []

  if (weeklySplit.length === 0) {
    // Fallback: old format with phase.days[] arrays
    return (program.phases ?? [])
      .flatMap((phase: any) => phase.days ?? [])
      .filter((d: any) => d.date >= TODAY)
      .filter((d: any) => !/^rest/i.test(d.focus))
      .slice(0, DAYS_AHEAD)
  }

  // Build a lookup: day abbreviation → split entry
  const splitByDay = new Map<string, any>()
  for (const entry of weeklySplit) {
    splitByDay.set(entry.day, entry)
  }

  // Find the current mesocycle week and phase for a given date
  function getWeekContext(dateStr: string): { phase: any; week: any } | null {
    for (const phase of program.phases ?? []) {
      for (const week of phase.weeks ?? []) {
        if (dateStr >= week.start_date && dateStr <= week.end_date) {
          return { phase, week }
        }
      }
    }
    return null
  }

  const days: { date: string; focus: string; session: string }[] = []
  const startDate = new Date(TODAY)

  for (let i = 0; i < 14 && days.length < DAYS_AHEAD; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayAbbr = WEEKDAY_ABBR[d.getDay()]
    const splitEntry = splitByDay.get(dayAbbr)

    if (!splitEntry || /^rest/i.test(splitEntry.focus)) continue

    const ctx = getWeekContext(dateStr)
    const contextLines: string[] = []

    if (ctx) {
      contextLines.push(`Phase: ${ctx.phase.name} [${ctx.phase.type}] — ${ctx.phase.focus}`)
      contextLines.push(`Week ${ctx.week.week}: volume ×${ctx.week.volume_modifier}  intensity ×${ctx.week.intensity_modifier}`)
      contextLines.push(`Nutrition: ${ctx.week.calorie_target} kcal / ${ctx.week.protein_target_g}g protein today`)
      if (ctx.phase.type === 'deload') {
        contextLines.push(`DELOAD: 50% of normal sets, no failure, RPE ≤6`)
      } else if (ctx.phase.type === 'intensification') {
        contextLines.push(`INTENSIFICATION: slightly lower volume, push intensity`)
      } else {
        contextLines.push(`ACCUMULATION: build volume, RPE 7–8`)
      }
      if (ctx.week.notes) contextLines.push(`Week notes: ${ctx.week.notes}`)
    }

    if (splitEntry.muscle_groups?.length > 0) {
      contextLines.push(`Target muscles: ${splitEntry.muscle_groups.join(', ')}`)
    }

    days.push({
      date: dateStr,
      focus: splitEntry.focus,
      session: contextLines.join('\n'),
    })
  }

  return days
}

const upcomingDays = getUpcomingDaysFromMesocycle()

if (upcomingDays.length === 0) {
  console.log('No upcoming non-rest sessions found in the active program.')
  process.exit(0)
}

// ─── Build prompt (mirrors dashboard/src/lib/aiService.ts buildPrompt) ────────

function buildPrompt(sessionText: string, focus: string, date: string): string {
  // Exercise library
  const libraryLines = taxonomy.exercises.map((ex: any) => {
    const primary = ex.primary.join(', ')
    const secondary = ex.secondary.length ? ` | secondary: ${ex.secondary.join(', ')}` : ''
    const aliases = ex.aliases.length ? ` (aka ${ex.aliases.join(', ')})` : ''
    return `• ${ex.name}${aliases} [${ex.pattern}] — primary: ${primary}${secondary}`
  }).join('\n')

  // Muscle volume status (7-day rolling)
  const cutoff7 = new Date(TODAY)
  cutoff7.setDate(cutoff7.getDate() - 7)
  const cutoff7Str = cutoff7.toISOString().slice(0, 10)

  const cutoff28 = new Date(TODAY)
  cutoff28.setDate(cutoff28.getDate() - 28)
  const cutoff28Str = cutoff28.toISOString().slice(0, 10)

  // Build exercise lookup from taxonomy
  const exerciseLookup = new Map<string, any>()
  for (const ex of taxonomy.exercises) {
    exerciseLookup.set(ex.name.toLowerCase(), ex)
    for (const alias of ex.aliases) {
      exerciseLookup.set(alias.toLowerCase(), ex)
    }
  }

  // Count sets per muscle per window
  function countSets(cutoffStr: string): Map<string, number> {
    const counts = new Map<string, number>()
    for (const w of allWorkouts) {
      if (w.date < cutoffStr) continue
      if (w.type !== 'strength' && w.type !== 'hybrid') continue
      for (const ex of w.exercises ?? []) {
        const entry = exerciseLookup.get(ex.name.toLowerCase())
        if (!entry) continue
        for (const muscle of entry.primary) {
          counts.set(muscle, (counts.get(muscle) ?? 0) + ex.sets.length)
        }
      }
    }
    return counts
  }

  function countPatternSets(cutoffStr: string): Map<string, number> {
    const counts = new Map<string, number>()
    for (const w of allWorkouts) {
      if (w.date < cutoffStr) continue
      if (w.type !== 'strength' && w.type !== 'hybrid') continue
      for (const ex of w.exercises ?? []) {
        const entry = exerciseLookup.get(ex.name.toLowerCase())
        if (!entry) continue
        counts.set(entry.pattern, (counts.get(entry.pattern) ?? 0) + ex.sets.length)
      }
    }
    return counts
  }

  const sets7d = countSets(cutoff7Str)
  const sets28d = countSets(cutoff28Str)
  const pattern7d = countPatternSets(cutoff7Str)

  const landmarks = taxonomy.volume_landmarks as Record<string, { mev: number; mav_lo: number; mav_hi: number; mrv: number }>
  const volumeLines = Object.entries(landmarks)
    .filter(([k]) => !k.startsWith('_'))
    .map(([muscle, lm]: [string, any]) => {
      const s7 = sets7d.get(muscle) ?? 0
      const s28 = sets28d.get(muscle) ?? 0
      const weekly = s28 / 4
      const status = weekly < lm.mev ? '⬇ BELOW MEV' : weekly > lm.mrv ? '⬆ NEAR MRV' : '✓ optimal'
      return `  ${muscle.padEnd(12)} ${s7} sets/7d  (MEV ${lm.mev} – MRV ${lm.mrv})  ${status}`
    }).join('\n')

  // Push:pull ratio
  const pushSets = pattern7d.get('push') ?? 0
  const pullSets = pattern7d.get('pull') ?? 0
  const { optimal_min, optimal_max } = taxonomy.push_pull_ratio
  const ratio = pullSets > 0 ? Math.round((pushSets / pullSets) * 100) / 100 : null
  const ratioStatus = ratio === null ? 'no-data'
    : ratio > optimal_max ? 'push-dominant'
    : ratio < optimal_min ? 'pull-dominant'
    : 'optimal'
  const ratioLine = ratio !== null
    ? `Push:Pull ratio = ${ratio}× (${ratioStatus}) — push sets: ${pushSets}, pull sets: ${pullSets}`
    : 'Push:Pull ratio = no data yet'

  // Recent exercise history (last 20 strength workouts)
  const recentExercises: Record<string, { date: string; weight: string }[]> = {}
  allWorkouts
    .filter(w => w.exercises && w.exercises.length > 0)
    .slice(-20)
    .forEach(w => {
      w.exercises.forEach((ex: any) => {
        if (!recentExercises[ex.name]) recentExercises[ex.name] = []
        const weights = ex.sets.map((s: any) => s.weight_kg).filter(Boolean)
        const maxW = weights.length ? Math.max(...weights) : null
        const totalReps = ex.sets.reduce((s: number, set: any) => s + set.reps, 0)
        recentExercises[ex.name].push({
          date: w.date,
          weight: maxW ? `${maxW}kg × ${Math.round(totalReps / ex.sets.length)} reps avg` : `${totalReps} reps (BW)`,
        })
      })
    })

  const historyLines = Object.entries(recentExercises)
    .map(([name, entries]) => `  ${name}: ${entries.slice(0, 3).map(e => `${e.date} ${e.weight}`).join(' | ')}`)
    .join('\n')

  const prSummary = prs.map(p => `  ${p.lift}: ${p.current_best_kg ?? 'BW'}kg × ${p.current_best_reps}`).join('\n')

  return `You are a fitness AI coach. Design an optimal workout for the session below.

## Session (${date})
Focus: ${focus}
Context / constraints:
${sessionText}

## Exercise Library — use ONLY these exercises
${libraryLines}

## Current Muscle Volume Status (7-day rolling window)
${volumeLines}

## Push : Pull Balance
${ratioLine}

## Recent Exercise History (for progressive overload)
${historyLines || '  No history yet'}

## Personal Records
${prSummary || '  No PRs recorded'}

## Instructions
Return ONLY valid JSON — no markdown, no explanation.

If this is a REST day:
{"type":"rest","exercises":[],"cardio":null,"notes":"<one-sentence summary>"}

If this is a CARDIO day:
{"type":"cardio","exercises":[],"cardio":{"subtype":"zone2-run|run|hiit|other","target_duration_min":N,"target_hr_min":N,"target_hr_max":N},"notes":"<key HR or pacing cues>"}

If this is a STRENGTH or HYBRID day, design 4–6 main exercises and return:
{
  "type": "strength",
  "exercises": [
    {
      "name": "Exact name from the Exercise Library",
      "target_sets": 3,
      "target_reps": "8-12",
      "target_rpe": 7,
      "suggested_weight_kg": 72.5,
      "suggestion_note": "Last session 70kg × 8 — try 72.5kg",
      "is_bodyweight": false
    }
  ],
  "cardio": null,
  "notes": "<1-2 sentences: injury constraints or key cues>"
}

Exercise selection rules (apply in order):
1. Match the session focus — push day = push/press patterns, pull day = row/pull patterns, legs = squat/hinge patterns
2. Prioritise muscles marked BELOW MEV — they need volume most
3. Avoid muscles marked NEAR MRV — they are already approaching max recoverable volume
4. If push-dominant: lean toward more pull exercises this session; if pull-dominant: lean toward push
5. Alternate antagonist pairs where possible (e.g. row after press, leg curl after squat)
6. Use exact exercise names from the library — do not invent names outside the list
7. For bodyweight exercises (Pull Up, Dip): set is_bodyweight true and suggested_weight_kg null
8. Pull sessions MUST include at least one direct rear delt exercise (Face Pull, Cable Rear Delt Fly, or Reverse Pec Deck)
9. Progressive overload: if last session was completed strongly at same weight → suggest +2.5kg; else hold weight
10. Scale target_sets using the mesocycle volume_modifier from the session context (e.g. ×1.2 = ~20% more sets; ×0.5 deload = half sets)
11. Skip explicit warm-up sets — working sets only`
}

// ─── Generate one session ──────────────────────────────────────────────────────

async function generateSession(day: { date: string; focus: string; session: string }): Promise<any> {
  const prompt = buildPrompt(day.session, day.focus, day.date)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.content.find((b): b is Anthropic.TextBlock => b.type === 'text'))?.text ?? ''

  // Strip markdown code fences if model wrapped the JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  return JSON.parse(cleaned)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Preloading sessions for next ${DAYS_AHEAD} non-rest days from ${TODAY}...\n`)

  let generated = 0
  let skipped = 0

  for (const day of upcomingDays) {
    const outputPath = join(SESSIONS_DIR, `${day.date}.json`)

    if (!FORCE && existsSync(outputPath)) {
      console.log(`  ✓ ${day.date}  ${day.focus}  (already cached — skipping)`)
      skipped++
      continue
    }

    process.stdout.write(`  ⟳ ${day.date}  ${day.focus}...`)

    try {
      const session = await generateSession(day)
      writeFileSync(outputPath, JSON.stringify(session, null, 2))
      console.log(`  done`)
      generated++
    } catch (err: any) {
      console.log(`  FAILED — ${err.message ?? err}`)
    }
  }

  console.log(`\nDone. ${generated} generated, ${skipped} skipped.`)
  if (generated > 0) {
    console.log(`Sessions saved to data/sessions/ — deploy to make them available on mobile.`)
  }
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
