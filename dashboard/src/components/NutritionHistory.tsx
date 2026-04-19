import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { dailyNutrition, nutritionTargets } from '@/lib/data'

function Bar({ value, target, colour }: { value: number; target: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="h-1 rounded-full bg-muted overflow-hidden w-16">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colour }} />
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function NutritionHistory() {
  const [expanded, setExpanded] = useState<string | null>(null)

  // newest first
  const days = [...dailyNutrition].reverse()

  if (days.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Nutrition History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {days.map((day) => {
            const isOpen = expanded === day.date
            const calPct = Math.round((day.calories / nutritionTargets.calories) * 100)
            const proOk = day.protein_g >= nutritionTargets.protein_g * 0.9
            const calColour = calPct >= 90 && calPct <= 115 ? '#34d399' : calPct < 70 ? '#f87171' : '#fbbf24'
            const proColour = proOk ? '#34d399' : day.protein_g >= nutritionTargets.protein_g * 0.7 ? '#fbbf24' : '#f87171'

            return (
              <div key={day.date}>
                {/* Day row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : day.date)}
                  className="w-full flex items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  {/* Date */}
                  <span className="text-sm font-medium w-24 sm:w-28 shrink-0">{formatDate(day.date)}</span>

                  {/* Calories */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums font-medium" style={{ color: calColour }}>
                        {day.calories} kcal
                      </span>
                      <Bar value={day.calories} target={nutritionTargets.calories} colour={calColour} />
                    </div>
                  </div>

                  {/* Protein */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums font-medium" style={{ color: proColour }}>
                        {day.protein_g}g pro
                      </span>
                      <Bar value={day.protein_g} target={nutritionTargets.protein_g} colour={proColour} />
                    </div>
                  </div>

                  {/* Carbs + fat if available */}
                  {(day.carbs_g > 0 || day.fat_g > 0) && (
                    <span className="text-xs text-muted-foreground ml-auto shrink-0 hidden sm:block">
                      {day.carbs_g > 0 && <>{day.carbs_g}g carbs</>}
                      {day.carbs_g > 0 && day.fat_g > 0 && ' · '}
                      {day.fat_g > 0 && <>{day.fat_g}g fat</>}
                    </span>
                  )}

                  {/* Expand chevron */}
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded meal entries */}
                {isOpen && (
                  <div className="px-4 pb-3 space-y-1 bg-muted/20">
                    {day.entries.map((e, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-2 py-0.5">
                        <span className="text-xs text-muted-foreground w-10 shrink-0">{e.time ?? '—'}</span>
                        <span className="text-xs flex-1">{e.description}</span>
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                          {e.calories} kcal · {e.protein_g}g
                        </span>
                      </div>
                    ))}
                    {/* Day totals footer */}
                    <div className="flex justify-end pt-1 border-t border-border">
                      <span className="text-xs tabular-nums font-medium">
                        {day.calories} kcal · {day.protein_g}g protein
                        {day.carbs_g > 0 && ` · ${day.carbs_g}g carbs`}
                        {day.fat_g > 0 && ` · ${day.fat_g}g fat`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
