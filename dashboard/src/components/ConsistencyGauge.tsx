import { Card, CardContent } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import { currentScore, scoreInputs } from '@/lib/data'

export function ConsistencyGauge() {
  const { consistency } = currentScore
  const { consistency: ci } = scoreInputs

  return (
    <Card className="flex flex-col items-center justify-center py-6 px-6 h-full">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Consistency Score
      </p>

      <ScoreGauge score={Math.round(consistency.score)} label="Consistency" size={160} />

      <div className="mt-5 flex gap-6 text-center text-xs text-muted-foreground">
        <div>
          <div className="text-foreground font-medium">{ci.sessions_per_week_avg.toFixed(1)}</div>
          <div>sessions/wk</div>
        </div>
        <div>
          <div className="text-foreground font-medium">{ci.total_sessions_last_4_weeks}</div>
          <div>last 4 wks</div>
        </div>
        <div>
          <div className="text-foreground font-medium">{ci.cardio_sessions_per_week_avg.toFixed(1)}</div>
          <div>cardio/wk</div>
        </div>
      </div>
    </Card>
  )
}
