import { Card, CardContent } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import { scoreHistory } from '@/lib/data'

export function ConsistencyGauge() {
  const latest = scoreHistory.at(-1)
  if (!latest) return null
  const score = Math.round(latest.categories.consistency ?? 0)

  return (
    <Card className="flex flex-col items-center justify-center py-6 px-6 h-full">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
        Consistency Score
      </p>

      <ScoreGauge score={score} label="Consistency" size={160} />

      <div className="mt-5 flex gap-6 text-center text-xs text-muted-foreground">
        <div>
          <div className="text-foreground font-medium">{latest.date}</div>
          <div>last saved</div>
        </div>
      </div>
    </Card>
  )
}
