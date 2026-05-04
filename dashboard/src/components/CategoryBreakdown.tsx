import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { currentScore, scoreHistory, scoreInputs } from '@/lib/data'

interface BarProps {
  label: string
  value: number
  max: number
  detail?: string
}

function MetricRow({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 sm:w-28 shrink-0 text-xs text-muted-foreground">{label}</div>
      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-8 text-right text-xs font-medium tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted-foreground w-14 sm:w-16 text-right">{detail}</div>}
    </div>
  )
}

function CategorySection({ title, contribution, max, children }: {
  title: string
  contribution: number
  max: number
  children: React.ReactNode
}) {
  const pct = (contribution / max) * 100
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {contribution} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-accent overflow-hidden mb-1">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  )
}

export function CategoryBreakdown() {
  // Saved contributions (source of truth — matches npm run score --save)
  const saved = scoreHistory.at(-1)
  const savedCardio = saved?.categories.cardio ?? 0
  const savedStrength = saved?.categories.strength ?? 0
  const savedBodyComp = saved?.categories.body_comp ?? 0

  // Sub-metric detail rows remain live-calculated (not stored in JSON)
  const { cardio, strength, body_comp } = currentScore
  const { cardio: ci, strength: si, body_comp: bi } = scoreInputs

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CategorySection title="Cardio" contribution={savedCardio} max={15}>
          <MetricRow label="VO2 Max" value={cardio.vo2_max_score} detail={`${ci.vo2_max}`} />
          <MetricRow
            label="Zone 2 Pace"
            value={cardio.zone2_pace_score}
            detail={`${Math.floor(ci.zone2_pace_min_per_km)}:${String(
              Math.round((ci.zone2_pace_min_per_km % 1) * 60),
            ).padStart(2, '0')}/km`}
          />
          <MetricRow
            label="Resting HR"
            value={cardio.resting_hr_score}
            detail={`${ci.resting_hr_bpm} bpm`}
          />
        </CategorySection>

        <CategorySection title="Strength" contribution={savedStrength} max={40}>
          <MetricRow
            label="Bench Press"
            value={strength.bench_press_score}
            detail={`${si.bench_press_kg}kg`}
          />
          <MetricRow
            label="Deadlift"
            value={strength.deadlift_score}
            detail={`${si.deadlift_kg}kg`}
          />
          <MetricRow
            label="Back Squat"
            value={strength.squat_score}
            detail={`${si.squat_kg}kg`}
          />
          <MetricRow
            label="Leg Press"
            value={strength.leg_press_score}
            detail={`${si.leg_press_kg}kg`}
          />
          <MetricRow
            label="Pull-ups"
            value={strength.pullup_score}
            detail={`${si.pullup_reps} reps`}
          />
        </CategorySection>

        <CategorySection title="Body Comp" contribution={savedBodyComp} max={35}>
          <MetricRow
            label="Body Fat"
            value={body_comp.body_fat_score}
            detail={`${bi.body_fat_pct}%`}
          />
          <MetricRow
            label="Weight vs Goal"
            value={body_comp.weight_vs_goal_score}
            detail={`${bi.weight_kg}kg`}
          />
        </CategorySection>

      </CardContent>
    </Card>
  )
}
