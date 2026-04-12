import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { workouts } from '@/lib/data'
import type { Workout } from '@/lib/data'
import type { BadgeProps } from '@/components/ui/badge'
import { useTimeRange, filterByRange } from '@/lib/TimeRangeContext'

function workoutBadgeVariant(type: string): BadgeProps['variant'] {
  if (type === 'strength') return 'default'
  if (type === 'cardio') return 'success'
  if (type === 'walk') return 'secondary'
  return 'outline'
}

function workoutTypeLabel(w: Workout) {
  if (w.cardio_subtype === 'zone2-run') return 'Zone 2'
  if (w.cardio_subtype === 'hiit') return 'HIIT'
  if (w.cardio_subtype === 'stationary-bike') return 'Bike'
  if (w.type === 'walk') return 'Walk'
  if (w.type === 'cardio') return 'Cardio'
  if (w.type === 'strength') return 'Strength'
  if (w.type === 'hybrid') return 'Hybrid'
  return w.type
}

/** Derive a display name from the id slug if no title is set */
function workoutTitle(w: Workout): string {
  if (w.title) return w.title
  // Strip the date prefix and capitalise each word
  const slug = w.id.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Build a one-line structured summary for the second row */
function workoutDetail(w: Workout): string {
  const parts: string[] = []

  // Interval summary from splits
  if (w.splits && w.splits.length > 0) {
    const intervals = w.splits.filter((s) => s.type === 'interval' || s.type === 'work')
    const warmup = w.splits.find((s) => s.type === 'warmup')
    const paces = intervals.map((s) => s.pace_per_km).filter(Boolean)
    const avgPace = paces.length > 0
      ? paces[0] + (paces.length > 1 && paces[paces.length - 1] !== paces[0] ? `–${paces[paces.length - 1]}` : '') + '/km'
      : null

    if (intervals.length > 0) {
      const dist = intervals[0].distance_km
      const distStr = dist != null ? `${dist}km` : ''
      parts.push(`${intervals.length} × ${distStr}${avgPace ? ` @ ${avgPace}` : ''}`)
    }
    if (warmup) {
      parts.push(`warmup ${warmup.distance_km ?? ''}km`)
    }
  }

  // Fallback stats when no structured splits
  if (parts.length === 0) {
    if (w.distance_km) parts.push(`${w.distance_km} km`)
    if (w.avg_pace_per_km) parts.push(`${w.avg_pace_per_km}/km`)
    if (w.total_volume_kg) parts.push(`${(w.total_volume_kg / 1000).toFixed(1)}t vol`)
  }

  if (w.duration_min) parts.push(`${w.duration_min} min`)
  if (w.avg_hr) parts.push(`${w.avg_hr} bpm`)

  return parts.join(' · ')
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
            <div key={w.id} className="px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-xs text-muted-foreground">{w.date}</div>
                <Badge variant={workoutBadgeVariant(w.type)} className="shrink-0">
                  {workoutTypeLabel(w)}
                </Badge>
                <span className="text-sm font-medium truncate">{workoutTitle(w)}</span>
              </div>
              <div className="mt-1 pl-[calc(5rem+theme(spacing.3)+theme(spacing.14))] text-xs text-muted-foreground">
                {workoutDetail(w)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
