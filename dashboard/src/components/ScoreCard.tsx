import { Card, CardContent } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import { currentScore, currentScoreLabel, latestStats, latestWeight, latestZone2Run } from '@/lib/data'

export function ScoreCard() {
  const { score } = currentScore

  return (
    <Card className="flex flex-col items-center justify-center py-6 px-6 h-full">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Composite Score
      </p>

      <ScoreGauge score={score} label={currentScoreLabel} size={160} />

      <div className="mt-5 flex gap-6 text-center text-xs text-muted-foreground">
        <div>
          <div className="text-foreground font-medium">{latestStats.date}</div>
          <div>stats</div>
        </div>
        <div>
          <div className="text-foreground font-medium">{latestWeight.date}</div>
          <div>weight</div>
        </div>
        {latestZone2Run && (
          <div>
            <div className="text-foreground font-medium">{latestZone2Run.date}</div>
            <div>zone 2</div>
          </div>
        )}
      </div>
    </Card>
  )
}
