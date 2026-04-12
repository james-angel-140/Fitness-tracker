import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { muscleVolume, patternVolume, pushPullRatio7d, pushPullStatus } from '@/lib/data'

const MUSCLE_LABELS: Record<string, string> = {
  chest:      'Chest',
  lats:       'Lats',
  upper_back: 'Upper back',
  shoulders:  'Shoulders',
  triceps:    'Triceps',
  biceps:     'Biceps',
  quads:      'Quads',
  hamstrings: 'Hamstrings',
  glutes:     'Glutes',
  lower_back: 'Lower back',
  abs:        'Abs',
}

const PATTERN_LABELS: Record<string, string> = {
  push:  'Push',
  pull:  'Pull',
  hinge: 'Hinge',
  squat: 'Squat',
  core:  'Core',
}

function statusColour(status: string) {
  if (status === 'under')   return '#f87171'   // red  — below MEV
  if (status === 'over')    return '#fbbf24'   // amber — over MRV
  return '#34d399'                              // green — optimal range
}

function ratioBadgeColour(status: string) {
  if (status === 'optimal')       return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10'
  if (status === 'push-dominant') return 'text-amber-400 border-amber-400/40 bg-amber-400/10'
  if (status === 'pull-dominant') return 'text-sky-400 border-sky-400/40 bg-sky-400/10'
  return 'text-muted-foreground border-border bg-muted/30'
}

/** A horizontal bar showing sets_7d against [mev … mrv] scale */
function VolumeBar({
  sets, mev, mav_lo, mav_hi, mrv, status,
}: {
  sets: number; mev: number; mav_lo: number; mav_hi: number; mrv: number; status: string
}) {
  // Use mrv + some headroom as the bar scale ceiling
  const scale = Math.max(mrv * 1.15, sets * 1.1, 1)
  const fillPct  = Math.min(100, (sets  / scale) * 100)
  const mevPct   = (mev    / scale) * 100
  const mavLoPct = (mav_lo / scale) * 100
  const mavHiPct = (mav_hi / scale) * 100
  const mrvPct   = (mrv    / scale) * 100

  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      {/* MAV zone tint */}
      <div
        className="absolute top-0 bottom-0 bg-emerald-500/15"
        style={{ left: `${mavLoPct}%`, width: `${mavHiPct - mavLoPct}%` }}
      />
      {/* Actual fill */}
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all"
        style={{ width: `${fillPct}%`, backgroundColor: statusColour(status) }}
      />
      {/* MEV marker */}
      <div className="absolute top-0 bottom-0 w-px bg-border/80" style={{ left: `${mevPct}%` }} />
      {/* MRV marker */}
      <div className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${mrvPct}%` }} />
    </div>
  )
}

export function MuscleVolumeCard() {
  const underMEV = muscleVolume.filter(m => m.status_7d === 'under' && (m.sets_7d > 0 || m.mev <= 8))
  const overMRV  = muscleVolume.filter(m => m.status_7d === 'over')

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Muscle Volume Balance</CardTitle>
          {/* Push : Pull badge */}
          {pushPullRatio7d !== null && (
            <span
              className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${ratioBadgeColour(pushPullStatus)}`}
              title="Push:Pull ratio — optimal 0.8–1.2"
            >
              Push:Pull {pushPullRatio7d}×
              {pushPullStatus === 'push-dominant' && ' ↑ push-heavy'}
              {pushPullStatus === 'pull-dominant' && ' ↓ pull-heavy'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Alert strip if something is off */}
        {(underMEV.length > 0 || overMRV.length > 0) && (
          <div className="space-y-1">
            {underMEV.length > 0 && (
              <p className="text-xs text-red-400">
                ↓ Below MEV (7d avg): {underMEV.map(m => MUSCLE_LABELS[m.muscle] ?? m.muscle).join(', ')}
              </p>
            )}
            {overMRV.length > 0 && (
              <p className="text-xs text-amber-400">
                ↑ Approaching MRV: {overMRV.map(m => MUSCLE_LABELS[m.muscle] ?? m.muscle).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Per-muscle rows */}
        <div className="space-y-2.5">
          {muscleVolume.map(m => (
            <div key={m.muscle} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground w-24 shrink-0">
                  {MUSCLE_LABELS[m.muscle] ?? m.muscle}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="tabular-nums font-medium"
                    style={{ color: statusColour(m.status_7d) }}
                  >
                    {m.sets_7d} sets
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    MEV {m.mev}–MRV {m.mrv}
                  </span>
                </div>
              </div>
              <VolumeBar
                sets={m.sets_7d}
                mev={m.mev}
                mav_lo={m.mav_lo}
                mav_hi={m.mav_hi}
                mrv={m.mrv}
                status={m.status_7d}
              />
            </div>
          ))}
        </div>

        {/* Pattern breakdown */}
        <div className="border-t border-border pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Sets by movement pattern (7 days)
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {patternVolume.filter(p => p.sets_7d > 0).map(p => (
              <span key={p.pattern} className="text-xs tabular-nums">
                <span className="text-muted-foreground">{PATTERN_LABELS[p.pattern] ?? p.pattern}: </span>
                <span className="font-medium">{p.sets_7d}</span>
              </span>
            ))}
            {patternVolume.every(p => p.sets_7d === 0) && (
              <span className="text-xs text-muted-foreground">No strength sessions in the last 7 days.</span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1.5 rounded-full bg-red-400/80" /> Below MEV
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1.5 rounded-full bg-emerald-400/80" /> In MAV range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1.5 rounded-full bg-amber-400/80" /> Above MRV
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
