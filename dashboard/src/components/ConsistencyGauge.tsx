import { Card, CardContent } from '@/components/ui/card'
import { currentScore, cardio_sessions_7d, strength_sessions_7d, cardio_sessions_28d, strength_sessions_28d } from '@/lib/data'

function Bar({ value, max, colour }: { value: number; max: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
        {value}/{max}
      </span>
    </div>
  )
}

export function ConsistencyGauge() {
  const c = currentScore.consistency

  const overallColour =
    c.score >= 75 ? '#34d399'
    : c.score >= 50 ? '#fbbf24'
    : '#f87171'

  const shortColour =
    c.short_term_score >= 75 ? '#34d399'
    : c.short_term_score >= 50 ? '#fbbf24'
    : '#f87171'

  const longColour =
    c.long_term_score >= 75 ? '#34d399'
    : c.long_term_score >= 50 ? '#fbbf24'
    : '#f87171'

  return (
    <Card className="flex flex-col justify-between py-5 px-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Consistency</p>
        <span className="text-2xl font-bold tabular-nums" style={{ color: overallColour }}>
          {Math.round(c.score)}
        </span>
      </div>

      {/* Short-term */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Last 7 days</p>
          <span className="text-xs tabular-nums" style={{ color: shortColour }}>
            {Math.round(c.short_term_score)} / 100
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-muted-foreground w-14">Cardio</span>
            <Bar value={cardio_sessions_7d} max={2} colour="#38bdf8" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-14">Strength</span>
            <Bar value={strength_sessions_7d} max={2} colour="#a78bfa" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-4" />

      {/* Long-term */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Last 28 days</p>
          <span className="text-xs tabular-nums" style={{ color: longColour }}>
            {Math.round(c.long_term_score)} / 100
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-muted-foreground w-14">Cardio</span>
            <Bar value={cardio_sessions_28d} max={8} colour="#38bdf8" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-14">Strength</span>
            <Bar value={strength_sessions_28d} max={8} colour="#a78bfa" />
          </div>
        </div>
      </div>

      {/* Footer: weight reminder */}
      <p className="text-xs text-muted-foreground mt-4">7d × 40% + 28d × 60%</p>
    </Card>
  )
}
