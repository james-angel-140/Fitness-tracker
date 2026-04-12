import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { prs, oneRmTrends, latestWeightAvg7 } from '@/lib/data'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

const tooltipStyle = {
  backgroundColor: 'hsl(224 71% 7%)',
  border: '1px solid hsl(216 34% 17%)',
  borderRadius: '6px',
  fontSize: '11px',
  color: 'hsl(213 31% 91%)',
}

function Sparkline({ data }: { data: { date: string; est1rm: number }[] }) {
  if (data.length < 2) return null
  const min = Math.min(...data.map((d) => d.est1rm))
  const max = Math.max(...data.map((d) => d.est1rm))
  const trend = data.at(-1)!.est1rm - data[0].est1rm
  const colour = trend >= 0 ? '#34d399' : '#f87171'

  return (
    <ResponsiveContainer width={64} height={28}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [`${v}kg`, 'Est. 1RM']}
          labelFormatter={(_, p) => p[0]?.payload?.date ?? ''}
        />
        <Line
          type="monotone"
          dataKey="est1rm"
          stroke={colour}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PRTable() {
  const bw = latestWeightAvg7

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Records</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-3 px-6 py-2 border-b border-border">
          <div className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Lift</div>
          <div className="w-28 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Best set</div>
          <div className="w-20 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Est. 1RM</div>
          <div className="w-14 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">×BW</div>
          <div className="w-16 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">Trend</div>
        </div>
        <div className="divide-y divide-border">
          {prs.map((pr) => {
            const trend = oneRmTrends[pr.lift] ?? []
            const latestEst1rm = trend.at(-1)?.est1rm ?? null
            const xbw = pr.current_best_kg != null ? (pr.current_best_kg / bw).toFixed(2) : null

            return (
              <div key={pr.lift} className="flex items-center gap-3 px-6 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{pr.lift}</p>
                  {pr.current_best_date && (
                    <p className="text-xs text-muted-foreground">{pr.current_best_date}</p>
                  )}
                </div>
                <div className="w-28 text-right text-sm font-semibold tabular-nums shrink-0">
                  {pr.current_best_kg != null ? `${pr.current_best_kg}kg` : 'BW'}
                  {' '}
                  <span className="font-normal text-muted-foreground text-xs">× {pr.current_best_reps}</span>
                </div>
                <div className="w-20 text-right tabular-nums shrink-0">
                  {latestEst1rm != null ? (
                    <span className="text-sm font-medium">{latestEst1rm}kg</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <div className="w-14 text-right tabular-nums shrink-0">
                  {xbw != null ? (
                    <span className="text-sm text-muted-foreground">{xbw}×</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <div className="w-16 flex justify-center shrink-0">
                  <Sparkline data={trend} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
