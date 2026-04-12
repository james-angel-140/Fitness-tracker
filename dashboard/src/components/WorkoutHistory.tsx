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

/** Summarise a single exercise as "Name N×Wkg" or "Name N×BW" */
function exerciseSummary(ex: NonNullable<Workout['exercises']>[number]): string {
  if (!ex.sets || ex.sets.length === 0) return ex.name
  // Find the heaviest set (or highest reps for bodyweight)
  const topSet = ex.sets.reduce((best, s) =>
    (s.weight_kg ?? 0) >= (best.weight_kg ?? 0) ? s : best
  )
  const weight = topSet.weight_kg != null ? `${topSet.weight_kg}kg` : 'BW'
  return `${ex.name} ${ex.sets.length}×${weight}`
}

/** Build a one-line structured summary for the second row */
function workoutDetail(w: Workout): string {
  const parts: string[] = []

  // Strength: list exercises
  if ((w.type === 'strength' || w.type === 'hybrid') && w.exercises && w.exercises.length > 0) {
    const exerciseList = w.exercises.map(exerciseSummary).join(' · ')
    const meta: string[] = []
    if (w.total_volume_kg) meta.push(`${(w.total_volume_kg / 1000).toFixed(1)}t`)
    if (w.duration_min) meta.push(`${w.duration_min} min`)
    return [exerciseList, ...meta].join(' · ')
  }

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
    if (warmup) parts.push(`warmup ${warmup.distance_km ?? ''}km`)
  }

  // Cardio fallback
  if (parts.length === 0) {
    if (w.distance_km) parts.push(`${w.distance_km} km`)
    if (w.avg_pace_per_km) parts.push(`${w.avg_pace_per_km}/km`)
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
            <div key={w.id} className="grid grid-cols-[5rem_5rem_1fr] gap-x-3 items-baseline px-6 py-3">
              {/* Row 1 */}
              <span className="text-xs text-muted-foreground">{w.date}</span>
              <Badge variant={workoutBadgeVariant(w.type)} className="justify-self-start">
                {workoutTypeLabel(w)}
              </Badge>
              <span className="text-sm font-medium truncate">{workoutTitle(w)}</span>
              {/* Row 2 — detail spans last two columns */}
              <span />
              <span className="col-span-2 text-xs text-muted-foreground truncate">
                {workoutDetail(w)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
