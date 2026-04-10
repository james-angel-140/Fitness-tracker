import { Card, CardContent } from '@/components/ui/card'
import { latestStats, latestWeight } from '@/lib/data'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TileProps {
  label: string
  value: string
  sub: string
  trend?: 'up' | 'down' | 'neutral'
  good?: 'up' | 'down' // which direction is positive
}

function Tile({ label, value, sub, trend, good }: TileProps) {
  const trendColour =
    trend === undefined || trend === 'neutral'
      ? 'text-muted-foreground'
      : trend === good
      ? 'text-emerald-400'
      : 'text-amber-400'

  const TrendIcon =
    trend === 'up' ? TrendingUp
    : trend === 'down' ? TrendingDown
    : Minus

  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <span className="text-3xl font-bold tabular-nums leading-none">{value}</span>
          <TrendIcon className={`w-4 h-4 mb-0.5 ${trendColour}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function StatTiles() {
  const { weight_kg } = latestWeight
  const { vo2_max, resting_hr_bpm, body_fat_pct } = latestStats

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Tile
        label="Weight"
        value={`${weight_kg}kg`}
        sub="Goal: 75kg"
        trend={weight_kg < 73 ? 'down' : weight_kg > 76 ? 'up' : 'neutral'}
        good="up"
      />
      <Tile
        label="VO2 Max"
        value={vo2_max != null ? String(vo2_max) : '—'}
        sub="Goal: 50+"
        trend={vo2_max == null ? undefined : vo2_max >= 50 ? 'up' : vo2_max >= 43 ? 'neutral' : 'down'}
        good="up"
      />
      <Tile
        label="Resting HR"
        value={resting_hr_bpm != null ? `${resting_hr_bpm}` : '—'}
        sub="bpm · Goal: <50"
        trend={resting_hr_bpm == null ? undefined : resting_hr_bpm <= 50 ? 'down' : resting_hr_bpm <= 60 ? 'neutral' : 'up'}
        good="down"
      />
      <Tile
        label="Body Fat"
        value={body_fat_pct != null ? `${body_fat_pct}%` : '—'}
        sub="Goal: 14%"
        trend={body_fat_pct == null ? undefined : body_fat_pct <= 14 ? 'down' : body_fat_pct <= 16 ? 'neutral' : 'up'}
        good="down"
      />
    </div>
  )
}
