import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { upcomingSessions } from '@/lib/data'

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Sessions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {upcomingSessions.map((day) => (
            <div key={day.date} className="px-6 py-4 space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                  {dayLabel(day.date)}
                </span>
                <Badge variant={sessionBadgeVariant(day.focus)}>
                  {day.focus.replace(/\s*\(Fitbod\)/i, '')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pl-[108px] leading-relaxed">
                {day.session}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
