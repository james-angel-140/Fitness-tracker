import { useState } from 'react'
import { X, Plus, CheckCircle } from 'lucide-react'
import { ExerciseCard } from '@/components/ExerciseCard'
import { WorkoutTimer } from '@/components/WorkoutTimer'
import { useWorkout } from '@/lib/WorkoutContext'
import { buildSaveableWorkout } from '@/lib/workoutSave'
import { getSuggestion } from '@/lib/progressiveOverload'
import { makeExerciseId, defaultSets, type ActiveExercise } from '@/lib/activeWorkout'

export function ActiveWorkoutScreen() {
  const { activeWorkout, navigateTo, addExercise, updateCardioField } = useWorkout()
  const [newExerciseName, setNewExerciseName] = useState('')
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')

  if (!activeWorkout) return null

  const isCardio = activeWorkout.sessionType === 'cardio'
  const completedCount = activeWorkout.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0,
  )

  function handleAddExercise() {
    const name = newExerciseName.trim()
    if (!name) return
    const suggestion = getSuggestion(name)
    const newEx: ActiveExercise = {
      id: makeExerciseId(),
      name,
      target_sets: 3,
      target_reps: '8-12',
      target_rpe: null,
      suggested_weight_kg: suggestion.suggested_weight_kg,
      suggestion_note: suggestion.suggestion_note,
      is_bodyweight: suggestion.is_bodyweight,
      sets: defaultSets(3, suggestion.suggested_weight_kg, suggestion.is_bodyweight),
    }
    addExercise(newEx)
    setNewExerciseName('')
  }

  function handleFinish() {
    if (!activeWorkout) return
    const durationMin = (Date.now() - activeWorkout.startTime) / 60_000
    const data = buildSaveableWorkout(activeWorkout, rpe, notes, durationMin)
    navigateTo({ type: 'complete', data })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{activeWorkout.programDayFocus}</p>
            <WorkoutTimer startTime={activeWorkout.startTime} />
          </div>
          {completedCount > 0 && (
            <span className="text-xs text-emerald-400 shrink-0">{completedCount} sets done</span>
          )}
          <button
            onClick={() => setShowFinishModal(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Finish
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-28 space-y-3">

        {/* AI session notes */}
        {activeWorkout.sessionNotes && (
          <div className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {activeWorkout.sessionNotes}
          </div>
        )}

        {/* Cardio logging */}
        {isCardio && activeWorkout.cardio && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <p className="text-sm font-semibold">
              {activeWorkout.cardio.subtype === 'zone2-run' ? 'Zone 2 Run' : 'Cardio'}
              {activeWorkout.cardio.target_duration_min ? ` · ${activeWorkout.cardio.target_duration_min} min` : ''}
              {activeWorkout.cardio.target_hr_min ? ` · ${activeWorkout.cardio.target_hr_min}–${activeWorkout.cardio.target_hr_max} bpm` : ''}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Distance (km)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.0"
                  onChange={(e) => updateCardioField('actual_distance_km', e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Avg HR (bpm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  onChange={(e) => updateCardioField('actual_avg_hr', e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Avg pace</label>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="mm:ss"
                  onChange={(e) => updateCardioField('actual_avg_pace', e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {activeWorkout.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            canRemove={activeWorkout.exercises.length > 1}
          />
        ))}

        {/* Add exercise */}
        {!isCardio && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Add exercise…"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
              className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleAddExercise}
              disabled={!newExerciseName.trim()}
              className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Finish workout?</h2>
              <button onClick={() => setShowFinishModal(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* RPE */}
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                Session RPE: <span className="text-foreground font-semibold">{rpe}/10</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Easy</span>
                <span>Max effort</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="How did it feel? Anything to note…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <CheckCircle className="w-4 h-4" />
              Save & finish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
