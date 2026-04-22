// AI service — resolution order:
//   1. Pre-generated session file from data/sessions/YYYY-MM-DD.json (static, works on mobile)
//   2. Vite dev-server middleware (/api/ai/parse-workout) — requires API key on desktop
//   3. Local keyword extraction fallback (always available)

import { getSuggestion } from '@/lib/progressiveOverload'
import { workouts, prs, muscleVolume, patternVolume, pushPullRatio7d, pushPullStatus } from '@/lib/data'
import taxonomyRaw from '@data/exercise-taxonomy.json'

// Pre-generated sessions — bundled at build time, available with no API call
const preloadedSessions = import.meta.glob('@data/sessions/*.json', { eager: true })
import {
  type ParsedSession,
  type ActiveExercise,
  makeExerciseId,
  defaultSets,
} from '@/lib/activeWorkout'

// ─── AI request/response types ────────────────────────────────────────────────

interface AIExercise {
  name: string
  target_sets: number
  target_reps: string
  target_rpe: number | null
  suggested_weight_kg: number | null
  suggestion_note: string
  is_bodyweight: boolean
}

interface AIResponse {
  type: 'strength' | 'cardio' | 'rest' | 'hybrid'
  exercises: AIExercise[]
  cardio: {
    subtype: 'zone2-run' | 'run' | 'hiit' | 'other'
    target_duration_min: number
    target_hr_min: number | null
    target_hr_max: number | null
  } | null
  notes: string
}

// ─── Build the prompt ─────────────────────────────────────────────────────────

const taxonomy = taxonomyRaw as typeof taxonomyRaw

