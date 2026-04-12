import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { weightTrendWithAvg, bodyFatTrend, vo2Trend, rhrTrend, scoreHistory, currentScore, trainingLoad } from '@/lib/data'
import { useTimeRange, filterByRange } from '@/lib/TimeRangeContext'

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

const CATEGORY_COLOURS = {
  cardio:    '#38bdf8',
  strength:  '#a78bfa',
  body_comp: '#34d399',
}

const CATEGORY_LABELS = {
  cardio:    'Cardio',
  strength:  'Strength',
  body_comp: 'Body Comp',
}

function ScoreBreakdownChart() {
  const { range } = useTimeRange()

  // Merge saved history with the live current score so there's always
  // at least one data point even before --save has been run a second time.
  const today = '2026-04-10'
  const livePoint = {
    date: today,
    label: shortDate(today),
    cardio:      currentScore.cardio.contribution,
    strength:    currentScore.strength.contribution,
    body_comp:   currentScore.body_comp.contribution,

    total:       currentScore.score,
  }

  const historicalPoints = scoreHistory.map((e) => ({
    date:        e.date,
    label:       shortDate(e.date),
    cardio:      e.categories.cardio,
    strength:    e.categories.strength,
    body_comp:   e.categories.body_comp,

    total:       e.score,
  }))

  // Deduplicate: prefer live point for today's date
  const pointsByDate = new Map(historicalPoints.map((p) => [p.date, p]))
  pointsByDate.set(livePoint.date, livePoint)
  const allData = Array.from(pointsByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const data = filterByRange(allData, range)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Score Breakdown Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [
                `${v}`,
                CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS] ?? name,
              ]}
              labelFormatter={(l) => l}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) =>
                CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] ?? value
              }
            />
            {(Object.keys(CATEGORY_COLOURS) as (keyof typeof CATEGORY_COLOURS)[]).map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={CATEGORY_COLOURS[key]}
                fill={CATEGORY_COLOURS[key]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={{ r: 3, fill: CATEGORY_COLOURS[key], strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export { ScoreBreakdownChart }

export function WeightChart() {
  const { range } = useTimeRange()
  const data = filterByRange(weightTrendWithAvg, range).map((d) => ({
    ...d,
    label: shortDate(d.date),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Weight (kg)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[60, 80]}
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [
                `${v}kg`,
                name === 'avg7' ? '7-day avg' : 'Daily',
              ]}
              labelFormatter={(l) => l}
            />
            <ReferenceLine
              y={75}
              stroke="hsl(215 20% 35%)"
              strokeDasharray="4 3"
              label={{ value: 'goal 75kg', fontSize: 9, fill: 'hsl(215 20% 45%)' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(210 100% 56% / 0.35)"
              strokeWidth={1.5}
              dot={{ r: 2, fill: 'hsl(210 100% 56% / 0.35)', strokeWidth: 0 }}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avg7"
              stroke="hsl(210 100% 56%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function BodyFatChart() {
  const { range } = useTimeRange()
  const data = filterByRange(bodyFatTrend, range).map((d) => ({
    ...d,
    label: shortDate(d.date),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Body Fat (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[10, 25]}
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [
                `${v}%`,
                name === 'avg7' ? '7-day avg' : 'Daily',
              ]}
              labelFormatter={(l) => l}
            />
            <ReferenceLine
              y={14}
              stroke="hsl(215 20% 35%)"
              strokeDasharray="4 3"
              label={{ value: 'goal 14%', fontSize: 9, fill: 'hsl(215 20% 45%)' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(142 76% 36% / 0.35)"
              strokeWidth={1.5}
              dot={{ r: 2, fill: 'hsl(142 76% 36% / 0.35)', strokeWidth: 0 }}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avg7"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function Vo2Chart() {
  const { range } = useTimeRange()
  return (
    <MiniChart
      title="VO2 Max"
      data={filterByRange(vo2Trend, range)}
      color="#34d399"
      domain={[35, 60]}
    />
  )
}

export function RhrChart() {
  const { range } = useTimeRange()
  return (
    <MiniChart
      title="Resting HR (bpm)"
      data={filterByRange(rhrTrend, range)}
      color="#fb923c"
      unit=" bpm"
      domain={[40, 70]}
    />
  )
}

export function TrainingLoadChart() {
  const { range } = useTimeRange()
  const data = filterByRange(trainingLoad, range).map((d) => ({ ...d, label: shortDate(d.date) }))
  const latest = trainingLoad.at(-1)

  // ACWR status colour
  function acwrColour(acwr: number) {
    if (acwr > 1.3) return '#f87171'  // red — elevated risk
    if (acwr < 0.8) return '#94a3b8'  // grey — detraining
    return '#34d399'                   // green — optimal
  }

  const statusColour = latest ? acwrColour(latest.acwr) : '#94a3b8'
  const statusLabel =
    !latest ? '—'
    : latest.acwr > 1.3 ? `ACWR ${latest.acwr} — High load`
    : latest.acwr < 0.8 ? `ACWR ${latest.acwr} — Low load`
    : `ACWR ${latest.acwr} — Optimal`

  const keyItems = [
    {
      colour: 'hsl(215 20% 40%)',
      shape: 'bar',
      label: 'Daily TRIMP',
      desc: 'Session load — duration × effort (RPE). One bar per training day.',
    },
    {
      colour: '#38bdf8',
      shape: 'line',
      label: 'ATL — Acute Load (7-day)',
      desc: 'Current fatigue. Rises fast when you train hard, drops quickly on rest.',
    },
    {
      colour: '#a78bfa',
      shape: 'line',
      label: 'CTL — Chronic Load (28-day)',
      desc: 'Your fitness base. Moves slowly — reflects what your body is adapted to.',
    },
    {
      colour: '#34d399',
      shape: 'badge',
      label: 'ACWR 0.8–1.3 — Optimal',
      desc: 'Acute ÷ Chronic load. Sweet spot: building fitness without spiking risk.',
    },
    {
      colour: '#f87171',
      shape: 'badge',
      label: 'ACWR > 1.3 — High load',
      desc: 'Too much too soon. Elevated injury risk — ease back or add a rest day.',
    },
    {
      colour: '#94a3b8',
      shape: 'badge',
      label: 'ACWR < 0.8 — Low load',
      desc: 'Undertraining. Fitness base is declining — expected during taper.',
    },
  ]

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Training Load</CardTitle>
          <span className="text-xs font-medium" style={{ color: statusColour }}>{statusLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => {
                const labels: Record<string, string> = { trimp: 'TRIMP (session load)', atl: 'ATL — acute load (7d avg)', ctl: 'CTL — chronic load (28d avg)' }
                return [`${v}`, labels[name] ?? name]
              }}
              labelFormatter={(l) => l}
            />
            <ReferenceLine y={0} stroke="hsl(215 20% 25%)" />
            <Bar dataKey="trimp" fill="hsl(215 20% 30%)" radius={[2, 2, 0, 0]} />
            <Line type="monotone" dataKey="atl" stroke="#38bdf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ctl" stroke="#a78bfa" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Key */}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Key</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {keyItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                {/* Swatch */}
                <div className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4">
                  {item.shape === 'bar' ? (
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.colour }} />
                  ) : item.shape === 'line' ? (
                    <div className="w-4 h-0.5 rounded" style={{ backgroundColor: item.colour }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.colour }} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium leading-tight" style={{ color: item.colour }}>{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
