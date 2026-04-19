// Pure client-side progressive overload suggestion engine
// Reads from the static workout history bundle — no API required

import { workouts, prs } from '@/lib/data'

export interface ExerciseHistory {
  date: string
  sets: { reps: number; weight_kg: number | null }[]
  totalVolume: number
  avgWeight: number | null
  maxWeight: number | null
  totalReps: number
}

export interface OverloadSuggestion {
  suggested_weight_kg: number | null
  suggestion_note: string
  last_performance: ExerciseHistory | null
  is_bodyweight: boolean
}

function roundToIncrement(kg: number, increment = 2.5) {
  return Math.round(kg / increment) * increment
}

function getExerciseHistoryFromWorkouts(exerciseName: string): ExerciseHistory[] {
  const nameLower = exerciseName.toLowerCase()
  return workouts
    .filter((w) => w.exercises?.some((e) => e.name.toLowerCase() === nameLower))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((w) => {
      const ex = w.exercises!.find((e) => e.name.toLowerCase() === nameLower)!
      const weights = ex.sets.map((s) => s.weight_kg).filter((kg): kg is number => kg !== null)
      const totalReps = ex.sets.reduce((s, set) => s + (set.reps ?? 0), 0)
      const totalVolume = ex.sets.reduce(
        (s, set) => s + (set.reps ?? 0) * (set.weight_kg ?? 0),
        0
      )
      return {
        date: w.date,
        sets: ex.sets,
        totalVolume,
        avgWeight: weights.length ? weights.reduce((a, b) => a + b) / weights.length : null,
        maxWeight: weights.length ? Math.max(...weights) : null,
        totalReps,
      }
    })
}

function getPRWeight(exerciseName: string): number | null {
  const nameLower = exerciseName.toLowerCase()
  const pr = prs.find((p) => p.lift.toLowerCase() === nameLower)
  return pr?.current_best_kg ?? null
}

export function getSuggestion(exerciseName: string): OverloadSuggestion {
  const history = getExerciseHistoryFromWorkouts(exerciseName)
  const prWeight = getPRWeight(exerciseName)

  // Bodyweight detection heuristic
  const bwKeywords = ['pull-up', 'pullup', 'chin-up', 'chinup', 'push-up', 'pushup', 'dip', 'bodyweight']
  const is_bodyweight = bwKeywords.some((kw) => exerciseName.toLowerCase().includes(kw))

  if (is_bodyweight) {
    const lastHist = history[0] ?? null
    return {
      suggested_weight_kg: null,
      suggestion_note: lastHist
        ? `Last: ${lastHist.totalReps} reps across ${lastHist.sets.length} sets (${lastHist.date})`
        : 'No recent history — start with comfortable reps',
      last_performance: lastHist,
      is_bodyweight: true,
    }
  }

  if (history.length === 0) {
    // No workout history — fall back to PR data
    if (prWeight) {
      const start = roundToIncrement(prWeight * 0.75)
      return {
        suggested_weight_kg: start,
        suggestion_note: `PR is ${prWeight}kg — starting at ~75% (${start}kg)`,
        last_performance: null,
        is_bodyweight: false,
      }
    }
    return {
      suggested_weight_kg: null,
      suggestion_note: 'No history — enter a comfortable weight',
      last_performance: null,
      is_bodyweight: false,
    }
  }

  const last = history[0]
  const maxW = last.maxWeight!

  // If all sets were at same weight and session looked solid, increase
  const allSameWeight = last.sets.every((s) => s.weight_kg === maxW)
  const avgReps = last.totalReps / last.sets.length
  const targetReps = 8  // conservative default

  let suggestedWeight: number
  let note: string

  if (allSameWeight && avgReps >= targetReps) {
    // Solid session — increase by 2.5kg
    suggestedWeight = roundToIncrement(maxW + 2.5)
    note = `Last: ${maxW}kg × ~${Math.round(avgReps)} reps — try ${suggestedWeight}kg ↑`
  } else if (allSameWeight && avgReps >= targetReps - 1) {
    // Close — hold weight, aim for more reps
    suggestedWeight = maxW
    note = `Last: ${maxW}kg × ~${Math.round(avgReps)} reps — hold weight, add a rep`
  } else {
    // Below target — stay at same weight
    suggestedWeight = maxW
    note = `Last: ${maxW}kg — maintain and focus on rep quality`
  }

  return {
    suggested_weight_kg: suggestedWeight,
    suggestion_note: note,
    last_performance: last,
    is_bodyweight: false,
  }
}
