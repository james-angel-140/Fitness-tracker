import { ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { upcomingSessions } from '@/lib/data'
import { useWorkout } from '@/lib/WorkoutContext'

const TODAY = new Date().toISOString().slice(0, 10)

function sessionBadgeVariant(focus: string) {
  if (/legs/i.test(focus)) return 'destructive'
  if (/upper|strength/i.test(focus)) return 'default'
  if (/zone 2/i.test(focus)) return 'success'
  if (/simulation|hyrox/i.test(focus)) return 'warning'
  if (/rest/i.test(focus)) return 'secondary'
  return 'outline'
}

function dayLabel(date: string) {
  const diff = Math.round(
    (new Date(date).getTime() - new Date(TODAY).getTime()) / 86_400_000
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function UpcomingSessions() {
  const { navigateTo } = useWorkout()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Sessions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {upcomingSessions.map((day) => (
            <button
              key={day.date}
              onClick={() =>
                navigateTo({ type: 'preview', date: day.date, focus: day.focus, session: day.session })
              }
              className="w-full text-left px-4 sm:px-6 py-3 space-y-1 hover:bg-muted/40 active:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    {dayLabel(day.date)}
                  </span>
                  <Badge variant={sessionBadgeVariant(day.focus)}>
                    {day.focus.replace(/\s*\(Fitbod\)/i, '')}
                  </Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {day.session}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
