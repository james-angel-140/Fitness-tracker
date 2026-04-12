import { Card, CardContent } from '@/components/ui/card'
import { nextEvent, activeProgram } from '@/lib/data'

function daysUntil(targetStr: string, fromStr: string) {
  const ms = new Date(targetStr).getTime() - new Date(fromStr).getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function currentPhase(program: typeof activeProgram, todayStr: string): string {
  if (program.taper_start_date && todayStr >= program.taper_start_date) return 'Taper'
  if (todayStr < program.start_date) return 'Pre-program'
  if (todayStr > program.end_date) return 'Complete'
  return 'Peak'
}

export function HyroxCountdown() {
  const TODAY_STR = new Date().toISOString().slice(0, 10)

  if (!nextEvent) {
    return (
      <Card className="flex items-center justify-center h-full py-6 px-6">
        <p className="text-sm text-muted-foreground">No upcoming event</p>
      </Card>
    )
  }

  const days = daysUntil(nextEvent.date, TODAY_STR)
  const isPast = days === 0

  const programStart = activeProgram.start_date
  const totalDays = daysUntil(nextEvent.date, programStart)
  const elapsed = totalDays - days
  const progress = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 100

  const phase = currentPhase(activeProgram, TODAY_STR)

  // Format event date for display e.g. "April 29, 2026"
  const eventDateLabel = new Date(nextEvent.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Short goal — first sentence only
  const goalShort = nextEvent.goal
    ? nextEvent.goal.split(/[.!]/)[0].trim()
    : null

  return (
    <Card className="flex flex-col items-center justify-center h-full py-6 px-6 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        {nextEvent.name} — {eventDateLabel}
      </p>

      {isPast ? (
        <p className="text-3xl font-bold text-emerald-400">Race day!</p>
      ) : (
        <>
          <div className="text-7xl font-bold tabular-nums leading-none">{days}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {days === 1 ? 'day' : 'days'} to go
          </div>
        </>
      )}

      <div className="w-full mt-5 space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{new Date(programStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <span className="text-foreground font-medium">{progress}% complete</span>
          <span>{new Date(nextEvent.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span>Phase: <span className="text-foreground font-medium">{phase}</span></span>
        {goalShort && (
          <span>Goal: <span className="text-foreground font-medium">{goalShort}</span></span>
        )}
      </div>
    </Card>
  )
}
