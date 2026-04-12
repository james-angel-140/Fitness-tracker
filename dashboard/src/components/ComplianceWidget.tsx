import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { complianceByWeek, overallCompliance } from '@/lib/data'

function shortWeek(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function ComplianceWidget() {
  if (complianceByWeek.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle>Program Adherence</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No planned sessions in the past yet.</p>
        </CardContent>
      </Card>
    )
  }

  const pctColour = (pct: number) =>
    pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Program Adherence</CardTitle>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: pctColour(overallCompliance.pct) }}
          >
            {overallCompliance.pct}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {overallCompliance.actual} of {overallCompliance.planned} planned sessions completed
        </p>
        <div className="space-y-2 pt-1">
          {complianceByWeek.map((week) => (
            <div key={week.weekStart} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">w/c {shortWeek(week.weekStart)}</span>
                <span className="tabular-nums font-medium" style={{ color: pctColour(week.pct) }}>
                  {week.actual}/{week.planned}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${week.pct}%`,
                    backgroundColor: pctColour(week.pct),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
