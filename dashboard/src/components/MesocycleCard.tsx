import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { activeMesocycleWeek } from '@/lib/data'

function phaseColour(type: string) {
  if (type === 'accumulation')   return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  if (type === 'intensification') return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
  if (type === 'deload')          return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
  return 'text-muted-foreground bg-muted/30 border-border'
}

function phaseLabel(type: string) {
  if (type === 'accumulation')    return 'Accumulation'
  if (type === 'intensification') return 'Intensification'
  if (type === 'deload')          return 'Deload'
  return type
}

export function MesocycleCard() {
  if (!activeMesocycleWeek) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Mesocycle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active mesocycle. Create one in data/programs/.</p>
        </CardContent>
      </Card>
    )
  }

  const w = activeMesocycleWeek
  const progressPct = Math.round((w.currentWeekInMeso / w.totalWeeks) * 100)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{w.mesocycleName}</CardTitle>
          <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${phaseColour(w.phaseType)}`}>
            {phaseLabel(w.phaseType)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Week indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Week {w.weekNumber} · {w.phaseName}</span>
          <span className="text-muted-foreground text-xs tabular-nums">{w.currentWeekInMeso}/{w.totalWeeks} wks</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/70 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Nutrition targets */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Calories</p>
            <p className="text-lg font-semibold tabular-nums">{w.calorie_target.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal / day</p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Protein</p>
            <p className="text-lg font-semibold tabular-nums">{w.protein_target_g}g</p>
            <p className="text-[10px] text-muted-foreground">/ day</p>
          </div>
        </div>

        {/* Volume / intensity modifiers */}
        <div className="flex gap-3 text-xs text-muted-foreground pt-0.5">
          <span>Volume <span className="font-medium text-foreground">{Math.round(w.volume_modifier * 100)}%</span></span>
          <span>Intensity <span className="font-medium text-foreground">{Math.round(w.intensity_modifier * 100)}%</span></span>
        </div>

        {/* Week notes */}
        {w.notes && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2 leading-relaxed">
            {w.notes}
          </p>
        )}

      </CardContent>
    </Card>
  )
}
