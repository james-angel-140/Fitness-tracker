import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { activeInjuries } from '@/lib/data'

const SEVERITY_COLOUR: Record<string, string> = {
  mild:     'text-amber-400',
  moderate: 'text-orange-400',
  severe:   'text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  rehab:  'In rehab',
}

export function InjuryCard() {
  if (activeInjuries.length === 0) return null

  return (
    <Card className="border-orange-500/40">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">⚠</span>
          <CardTitle>Injuries</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeInjuries.map((inj) => (
          <div key={inj.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium capitalize">{inj.body_part}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium capitalize ${SEVERITY_COLOUR[inj.severity] ?? 'text-muted-foreground'}`}>
                  {inj.severity}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[inj.status] ?? inj.status}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground capitalize">{inj.injury_type}</p>

            {inj.affected_movements && inj.affected_movements.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-400 mb-1">Avoid</p>
                <div className="flex flex-wrap gap-1">
                  {inj.affected_movements.map((m: string) => (
                    <span key={m} className="text-xs bg-red-500/10 text-red-400 rounded px-1.5 py-0.5">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inj.rehab_exercises && inj.rehab_exercises.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-400 mb-1">Rehab</p>
                <div className="flex flex-wrap gap-1">
                  {inj.rehab_exercises.map((e: string) => (
                    <span key={e} className="text-xs bg-green-500/10 text-green-400 rounded px-1.5 py-0.5">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inj.notes && (
              <p className="text-xs text-muted-foreground border-l-2 border-orange-500/40 pl-2">
                {inj.notes}
              </p>
            )}

            <p className="text-xs text-muted-foreground">Since {inj.date_onset}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
