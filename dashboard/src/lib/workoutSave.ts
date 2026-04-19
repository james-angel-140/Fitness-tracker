// Save abstraction — localStorage + JSON file download
// When a backend exists, replace this with an API call

import type { SaveableWorkout, CompletedWorkoutData, ActiveWorkout, PRHit } from '@/lib/activeWorkout'
import { prs } from '@/lib/data'

const LS_KEY = 'fitness-tracker:saved-workouts'

// ─── Convert in-progress workout to saveable JSON ─────────────────────────────

export function buildSaveableWorkout(
  workout: ActiveWorkout,
  rpe: number,
  notes: string,
  durationMin: number,
): CompletedWorkoutData {
  const date = workout.programDayDate
  const slugFocus = workout.programDayFocus
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  const id = `${date}-${slugFocus}`

  const exercises = workout.exercises
    .filter((ex) => ex.sets.some((s) => s.completed))
    .map((ex) => ({
      name: ex.name,
      sets: ex.sets
        .filter((s) => s.completed && s.reps !== null)
        .map((s) => ({
          reps: s.reps!,
          weight_kg: s.weight_kg,
        })),
      notes: ex.notes,
    }))
    .filter((ex) => ex.sets.length > 0)

  const totalVolumeKg = exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce((s, set) => s + set.reps * (set.weight_kg ?? 0), 0),
    0,
  )

  // Detect new PRs
  const newPRs: PRHit[] = []
  exercises.forEach((ex) => {
    const pr = prs.find((p) => p.lift.toLowerCase() === ex.name.toLowerCase())
    if (!pr) return
    ex.sets.forEach((set) => {
      if (set.weight_kg && set.weight_kg > (pr.current_best_kg ?? 0)) {
        newPRs.push({
          lift: ex.name,
          weight_kg: set.weight_kg,
          reps: set.reps,
          prev_best_kg: pr.current_best_kg,
        })
      }
    })
  })

  const typeMap: Record<string, SaveableWorkout['type']> = {
    strength: 'strength',
    cardio: 'cardio',
    hybrid: 'hybrid',
    hyrox: 'hybrid',
    rest: 'strength', // shouldn't happen
  }

  const savedWorkout: SaveableWorkout = {
    id,
    date,
    title: workout.programDayFocus,
    type: typeMap[workout.sessionType] ?? 'strength',
    cardio_subtype: workout.cardio?.subtype,
    duration_min: Math.round(durationMin),
    exercises: exercises.length > 0 ? exercises : undefined,
    distance_km: workout.actual_distance_km,
    avg_hr: workout.actual_avg_hr,
    avg_pace_per_km: workout.actual_avg_pace,
    total_volume_kg: totalVolumeKg > 0 ? Math.round(totalVolumeKg) : undefined,
    rpe,
    trimp: Math.round(durationMin * rpe),
    notes: notes || undefined,
    source: 'manual',
  }

  return { workout: savedWorkout, newPRs, totalVolumeKg, durationMin }
}

// ─── Persist to localStorage ──────────────────────────────────────────────────

export function saveToLocalStorage(workout: SaveableWorkout) {
  const existing: SaveableWorkout[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  const idx = existing.findIndex((w) => w.id === workout.id)
  if (idx >= 0) {
    existing[idx] = workout
  } else {
    existing.push(workout)
  }
  localStorage.setItem(LS_KEY, JSON.stringify(existing))
}

export function getSavedWorkouts(): SaveableWorkout[] {
  return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
}

// ─── Trigger JSON file download ───────────────────────────────────────────────

export function downloadWorkoutJSON(workout: SaveableWorkout) {
  const json = JSON.stringify(workout, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${workout.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
