import { Card, CardContent } from '@/components/ui/card'
import {
  latestWeightAvg7, latestZone2Run, sleepLog, trainingLoad,
  latestVo2, latestRhr, latestBodyFat, latestFitbod,
} from '@/lib/data'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TileProps {
  label: string
  value: string
  sub: string
  trend?: 'up' | 'down' | 'neutral'
  good?: 'up' | 'down'
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
          <TrendIcon className={`w-4 h-4 mb-0.5 shrink-0 ${trendColour}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function StatTiles() {
  const weight_kg = latestWeightAvg7

  // Weight — 7-day trend from body-weight-log
  const latestSleep = sleepLog.at(-1)
  const latestHrv = latestSleep?.hrv_ms
  const latestSleepHrs = latestSleep ? (latestSleep.sleep_hr ?? latestSleep.duration_hr) : null

  // Sleep trend: compare last night to 7-day average
  const recentSleep = sleepLog.slice(-7)
  const avgSleepHrs =
    recentSleep.length > 0
      ? recentSleep.reduce((s, e) => s + (e.sleep_hr ?? e.duration_hr), 0) / recentSleep.length
      : null

  // HRV trend: compare latest to 7-day average
  const recentHrv = sleepLog.slice(-7).filter((e) => e.hrv_ms != null)
  const avgHrv =
    recentHrv.length > 0
      ? recentHrv.reduce((s, e) => s + e.hrv_ms!, 0) / recentHrv.length
      : null

  // ACWR from training load
  const latestLoad = trainingLoad.at(-1)
  const acwr = latestLoad?.acwr ?? null

  // Zone 2 pace (display string)
  const zone2Pace = latestZone2Run?.avg_pace_per_km ?? null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

      {/* Row 1 — Body composition */}
      <Tile
        label="Weight"
        value={`${weight_kg}kg`}
        sub="7-day avg · Goal: 75kg"
        trend={weight_kg >= 74 ? 'up' : weight_kg >= 70 ? 'neutral' : 'down'}
        good="up"
      />
      <Tile
        label="Body Fat"
        value={latestBodyFat != null ? `${latestBodyFat}%` : '—'}
        sub="Goal: 14%"
        trend={latestBodyFat == null ? undefined : latestBodyFat <= 14 ? 'down' : latestBodyFat <= 16 ? 'neutral' : 'up'}
        good="down"
      />
      <Tile
        label="VO2 Max"
        value={latestVo2 != null ? String(latestVo2) : '—'}
        sub="Target: 45+ post-Hyrox"
        trend={latestVo2 == null ? undefined : latestVo2 >= 45 ? 'up' : latestVo2 >= 42 ? 'neutral' : 'down'}
        good="up"
      />
      <Tile
        label="Resting HR"
        value={latestRhr != null ? `${latestRhr}` : '—'}
        sub="bpm · Goal: <50"
        trend={latestRhr == null ? undefined : latestRhr <= 50 ? 'down' : latestRhr <= 58 ? 'neutral' : 'up'}
        good="down"
      />

      {/* Row 2 — Recovery & training */}
      <Tile
        label="Sleep"
        value={latestSleepHrs != null ? `${latestSleepHrs.toFixed(1)}h` : '—'}
        sub={avgSleepHrs != null ? `7-day avg: ${avgSleepHrs.toFixed(1)}h` : 'Last night'}
        trend={
          latestSleepHrs == null ? undefined
          : latestSleepHrs >= 7.5 ? 'up'
          : latestSleepHrs >= 6.5 ? 'neutral'
          : 'down'
        }
        good="up"
      />
      <Tile
        label="HRV"
        value={latestHrv != null ? `${latestHrv}ms` : '—'}
        sub={avgHrv != null ? `7-day avg: ${Math.round(avgHrv)}ms` : 'Overnight avg'}
        trend={
          latestHrv == null || avgHrv == null ? undefined
          : latestHrv >= avgHrv * 0.95 ? 'up'
          : latestHrv >= avgHrv * 0.85 ? 'neutral'
          : 'down'
        }
        good="up"
      />
      <Tile
        label="Fitbod Score"
        value={latestFitbod != null ? String(latestFitbod.overall) : '—'}
        sub={latestFitbod != null ? `Push ${latestFitbod.push} · Pull ${latestFitbod.pull} · Legs ${latestFitbod.legs}` : 'Overall strength'}
        trend={
          latestFitbod == null ? undefined
          : latestFitbod.overall >= 65 ? 'up'
          : latestFitbod.overall >= 58 ? 'neutral'
          : 'down'
        }
        good="up"
      />
      <Tile
        label="Training Load"
        value={acwr != null ? String(acwr) : '—'}
        sub={
          acwr == null ? 'ACWR ratio'
          : acwr > 1.3 ? 'ACWR · High — ease back'
          : acwr < 0.8 ? 'ACWR · Low — taper / rest'
          : 'ACWR · Optimal range'
        }
        trend={
          acwr == null ? undefined
          : acwr > 1.3 ? 'up'
          : acwr < 0.8 ? 'down'
          : 'neutral'
        }
        good={undefined}
      />

    </div>
  )
}