function buildPrompt(sessionText: string, focus: string, date: string): string {
  // ── Exercise library section ────────────────────────────────────────────────
  const libraryLines = taxonomy.exercises.map((ex) => {
    const primary = ex.primary.join(', ')
    const secondary = ex.secondary.length ? ` | secondary: ${ex.secondary.join(', ')}` : ''
    const aliases = (ex.aliases as string[]).length ? ` (aka ${(ex.aliases as string[]).join(', ')})` : ''
    return `• ${ex.name}${aliases} [${ex.pattern}] — primary: ${primary}${secondary}`
  }).join('\n')

  // ── Muscle volume status section ────────────────────────────────────────────
  const volumeLines = muscleVolume.map((m) => {
    const label = m.status_7d === 'under' ? '⬇ BELOW MEV' : m.status_7d === 'over' ? '⬆ NEAR MRV' : '✓ optimal'
    return `  ${m.muscle.padEnd(12)} ${m.sets_7d} sets/7d  (MEV ${m.mev} – MRV ${m.mrv})  ${label}`
  }).join('\n')

  // ── Push:pull ratio ─────────────────────────────────────────────────────────
  const pushSets = patternVolume.find((p) => p.pattern === 'push')?.sets_7d ?? 0
  const pullSets = patternVolume.find((p) => p.pattern === 'pull')?.sets_7d ?? 0
  const ratioLine = pushPullRatio7d !== null
    ? `Push:Pull ratio = ${pushPullRatio7d}× (${pushPullStatus}) — push sets: ${pushSets}, pull sets: ${pullSets}`
    : 'Push:Pull ratio = no data yet'

  // ── Recent exercise history for progressive overload ────────────────────────
  const recentExercises: Record<string, { date: string; weight: string }[]> = {}
  workouts
    .filter((w) => w.exercises && w.exercises.length > 0)
    .slice(-20)
    .forEach((w) => {
      w.exercises!.forEach((ex) => {
        if (!recentExercises[ex.name]) recentExercises[ex.name] = []
        const weights = ex.sets.map((s) => s.weight_kg).filter(Boolean)
        const maxW = weights.length ? Math.max(...(weights as number[])) : null
        const totalReps = ex.sets.reduce((s, set) => s + set.reps, 0)
        recentExercises[ex.name].push({
          date: w.date,
          weight: maxW ? `${maxW}kg × ${Math.round(totalReps / ex.sets.length)} reps avg` : `${totalReps} reps (BW)`,
        })
      })
    })

  const historyLines = Object.entries(recentExercises)
    .map(([name, entries]) => `  ${name}: ${entries.slice(0, 3).map((e) => `${e.date} ${e.weight}`).join(' | ')}`)
    .join('\n')

  const prSummary = prs.map((p) => `  ${p.lift}: ${p.current_best_kg ?? 'BW'}kg × ${p.current_best_reps}`).join('\n')

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
8. Progressive overload: if last session was completed strongly at same weight → suggest +2.5kg; else hold weight
9. Skip explicit warm-up sets — working sets only
10. For Hyrox simulation days use type "hybrid" and list the main race stations as exercises`
}

// ─── Call the Vite middleware ─────────────────────────────────────────────────

async function callAI(prompt: string): Promise<AIResponse | null> {
  try {
    const res = await fetch('/api/ai/parse-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Anthropic API returns content[0].text
    const text: string = data?.content?.[0]?.text ?? ''
    return JSON.parse(text) as AIResponse
  } catch {
    return null
  }
}

// ─── Fallback: keyword-based exercise extraction ──────────────────────────────

// Derived from taxonomy so fallback names always match what the dashboard tracks
const KNOWN_EXERCISES: { name: string; pattern: string; primary: string[] }[] =
  taxonomy.exercises.map((ex) => ({
    name: ex.name,
    pattern: ex.pattern,
    primary: ex.primary as string[],
  }))

function fallbackParse(focus: string, sessionText: string): ParsedSession {
  const focusLower = focus.toLowerCase()
  const sessionLower = sessionText.toLowerCase()

  if (focusLower.includes('rest') || sessionLower.startsWith('full rest')) {
    return { type: 'rest', exercises: [], cardio: null, notes: sessionText.slice(0, 120), source: 'fallback' }
  }

  if (focusLower.includes('zone 2') || focusLower.includes('run') || focusLower.includes('cardio')) {
    const hrMatch = sessionText.match(/(\d{2,3})[–-](\d{2,3})\s*bpm/)
    const durMatch = sessionText.match(/(\d{2,3})\s*min/)
    return {
      type: 'cardio',
      exercises: [],
      cardio: {
        subtype: focusLower.includes('zone 2') ? 'zone2-run' : 'run',
        target_duration_min: durMatch ? parseInt(durMatch[1]) : 30,
        target_hr_min: hrMatch ? parseInt(hrMatch[1]) : null,
        target_hr_max: hrMatch ? parseInt(hrMatch[2]) : null,
      },
      notes: sessionText.slice(0, 150),
      source: 'fallback',
    }
  }

  // Infer movement pattern from focus text, then pick exercises accordingly
  const isPull  = /pull|row|back|bicep/i.test(focusLower)
  const isPush  = /push|press|chest|shoulder/i.test(focusLower)
  const isLegs  = /leg|squat|hinge|lower/i.test(focusLower)

  const matched = KNOWN_EXERCISES.filter((ex) => {
    // First try: exercise name appears in session text
    if (sessionLower.includes(ex.name.toLowerCase())) return true
    // Second try: match by movement pattern to session focus
    if (isPull  && ex.pattern === 'pull')  return true
    if (isPush  && ex.pattern === 'push')  return true
    if (isLegs  && (ex.pattern === 'squat' || ex.pattern === 'hinge')) return true
    return false
  }).slice(0, 5)

  const exercises: ActiveExercise[] = matched.map((ex) => {
    const suggestion = getSuggestion(ex.name)
    return {
      id: makeExerciseId(),
      name: ex.name,
      target_sets: 3,
      target_reps: '8-12',
      target_rpe: 7,
      suggested_weight_kg: suggestion.suggested_weight_kg,
      suggestion_note: suggestion.suggestion_note,
      is_bodyweight: suggestion.is_bodyweight,
      sets: defaultSets(3, suggestion.suggested_weight_kg, suggestion.is_bodyweight),
    }
  })

  return {
    type: focusLower.includes('hyrox') ? 'hyrox' : 'strength',
    exercises,
    cardio: null,
    notes: '',
    source: 'fallback',
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

function loadPregenerated(date: string): AIResponse | null {
  const key = Object.keys(preloadedSessions).find(k => k.endsWith(`/${date}.json`))
  if (!key) return null
  const mod = preloadedSessions[key] as { default?: AIResponse } | AIResponse
  return ((mod as any).default ?? mod) as AIResponse
}

export async function parseWorkoutSession(
  sessionText: string,
  focus: string,
  date: string,
): Promise<ParsedSession> {
  // 1. Pre-generated session (static file — works on mobile, no API needed)
  const pregenerated = loadPregenerated(date)
  if (pregenerated) {
    const exercises: ActiveExercise[] = (pregenerated.exercises ?? []).map((ex) => {
      const localSuggestion = getSuggestion(ex.name)
      return {
        id: makeExerciseId(),
        name: ex.name,
        target_sets: ex.target_sets ?? 3,
        target_reps: ex.target_reps ?? '8-12',
        target_rpe: ex.target_rpe ?? null,
        suggested_weight_kg: ex.suggested_weight_kg ?? localSuggestion.suggested_weight_kg,
        suggestion_note: ex.suggestion_note || localSuggestion.suggestion_note,
        is_bodyweight: ex.is_bodyweight ?? false,
        sets: defaultSets(
          ex.target_sets ?? 3,
          ex.suggested_weight_kg ?? localSuggestion.suggested_weight_kg,
          ex.is_bodyweight ?? false,
        ),
      }
    })
    return {
      type: pregenerated.type as ParsedSession['type'],
      exercises,
      cardio: pregenerated.cardio ?? null,
      notes: pregenerated.notes ?? '',
      source: 'preloaded',
    }
  }

  // 2. Live API call via Vite middleware (desktop dev server only)
  const prompt = buildPrompt(sessionText, focus, date)
  const aiResult = await callAI(prompt)

  if (aiResult) {
    const exercises: ActiveExercise[] = (aiResult.exercises ?? []).map((ex) => {
      // Merge AI suggestion with local progressive overload for a richer note
      const localSuggestion = getSuggestion(ex.name)
      return {
        id: makeExerciseId(),
        name: ex.name,
        target_sets: ex.target_sets ?? 3,
        target_reps: ex.target_reps ?? '8-12',
        target_rpe: ex.target_rpe ?? null,
        suggested_weight_kg: ex.suggested_weight_kg ?? localSuggestion.suggested_weight_kg,
        suggestion_note: ex.suggestion_note || localSuggestion.suggestion_note,
        is_bodyweight: ex.is_bodyweight ?? false,
        sets: defaultSets(
          ex.target_sets ?? 3,
          ex.suggested_weight_kg ?? localSuggestion.suggested_weight_kg,
          ex.is_bodyweight ?? false,
        ),
      }
    })

    return {
      type: aiResult.type as ParsedSession['type'],
      exercises,
      cardio: aiResult.cardio ?? null,
      notes: aiResult.notes ?? '',
      source: 'ai',
    }
  }

  // AI unavailable — use local fallback
  return fallbackParse(focus, sessionText)
}
