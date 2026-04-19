import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SetRow } from '@/components/SetRow'
import { useWorkout } from '@/lib/WorkoutContext'
import type { ActiveExercise } from '@/lib/activeWorkout'

interface ExerciseCardProps {
  exercise: ActiveExercise
  canRemove: boolean
}

export function ExerciseCard({ exercise, canRemove }: ExerciseCardProps) {
  const { addSet, removeExercise } = useWorkout()
  const [collapsed, setCollapsed] = useState(false)

  const completedSets = exercise.sets.filter((s) => s.completed).length
  const totalSets = exercise.sets.length
  const allDone = totalSets > 0 && completedSets === totalSets

  return (
    <Card className={`transition-colors ${allDone ? 'border-emerald-500/30' : ''}`}>
      {/* Exercise header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{exercise.name}</span>
            {allDone && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                Done
              </span>
            )}
          </div>

          {/* Target + suggestion */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {exercise.target_sets} × {exercise.target_reps}
              {exercise.target_rpe ? ` @ RPE ${exercise.target_rpe}` : ''}
            </span>
            {exercise.suggestion_note && (
              <span className="text-xs text-sky-400/80">{exercise.suggestion_note}</span>
            )}
          </div>
        </div>

        {/* Set progress pill */}
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {completedSets}/{totalSets}
        </span>

        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {!collapsed && (
        <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 pb-1">
            <span className="text-[10px] text-muted-foreground w-5 text-center">#</span>
            {!exercise.is_bodyweight && (
              <span className="text-[10px] text-muted-foreground flex-1 text-center">Weight</span>
            )}
            {exercise.is_bodyweight && (
              <span className="text-[10px] text-muted-foreground flex-1 text-center"></span>
            )}
            <span className="text-[10px] text-muted-foreground flex-1 text-center">Reps</span>
            <span className="text-[10px] text-muted-foreground w-14 text-center">RIR</span>
            <span className="w-8" />
            {exercise.sets.length > 1 && <span className="w-6" />}
          </div>

          {/* Set rows */}
          {exercise.sets.map((set, i) => (
            <SetRow
              key={set.id}
              exerciseId={exercise.id}
              set={set}
              index={i}
              isBodyweight={exercise.is_bodyweight}
              canRemove={exercise.sets.length > 1}
            />
          ))}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => addSet(exercise.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add set
            </button>

            {canRemove && (
              <button
                onClick={() => removeExercise(exercise.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors py-1 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
