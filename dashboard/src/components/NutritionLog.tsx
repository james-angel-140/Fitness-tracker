import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { todayNutrition, nutritionTargets, dailyNutrition } from '@/lib/data'

function MacroBar({ label, value, target, colour }: { label: string; value: number; target: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {value} <span className="text-muted-foreground font-normal">/ {target}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  )
}

// Protein goal streak — consecutive days hitting ≥90% of target
function proteinStreak(): number {
  const target = nutritionTargets.protein_g * 0.9
  let streak = 0
  for (let i = dailyNutrition.length - 1; i >= 0; i--) {
    if (dailyNutrition[i].protein_g >= target) streak++
    else break
  }
  return streak
}

export function NutritionLog() {
  const streak = proteinStreak()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Nutrition — Today</CardTitle>
          {streak > 0 && (
            <span className="text-xs font-medium text-amber-400">{streak}d protein streak</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayNutrition ? (
          <>
            <MacroBar
              label={`Calories (${Math.round((todayNutrition.calories / nutritionTargets.calories) * 100)}%)`}
              value={todayNutrition.calories}
              target={nutritionTargets.calories}
              colour="#38bdf8"
            />
            <MacroBar
              label={`Protein (${Math.round((todayNutrition.protein_g / nutritionTargets.protein_g) * 100)}%)`}
              value={todayNutrition.protein_g}
              target={nutritionTargets.protein_g}
              colour="#34d399"
            />

            {/* Entry list */}
            <div className="space-y-1 pt-1 border-t border-border">
              {todayNutrition.entries.map((e, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">{e.time ?? '—'}</span>
                  <span className="text-xs flex-1 truncate">{e.description}</span>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {e.calories}kcal · {e.protein_g}g
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-2 space-y-2">
            <p className="text-xs text-muted-foreground">Nothing logged today.</p>
            <code className="block text-xs bg-muted rounded px-2 py-1.5 text-muted-foreground">
              npm run log:nutrition -- --food &quot;Meal name&quot; --calories 600 --protein 45
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
