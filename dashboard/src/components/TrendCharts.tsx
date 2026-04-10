import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { weightTrend, vo2Trend, rhrTrend, scoreHistory } from '@/lib/data'

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

interface MiniChartProps {
  title: string
  data: { date: string; value: number }[]
  color: string
  unit?: string
  referenceValue?: number
  referenceLabel?: string
  domain?: [number | 'auto', number | 'auto']
}

function MiniChart({ title, data, color, unit = '', referenceValue, referenceLabel, domain }: MiniChartProps) {
  const formatted = data.map((d) => ({ ...d, label: shortDate(d.date) }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
              domain={domain}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`${v}${unit}`, '']}
              labelFormatter={(l) => l}
            />
            {referenceValue !== undefined && (
              <ReferenceLine
                y={referenceValue}
                stroke="hsl(215 20% 35%)"
                strokeDasharray="4 3"
                label={{ value: referenceLabel ?? '', fontSize: 9, fill: 'hsl(215 20% 45%)' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TrendCharts() {
  const scoreSeries = scoreHistory.map((e) => ({ date: e.date, value: e.score }))

  return (
    <div className="space-y-4">
      <MiniChart
        title="Weight (kg)"
        data={weightTrend}
        color="hsl(210 100% 56%)"
        unit="kg"
        referenceValue={75}
        referenceLabel="goal 75kg"
        domain={[60, 80]}
      />
      <MiniChart
        title="VO2 Max"
        data={vo2Trend}
        color="#34d399"
        domain={[35, 60]}
      />
      <MiniChart
        title="Resting HR (bpm)"
        data={rhrTrend}
        color="#fb923c"
        unit=" bpm"
        domain={[40, 70]}
      />
      {scoreSeries.length > 1 && (
        <MiniChart
          title="Composite Score"
          data={scoreSeries}
          color="#a78bfa"
          domain={[0, 100]}
        />
      )}
    </div>
  )
}
