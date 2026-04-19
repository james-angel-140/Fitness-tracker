import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, AlertTriangle, Play, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkout } from '@/lib/WorkoutContext'
import { parseWorkoutSession } from '@/lib/aiService'
import { getSuggestion } from '@/lib/progressiveOverload'
import { makeExerciseId, defaultSets, type ActiveExercise } from '@/lib/activeWorkout'

const TODAY_STR = new Date().toISOString().slice(0, 10)

export function WorkoutPreviewScreen() {
  const { screen, navigateTo, setParsedSession, startWorkout } = useWorkout()
  if (screen.type !== 'preview') return null

  const { date, focus, session } = screen
  const isToday = date === TODAY_STR
  const isRest = focus.toLowerCase().includes('rest')

  const [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseWorkoutSession>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFullSession, setShowFullSession] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')

  useEffect(() => {
    setLoading(true)
    parseWorkoutSession(session, focus, date)
      .then((result) => {
        setParsed(result)
        setParsedSession(result)
      })
      .finally(() => setLoading(false))
  }, [date, focus, session])

  function handleStart() {
    if (!parsed) return
    startWorkout({
      programDayDate: date,
      programDayFocus: focus,
      sessionType: parsed.type,
      exercises: parsed.exercises,
      cardio: parsed.cardio,
      sessionNotes: parsed.notes,
      startTime: Date.now(),
    })
  }

  function handleAddExercise() {
    const name = newExerciseName.trim()
    if (!name || !parsed) return
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
    setParsed((prev) => prev ? { ...prev, exercises: [...prev.exercises, newEx] } : prev)
    setParsedSession(parsed ? { ...parsed, exercises: [...parsed.exercises, newEx] } : null)
    setNewExerciseName('')
  }

  const sessionPreview = session.slice(0, 200) + (session.length > 200 ? '…' : '')

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigateTo({ type: 'dashboard' })}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{date}{isToday ? ' · Today' : ''}</p>
          <h1 className="text-sm font-semibold truncate">{focus}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Session narrative */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Session Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {showFullSession ? session : sessionPreview}
            </p>
            {session.length > 200 && (
              <button
                onClick={() => setShowFullSession((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                {showFullSession ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showFullSession ? 'Show less' : 'Read full plan'}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Rest day — no exercise list */}
        {!isRest && (
          <>
            {/* AI status */}
            <div className="flex items-center gap-2 text-xs">
              {loading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  <span className="text-muted-foreground">Building your workout with AI…</span>
                </>
              ) : parsed?.source === 'ai' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-muted-foreground">AI-generated plan · edit as needed</span>
                </>
              ) : parsed ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-muted-foreground">Fallback plan — AI unavailable (add ANTHROPIC_API_KEY to .env)</span>
                </>
              ) : null}
            </div>

            {/* Exercises */}
            {parsed && (
              <div className="space-y-3">
                {/* Key notes from AI */}
                {parsed.notes && (
                  <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-relaxed">{parsed.notes}</p>
                  </div>
                )}

                {/* Cardio target */}
                {parsed.cardio && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle>Cardio Target</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">{parsed.cardio.target_duration_min} min</span>
                      </div>
                      {parsed.cardio.target_hr_min && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Heart rate zone</span>
                          <span className="font-medium">{parsed.cardio.target_hr_min}–{parsed.cardio.target_hr_max} bpm</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Strength exercise list */}
                {parsed.exercises.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle>Exercises</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {parsed.exercises.map((ex) => (
                          <div key={ex.id} className="px-4 py-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-medium">{ex.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {ex.target_sets} × {ex.target_reps}
                                {ex.target_rpe ? ` RPE ${ex.target_rpe}` : ''}
                              </span>
                            </div>
                            {ex.suggestion_note && (
                              <p className="text-xs text-sky-400/80 mt-0.5">{ex.suggestion_note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add exercise */}
                <div className="flex gap-2">
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
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="pt-2">
          {isRest ? (
            <button
              onClick={() => navigateTo({ type: 'dashboard' })}
              className="w-full py-3 rounded-xl bg-muted text-muted-foreground text-sm font-medium"
            >
              Rest day — back to dashboard
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading || !parsed || (parsed.exercises.length === 0 && !parsed.cardio)}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:opacity-90"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Workout
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
