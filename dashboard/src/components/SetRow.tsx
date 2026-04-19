import { useWorkout } from '@/lib/WorkoutContext'
import type { ActiveSet } from '@/lib/activeWorkout'
import { Check, X } from 'lucide-react'

interface SetRowProps {
  exerciseId: string
  set: ActiveSet
  index: number
  isBodyweight: boolean
  canRemove: boolean
}

export function SetRow({ exerciseId, set, index, isBodyweight, canRemove }: SetRowProps) {
  const { updateSet, removeSet } = useWorkout()

  function update(field: Partial<ActiveSet>) {
    updateSet(exerciseId, set.id, field)
  }

  const rowBg = set.completed
    ? 'bg-emerald-500/5 border-emerald-500/20'
    : 'bg-transparent border-border'

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${rowBg}`}>
      {/* Set number */}
      <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{index + 1}</span>

      {/* Weight */}
      {!isBodyweight && (
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={set.weight_kg ?? ''}
            onChange={(e) => update({ weight_kg: e.target.value === '' ? null : parseFloat(e.target.value) })}
            className="w-full min-w-0 bg-muted/40 border border-border rounded px-2 py-1.5 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={set.completed}
          />
          <span className="text-xs text-muted-foreground shrink-0">kg</span>
        </div>
      )}
      {isBodyweight && (
        <div className="flex-1 text-center text-xs text-muted-foreground">BW</div>
      )}

      {/* Reps */}
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="reps"
          value={set.reps ?? ''}
          onChange={(e) => update({ reps: e.target.value === '' ? null : parseInt(e.target.value) })}
          className="w-full min-w-0 bg-muted/40 border border-border rounded px-2 py-1.5 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={set.completed}
        />
        <span className="text-xs text-muted-foreground shrink-0">reps</span>
      </div>

      {/* RIR */}
      <div className="flex items-center gap-1 w-14 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          placeholder="RIR"
          min={0}
          max={10}
          value={set.rir ?? ''}
          onChange={(e) => update({ rir: e.target.value === '' ? null : parseInt(e.target.value) })}
          className="w-full min-w-0 bg-muted/40 border border-border rounded px-1 py-1.5 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={set.completed}
        />
      </div>

      {/* Complete / remove */}
      {!set.completed ? (
        <button
          onClick={() => update({ completed: true })}
          disabled={set.reps === null}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Mark set done"
        >
          <Check className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => update({ completed: false })}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          title="Undo"
        >
          <Check className="w-4 h-4" />
        </button>
      )}

      {/* Remove set */}
      {canRemove && !set.completed && (
        <button
          onClick={() => removeSet(exerciseId, set.id)}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          title="Remove set"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
