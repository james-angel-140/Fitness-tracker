import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { workouts } from '@/lib/data'
import type { BadgeProps } from '@/components/ui/badge'
import { useTimeRange, filterByRange } from '@/lib/TimeRangeContext'

function workoutBadgeVariant(type: string): BadgeProps['variant'] {
  if (type === 'strength') return 'default'
  if (type === 'cardio') return 'success'
  if (type === 'walk') return 'secondary'
  return 'outline'
}

function workoutLabel(w: { type: string; cardio_subtype?: string }) {
  if (w.cardio_subtype === 'zone2-run') return 'Zone 2'
  if (w.cardio_subtype === 'hiit') return 'HIIT'
  if (w.cardio_subtype === 'stationary-bike') return 'Bike'
  if (w.type === 'walk') return 'Walk'
  if (w.type === 'cardio') return 'Cardio'
  if (w.type === 'strength') return 'Strength'
  return w.type
}

export function WorkoutHistory() {
  const { range } = useTimeRange()
  const recent = [...filterByRange(workouts, range)].reverse().slice(0, 20)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Workouts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {recent.map((w) => (
            <div key={w.id} className="flex items-center gap-3 px-6 py-3">
              <div className="w-20 shrink-0 text-xs text-muted-foreground">{w.date}</div>
              <Badge variant={workoutBadgeVariant(w.type)} className="shrink-0">
                {workoutLabel(w)}
              </Badge>
              <div className="flex-1 min-w-0 flex gap-3 text-xs text-muted-foreground">
                {w.duration_min && <span>{w.duration_min} min</span>}
                {w.distance_km && <span>{w.distance_km} km</span>}
                {w.avg_pace_per_km && <span>{w.avg_pace_per_km}/km</span>}
                {w.avg_hr && <span>{w.avg_hr} bpm</span>}
                {w.total_volume_kg && <span>{(w.total_volume_kg / 1000).toFixed(1)}t vol</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
