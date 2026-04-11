import { Card, CardContent } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import { scoreHistory } from '@/lib/data'
import { scoreLabel } from '@/lib/score'

export function ScoreCard() {
  const latest = scoreHistory.at(-1)
  if (!latest) return null
  const label = scoreLabel(latest.score)

  return (
    <Card className="flex flex-col items-center justify-center py-6 px-6 h-full">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Composite Score
      </p>

      <ScoreGauge score={latest.score} label={label} size={160} />

      <div className="mt-5 flex gap-6 text-center text-xs text-muted-foreground">
        <div>
          <div className="text-foreground font-medium">{latest.date}</div>
          <div>last saved</div>
        </div>
      </div>
    </Card>
  )
}
