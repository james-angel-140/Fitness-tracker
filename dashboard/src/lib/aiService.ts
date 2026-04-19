// AI service — calls the Vite dev-server middleware (/api/ai/parse-workout)
// Falls back to local keyword extraction if the endpoint is unavailable
// (e.g. when running from gh-pages on phone, where no server is running)

import { getSuggestion } from '@/lib/progressiveOverload'
import { workouts, prs } from '@/lib/data'
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

function buildPrompt(sessionText: string, focus: string, date: string): string {
  // Summarise recent exercise history for context
  const recentExercises: Record<string, { date: string; sets: string; weight: string }[]> = {}
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
          sets: `${ex.sets.length} sets`,
          weight: maxW ? `${maxW}kg × ${Math.round(totalReps / ex.sets.length)} reps avg` : `${totalReps} reps (bodyweight)`,
        })
      })
    })

  const prSummary = prs.map((p) => `${p.lift}: ${p.current_best_kg ?? 'BW'}kg × ${p.current_best_reps}`).join('\n')

  const historyLines = Object.entries(recentExercises)
    .map(([name, entries]) => `${name}: ${entries.slice(0, 3).map((e) => `${e.date} ${e.weight}`).join(' | ')}`)
    .join('\n')

  return `You are a fitness AI coach. Parse the workout session below and return a JSON object.

## Session (${date})
Focus: ${focus}
Plan:
${sessionText}

## Recent Exercise History
${historyLines || 'No history yet'}

## Personal Records
${prSummary || 'No PRs recorded'}

## Instructions
Return ONLY valid JSON — no markdown, no explanation.

If this is a REST day:
{"type":"rest","exercises":[],"cardio":null,"notes":"<one-sentence rest day summary>"}

If this is a CARDIO day:
{"type":"cardio","exercises":[],"cardio":{"subtype":"zone2-run|run|hiit|other","target_duration_min":N,"target_hr_min":N,"target_hr_max":N},"notes":"<key pacing or HR cues>"}

If this is a STRENGTH or HYBRID day:
{
  "type": "strength",
  "exercises": [
    {
      "name": "Exact exercise name",
      "target_sets": 3,
      "target_reps": "8-12",
      "target_rpe": 7,
      "suggested_weight_kg": 72.5,
      "suggestion_note": "Last session 70kg × 8 — try 72.5kg",
      "is_bodyweight": false
    }
  ],
  "cardio": null,
  "notes": "<1-2 sentences covering injury warnings or key protocols>"
}

Rules:
- Use exact exercise names matching the history data where possible
- For bodyweight exercises (pull-ups, chin-ups, push-ups, dips): set is_bodyweight true and suggested_weight_kg null
- Base suggestions on the exercise history and progressive overload (increase weight ~2.5kg if last session was strong)
- Include ONLY the main working exercises — skip explicit warm-up or cooldown sets
- For Hyrox simulation days, use type "hybrid" and list main stations as exercises`
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

const KNOWN_EXERCISES = [
  'Deadlift', 'Romanian Deadlift', 'Back Squat', 'Front Squat', 'Leg Press',
  'Barbell Bench Press', 'Dumbbell Bench Press', 'Barbell Shoulder Press',
  'Pull-up', 'Chin-up', 'Lat Pulldown', 'Barbell Row', 'Cable Row', 'Seated Row',
  'Face Pull', 'Bicep Curl', 'Tricep Extension', 'Dip',
  'Lunges', 'Bulgarian Split Squat', 'Hip Thrust', 'Leg Curl', 'Calf Raise',
]

function fallbackParse(focus: string, sessionText: string): ParsedSession {
  const focusLower = focus.toLowerCase()
  const sessionLower = sessionText.toLowerCase()

  // Detect rest day
  if (focusLower.includes('rest') || sessionLower.startsWith('full rest')) {
    return { type: 'rest', exercises: [], cardio: null, notes: sessionText.slice(0, 120), source: 'fallback' }
  }

  // Detect cardio
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

  // Match known exercises against session text
  const matched = KNOWN_EXERCISES.filter((ex) =>
    sessionLower.includes(ex.toLowerCase())
  )

  const exercises: ActiveExercise[] = matched.map((name) => {
    const suggestion = getSuggestion(name)
    return {
      id: makeExerciseId(),
      name,
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

export async function parseWorkoutSession(
  sessionText: string,
  focus: string,
  date: string,
): Promise<ParsedSession> {
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
