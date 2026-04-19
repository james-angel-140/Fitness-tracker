import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type {
  ActiveWorkout,
  ActiveExercise,
  ActiveSet,
  ParsedSession,
  CompletedWorkoutData,
} from '@/lib/activeWorkout'
import { makeSetId, defaultSets } from '@/lib/activeWorkout'

// ─── Screen state ─────────────────────────────────────────────────────────────

export type WorkoutScreen =
  | { type: 'dashboard' }
  | { type: 'preview'; date: string; focus: string; session: string }
  | { type: 'active' }
  | { type: 'complete'; data: CompletedWorkoutData }

// ─── Context value ────────────────────────────────────────────────────────────

interface WorkoutContextValue {
  screen: WorkoutScreen
  navigateTo: (s: WorkoutScreen) => void

  parsedSession: ParsedSession | null
  setParsedSession: (p: ParsedSession | null) => void

  activeWorkout: ActiveWorkout | null
  startWorkout: (workout: ActiveWorkout) => void

  updateSet: (exerciseId: string, setId: string, updates: Partial<ActiveSet>) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setId: string) => void
  addExercise: (exercise: ActiveExercise) => void
  removeExercise: (exerciseId: string) => void
  updateCardioField: (field: 'actual_distance_km' | 'actual_avg_hr' | 'actual_avg_pace', value: string) => void
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<WorkoutScreen>({ type: 'dashboard' })
  const [parsedSession, setParsedSession] = useState<ParsedSession | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)

  const navigateTo = useCallback((s: WorkoutScreen) => {
    setScreen(s)
    // Scroll to top when changing screens
    window.scrollTo(0, 0)
  }, [])

  const startWorkout = useCallback((workout: ActiveWorkout) => {
    setActiveWorkout(workout)
    setScreen({ type: 'active' })
    window.scrollTo(0, 0)
  }, [])

  const updateSet = useCallback((exerciseId: string, setId: string, updates: Partial<ActiveSet>) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) => (s.id !== setId ? s : { ...s, ...updates })),
              },
        ),
      }
    })
  }, [])

  const addSet = useCallback((exerciseId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const lastSet = ex.sets.at(-1)
          const newSet: ActiveSet = {
            id: makeSetId(),
            weight_kg: lastSet?.weight_kg ?? ex.suggested_weight_kg,
            reps: null,
            rir: null,
            completed: false,
          }
          return { ...ex, sets: [...ex.sets, newSet] }
        }),
      }
    })
  }, [])

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) },
        ),
      }
    })
  }, [])

  const addExercise = useCallback((exercise: ActiveExercise) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev
      return { ...prev, exercises: [...prev.exercises, exercise] }
    })
  }, [])

  const removeExercise = useCallback((exerciseId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev
      return { ...prev, exercises: prev.exercises.filter((ex) => ex.id !== exerciseId) }
    })
  }, [])

  const updateCardioField = useCallback(
    (field: 'actual_distance_km' | 'actual_avg_hr' | 'actual_avg_pace', value: string) => {
      setActiveWorkout((prev) => {
        if (!prev) return prev
        if (field === 'actual_avg_pace') return { ...prev, actual_avg_pace: value }
        const num = parseFloat(value)
        return { ...prev, [field]: isNaN(num) ? undefined : num }
      })
    },
    [],
  )

  return (
    <WorkoutContext.Provider
      value={{
        screen,
        navigateTo,
        parsedSession,
        setParsedSession,
        activeWorkout,
        startWorkout,
        updateSet,
        addSet,
        removeSet,
        addExercise,
        removeExercise,
        updateCardioField,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider')
  return ctx
}
