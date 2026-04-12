import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { readiness, todayReadiness } from '@/lib/data'
import { useTimeRange, filterByRange } from '@/lib/TimeRangeContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

function flagColour(flag: 'green' | 'amber' | 'red') {
  if (flag === 'green') return '#34d399'
  if (flag === 'amber') return '#fbbf24'
  return '#f87171'
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${value}%`,
              backgroundColor: value >= 70 ? '#34d399' : value >= 50 ? '#fbbf24' : '#f87171',
            }}
          />
        </div>
        <span className="text-xs tabular-nums w-7 text-right">{value}</span>
      </div>
    </div>
  )
}

export function ReadinessCard() {
  const { range } = useTimeRange()
  const data = filterByRange(readiness, range).map((r) => ({
    ...r,
    label: shortDate(r.date),
  }))

  if (readiness.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle>Readiness</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No sleep data yet — sync Apple Watch to see readiness.</p>
        </CardContent>
      </Card>
    )
  }

  const today = todayReadiness

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Readiness</CardTitle>
          {today && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: flagColour(today.flag),
                backgroundColor: `${flagColour(today.flag)}20`,
              }}
            >
              {today.flag === 'green' ? 'Ready' : today.flag === 'amber' ? 'Moderate' : 'Rest'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score trend */}
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={data} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`${v}`, 'Readiness']}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="score" radius={[2, 2, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={flagColour(entry.flag)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Factor breakdown for today */}
        {today && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <ScorePill label="HRV" value={today.hrv_score} />
            <ScorePill label="Sleep" value={today.sleep_score} />
            <ScorePill label="Resting HR" value={today.rhr_score} />
            <ScorePill label="Load" value={today.load_score} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
