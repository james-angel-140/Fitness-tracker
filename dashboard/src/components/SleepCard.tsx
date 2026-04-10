import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { sleepLog } from '@/lib/data'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

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

function sleepColour(hrs: number) {
  if (hrs >= 7.5) return '#34d399'  // green — good
  if (hrs >= 6.5) return '#fbbf24'  // amber — ok
  return '#f87171'                   // red — poor
}

// Mini card — same height/style as WeightChart / Vo2Chart / RhrChart
export function SleepCard() {
  if (sleepLog.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Sleep</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No sleep data yet. Run import:health to sync from Apple Watch.</p>
        </CardContent>
      </Card>
    )
  }

  const recent = sleepLog.slice(-14)
  const latest = sleepLog.at(-1)!
  const latestHrs = latest.sleep_hr ?? latest.duration_hr

  const data = recent.map((e) => ({
    label: shortDate(e.date),
    hrs: e.sleep_hr ?? e.duration_hr,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Sleep (hrs)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`${v.toFixed(1)}h`, 'Sleep']}
              labelFormatter={(l) => l}
            />
            <ReferenceLine
              y={8}
              stroke="hsl(215 20% 35%)"
              strokeDasharray="4 3"
              label={{ value: '8h', fontSize: 9, fill: 'hsl(215 20% 45%)' }}
            />
            <Bar dataKey="hrs" radius={[2, 2, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={sleepColour(entry.hrs)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {latest.hrv_ms != null && (
          <p className="text-xs text-muted-foreground mt-1">
            Last night: <span className="font-medium" style={{ color: sleepColour(latestHrs) }}>{latestHrs.toFixed(1)}h</span>
            {' · '}HRV <span className="font-medium text-foreground">{latest.hrv_ms}ms</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
