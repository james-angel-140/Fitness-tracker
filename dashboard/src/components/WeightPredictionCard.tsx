import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { weightTrendWithAvg, weightPrediction, goalWeightKg } from '@/lib/data'

const TODAY_STR = new Date().toISOString().slice(0, 10)

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${m}/${d}`
}

const tooltipStyle = {
  backgroundColor: 'hsl(224 71% 7%)',
  border: '1px solid hsl(216 34% 17%)',
  borderRadius: '6px',
  fontSize: '12px',
  color: 'hsl(213 31% 91%)',
}

export function WeightPredictionCard() {
  const {
    latestLeanMassKg,
    bmrKcal,
    katchMcArdleTdee,
    calibratedTdee,
    calibrationDays,
    effectiveTdee,
    tdeeSource,
    daysWithData,
    avg7dCaloriesIn,
    avg7dCalsBurned,
    avg7dBalance,
    projectedWeightChange7d,
    projectedWeight7d,
    currentWeight,
  } = weightPrediction

  // Last 14 days of actual weight data
  const last14 = weightTrendWithAvg.slice(-14)
  const actualByDate = new Map(last14.map((p) => [p.date, p.value]))

  // Projected line + ±0.5 kg confidence band (water weight noise)
  const WATER_BAND = 0.5
  const dailyChange = avg7dBalance / 7700
  const projectedByDate   = new Map<string, number>()
  const bandHighByDate    = new Map<string, number>()
  const bandLowByDate     = new Map<string, number>()

  for (let i = 0; i <= 7; i++) {
    const d = new Date(TODAY_STR)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const mid = Math.round((currentWeight + dailyChange * i) * 100) / 100
    projectedByDate.set(dateStr, mid)
    bandHighByDate.set(dateStr, Math.round((mid + WATER_BAND) * 100) / 100)
    bandLowByDate.set(dateStr, Math.round((mid - WATER_BAND) * 100) / 100)
  }

  const allDates = Array.from(
    new Set([...last14.map((p) => p.date), ...Array.from(projectedByDate.keys())])
  ).sort()

  const chartData = allDates.map((date) => ({
    label: shortDate(date),
    actual:       actualByDate.get(date)    ?? null,
    projected:    projectedByDate.get(date)  ?? null,
    band_high:    bandHighByDate.get(date)   ?? null,
    band_low:     bandLowByDate.get(date)    ?? null,
  }))

  const allWeights = [
    ...last14.map((p) => p.value),
    projectedWeight7d + WATER_BAND,
    goalWeightKg,
  ]
  const yMin = Math.floor(Math.min(...allWeights) - 0.3)
  const yMax = Math.ceil(Math.max(...allWeights) + 0.3)

  const isDeficit = avg7dBalance < -50
  const isSurplus = avg7dBalance > 50
  const balanceColour = isDeficit ? 'text-emerald-400' : isSurplus ? 'text-amber-400' : 'text-muted-foreground'
  const changeColour  = projectedWeightChange7d < -0.05 ? 'text-emerald-400'
    : projectedWeightChange7d > 0.05 ? 'text-amber-400'
    : 'text-muted-foreground'

  const tdeeLabel = tdeeSource === 'calibrated'
    ? `${effectiveTdee} kcal (calibrated, ${calibrationDays}d)`
    : `${effectiveTdee} kcal (Katch-McArdle × 1.2)`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Weight Prediction</CardTitle>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            tdeeSource === 'calibrated'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {tdeeSource === 'calibrated' ? 'Self-calibrated' : 'Katch-McArdle est.'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">7d avg weight</p>
            <p className="text-2xl font-bold tabular-nums">{currentWeight}kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Avg daily balance</p>
            <p className={`text-2xl font-bold tabular-nums ${balanceColour}`}>
              {avg7dBalance > 0 ? '+' : ''}{avg7dBalance}
            </p>
            <p className="text-xs text-muted-foreground">kcal/day</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">In 7 days</p>
            <p className="text-2xl font-bold tabular-nums">{projectedWeight7d}kg</p>
            <p className={`text-xs font-medium ${changeColour}`}>
              {projectedWeightChange7d > 0 ? '+' : ''}{projectedWeightChange7d}kg
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: any, name: string) => {
                if (name === 'actual')    return [`${v}kg`, 'Actual']
                if (name === 'projected') return [`${v}kg`, 'Projected']
                if (name === 'band_high') return [`${v}kg`, '+0.5kg band']
                if (name === 'band_low')  return [`${v}kg`, '−0.5kg band']
                return [v, name]
              }}
            />
            <ReferenceLine
              y={goalWeightKg}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 2"
              strokeOpacity={0.4}
              label={{ value: `Goal ${goalWeightKg}kg`, position: 'insideTopRight', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
            />
            {/* Confidence band — dashed lines at ±0.5 kg from projection */}
            <Line dataKey="band_high" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 4" dot={false} strokeOpacity={0.4} isAnimationActive={false} />
            <Line dataKey="band_low"  stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 4" dot={false} strokeOpacity={0.4} isAnimationActive={false} />
            {/* Projected centre line */}
            <Line dataKey="projected" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            {/* Actual weight */}
            <Line dataKey="actual" stroke="hsl(210 100% 66%)" strokeWidth={2} dot={{ r: 2.5, fill: 'hsl(210 100% 66%)' }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* TDEE breakdown */}
        <div className="border-t border-border pt-3 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Effective TDEE</span>
            <span className="text-foreground font-medium">{tdeeLabel}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Avg food in ({daysWithData}d)</span>
            <span className="tabular-nums font-medium text-foreground">{avg7dCaloriesIn} kcal</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Avg workout burn</span>
            <span className="tabular-nums font-medium text-foreground">−{avg7dCalsBurned} kcal</span>
          </div>
          {tdeeSource !== 'calibrated' && latestLeanMassKg != null && (
            <div className="flex justify-between text-muted-foreground">
              <span>BMR (lean mass {latestLeanMassKg}kg)</span>
              <span className="tabular-nums font-medium text-foreground">{bmrKcal} kcal → ×1.2 = {katchMcArdleTdee} kcal</span>
            </div>
          )}
          {tdeeSource !== 'calibrated' && (
            <p className="text-muted-foreground/70 text-[10px] pt-1">
              Log food daily + weigh in regularly to enable self-calibrated TDEE
            </p>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
