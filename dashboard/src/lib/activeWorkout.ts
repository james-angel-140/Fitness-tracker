// Types for the active workout feature

export interface ActiveSet {
  id: string
  weight_kg: number | null   // null = bodyweight
  reps: number | null
  rir: number | null          // Reps In Reserve
  completed: boolean
}

export interface ActiveExercise {
  id: string
  name: string
  target_sets: number
  target_reps: string         // "8-12" or "8"
  target_rpe: number | null
  suggested_weight_kg: number | null
  suggestion_note: string | null
  is_bodyweight: boolean
  sets: ActiveSet[]
  notes?: string
}

export type SessionType = 'strength' | 'cardio' | 'rest' | 'hybrid' | 'hyrox'

export interface CardioTarget {
  subtype: 'zone2-run' | 'run' | 'hiit' | 'other'
  target_duration_min: number
  target_hr_min: number | null
  target_hr_max: number | null
}

// What the AI (or fallback) returns after parsing the session narrative
export interface ParsedSession {
  type: SessionType
  exercises: ActiveExercise[]
  cardio: CardioTarget | null
  notes: string
  source: 'ai' | 'fallback'
}

// In-progress workout state
export interface ActiveWorkout {
  programDayDate: string
  programDayFocus: string
  sessionType: SessionType
  exercises: ActiveExercise[]
  cardio: CardioTarget | null
  sessionNotes: string
  startTime: number           // Date.now()
  // Cardio fields filled in on completion
  actual_distance_km?: number
  actual_avg_hr?: number
  actual_avg_pace?: string
}

// What gets converted to a Workout JSON and saved
export interface CompletedWorkoutData {
  workout: SaveableWorkout
  newPRs: PRHit[]
  totalVolumeKg: number
  durationMin: number
}

export interface SaveableWorkout {
  id: string
  date: string
  title: string
  type: 'strength' | 'cardio' | 'hybrid' | 'walk'
  cardio_subtype?: string
  duration_min: number
  exercises?: { name: string; sets: { reps: number; weight_kg: number | null }[]; notes?: string }[]
  distance_km?: number
  avg_hr?: number
  avg_pace_per_km?: string
  total_volume_kg?: number
  rpe?: number
  trimp?: number
  notes?: string
  source: 'manual'
}

export interface PRHit {
  lift: string
  weight_kg: number
  reps: number
  prev_best_kg: number | null
}

export function makeSetId() {
  return Math.random().toString(36).slice(2, 9)
}

export function makeExerciseId() {
  return Math.random().toString(36).slice(2, 9)
}

export function defaultSets(
  target_sets: number,
  suggested_weight_kg: number | null,
  is_bodyweight: boolean,
): ActiveSet[] {
  return Array.from({ length: target_sets }, () => ({
    id: makeSetId(),
    weight_kg: is_bodyweight ? null : (suggested_weight_kg ?? null),
    reps: null,
    rir: null,
    completed: false,
  }))
}
