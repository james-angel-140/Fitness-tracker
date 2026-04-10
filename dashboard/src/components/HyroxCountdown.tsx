import { Card, CardContent } from '@/components/ui/card'

const EVENT_DATE = new Date('2026-04-29')
const TODAY = new Date('2026-04-10')

function daysUntil(target: Date, from: Date) {
  const ms = target.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function HyroxCountdown() {
  const days = daysUntil(EVENT_DATE, TODAY)
  const isPast = days === 0
  const totalDays = daysUntil(EVENT_DATE, new Date('2026-04-05'))
  const progress = Math.round(((totalDays - days) / totalDays) * 100)

  return (
    <Card className="flex flex-col items-center justify-center h-full py-6 px-6 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Hyrox — April 29, 2026
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

      {/* Training progress bar */}
      <div className="w-full mt-5 space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Apr 5</span>
          <span className="text-foreground font-medium">{progress}% complete</span>
          <span>Apr 29</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span>Phase: <span className="text-foreground font-medium">Peak & Taper</span></span>
        <span>Goal: <span className="text-foreground font-medium">Sub 75 min</span></span>
      </div>
    </Card>
  )
}
