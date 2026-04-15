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
    baseTdee,
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

  // Projected line: anchor at today's smoothed weight, extend 7 days forward
  const projectedByDate = new Map<string, number>()
  const dailyChange = avg7dBalance / 7700
  for (let i = 0; i <= 7; i++) {
    const d = new Date(TODAY_STR)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    projectedByDate.set(dateStr, Math.round((currentWeight + dailyChange * i) * 100) / 100)
  }

  // Merge all dates for chart
  const allDates = Array.from(
    new Set([...last14.map((p) => p.date), ...Array.from(projectedByDate.keys())])
  ).sort()

  const chartData = allDates.map((date) => ({
    label: shortDate(date),
    actual: actualByDate.get(date) ?? null,
    projected: projectedByDate.get(date) ?? null,
  }))

  const isDeficit = avg7dBalance < -50
  const isSurplus = avg7dBalance > 50
  const balanceColour = isDeficit
    ? 'text-emerald-400'
    : isSurplus
    ? 'text-amber-400'
    : 'text-muted-foreground'

  const changeColour = projectedWeightChange7d < -0.05
    ? 'text-emerald-400'
    : projectedWeightChange7d > 0.05
    ? 'text-amber-400'
    : 'text-muted-foreground'

  // Y-axis domain: bracket actual + projected + goal with a bit of padding
  const allWeights = [
    ...last14.map((p) => p.value),
    projectedWeight7d,
    goalWeightKg,
  ]
  const yMin = Math.floor(Math.min(...allWeights) - 0.5)
  const yMax = Math.ceil(Math.max(...allWeights) + 0.5)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Weight Prediction</CardTitle>
          <span className="text-xs text-muted-foreground">
            {daysWithData}-day avg · base TDEE {baseTdee} kcal
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
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: any, name: string) => [`${v}kg`, name === 'actual' ? 'Actual' : 'Projected']}
            />
            <ReferenceLine
              y={goalWeightKg}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 2"
              strokeOpacity={0.4}
              label={{ value: `Goal ${goalWeightKg}kg`, position: 'insideTopRight', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Line
              dataKey="actual"
              stroke="hsl(210 100% 66%)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: 'hsl(210 100% 66%)' }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="projected"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Calorie breakdown */}
        <div className="border-t border-border pt-3 grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <p className="text-muted-foreground">Food in</p>
            <p className="font-semibold tabular-nums">{avg7dCaloriesIn} kcal</p>
          </div>
          <div>
            <p className="text-muted-foreground">Workout burn</p>
            <p className="font-semibold tabular-nums">−{avg7dCalsBurned} kcal</p>
          </div>
          <div>
            <p className="text-muted-foreground">Base TDEE</p>
            <p className="font-semibold tabular-nums">−{baseTdee} kcal</p>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
