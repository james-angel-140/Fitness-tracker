import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { prs } from '@/lib/data'

export function PRTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Records</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {prs.map((pr) => (
            <div key={pr.lift} className="flex items-center gap-3 px-6 py-3">
              <div className="flex-1 text-sm">{pr.lift}</div>
              <div className="text-sm font-semibold tabular-nums">
                {pr.current_best_kg != null ? `${pr.current_best_kg}kg` : 'BW'}
                {' '}
                <span className="font-normal text-muted-foreground">
                  × {pr.current_best_reps}
                </span>
              </div>
              {pr.current_best_date && (
                <div className="w-20 text-right text-xs text-muted-foreground">
                  {pr.current_best_date}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
