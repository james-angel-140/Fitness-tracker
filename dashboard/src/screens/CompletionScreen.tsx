import { Download, Home, Trophy, Dumbbell, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkout } from '@/lib/WorkoutContext'
import { saveToLocalStorage, downloadWorkoutJSON } from '@/lib/workoutSave'

export function CompletionScreen() {
  const { screen, navigateTo } = useWorkout()
  if (screen.type !== 'complete') return null

  const { workout, newPRs, totalVolumeKg, durationMin } = screen.data

  function handleSave() {
    saveToLocalStorage(workout)
    downloadWorkoutJSON(workout)
  }

  const hours = Math.floor(durationMin / 60)
  const mins = Math.round(durationMin % 60)
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold">Workout complete!</h1>
        <p className="text-sm text-muted-foreground mt-1">{workout.date} · {workout.title}</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card>
            <CardContent className="py-3 px-2">
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold">{durationStr}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</p>
            </CardContent>
          </Card>
          {totalVolumeKg > 0 && (
            <Card>
              <CardContent className="py-3 px-2">
                <Dumbbell className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold">{(totalVolumeKg / 1000).toFixed(1)}t</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="py-3 px-2">
              <span className="text-xl">🔥</span>
              <p className="text-lg font-bold">{workout.rpe}/10</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">RPE</p>
            </CardContent>
          </Card>
        </div>

        {/* New PRs */}
        {newPRs.length > 0 && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-400">New Personal Records 🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {newPRs.map((pr, i) => (
                <div key={i} className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{pr.lift}</span>
                  <span className="tabular-nums text-emerald-400">
                    {pr.weight_kg}kg × {pr.reps}
                    {pr.prev_best_kg && (
                      <span className="text-muted-foreground ml-1">(was {pr.prev_best_kg}kg)</span>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Exercise summary */}
        {workout.exercises && workout.exercises.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle>Sets logged</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {workout.exercises.map((ex, i) => {
                const vol = ex.sets.reduce((s, set) => s + set.reps * (set.weight_kg ?? 0), 0)
                return (
                  <div key={i} className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{ex.name}</span>
                    <span className="tabular-nums text-xs">
                      {ex.sets.length} sets
                      {vol > 0 && ` · ${vol}kg vol`}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Save instructions */}
        <Card className="bg-muted/30">
          <CardContent className="py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">To add this to your dashboard:</p>
            <p>1. Tap "Save & download" below</p>
            <p>2. Copy the downloaded file to <code className="bg-muted px-1 rounded">data/workouts/</code></p>
            <p>3. Commit and push → dashboard updates automatically</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Save & download JSON
          </button>
          <button
            onClick={() => navigateTo({ type: 'dashboard' })}
            className="w-full py-3 rounded-xl bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
