import { useState } from 'react'
import { Plus, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { todayNutrition, nutritionTargets, dailyNutrition, activeMesocycleWeek } from '@/lib/data'

// Use mesocycle week targets if available, else fallback constants
const targets = activeMesocycleWeek
  ? { calories: activeMesocycleWeek.calorie_target, protein_g: activeMesocycleWeek.protein_target_g }
  : { calories: nutritionTargets.calories, protein_g: nutritionTargets.protein_g }

interface LoggedEntry {
  date?: string
  time?: string
  description?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  approximate?: boolean
}

interface ParsedEstimate {
  description: string
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  approximate?: boolean
}

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
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
    </div>
  )
}

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

  // Entries added this session (before page reload)
  const [sessionEntries, setSessionEntries] = useState<LoggedEntry[]>([])

  // Log input state
  const [inputText, setInputText] = useState('')
  const [parseState, setParseState] = useState<'idle' | 'parsing' | 'confirm' | 'saving' | 'error'>('idle')
  const isSaving = parseState === 'saving'
  const [estimate, setEstimate] = useState<ParsedEstimate | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showInput, setShowInput] = useState(false)

  const staticEntries = todayNutrition?.entries ?? []
  const allEntries = [...sessionEntries, ...staticEntries]

  const totalCalories = (todayNutrition?.calories ?? 0) + sessionEntries.reduce((s, e) => s + (e.calories ?? 0), 0)
  const totalProtein = (todayNutrition?.protein_g ?? 0) + sessionEntries.reduce((s, e) => s + (e.protein_g ?? 0), 0)

  async function handleParse() {
    if (!inputText.trim()) return
    setParseState('parsing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/nutrition/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText.trim() }),
        credentials: 'include',
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setEstimate(data)
      setParseState('confirm')
    } catch (err) {
      setErrorMsg(String(err))
      setParseState('error')
    }
  }

  async function handleConfirm() {
    if (!estimate) return
    setParseState('saving')
    try {
      const res = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimate),
        credentials: 'include',
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const { entry } = await res.json()
      setSessionEntries(prev => [entry, ...prev])
      setInputText('')
      setEstimate(null)
      setParseState('idle')
      setShowInput(false)
    } catch (err) {
      setErrorMsg(String(err))
      setParseState('error')
    }
  }

  function handleDiscard() {
    setEstimate(null)
    setParseState('idle')
    setInputText('')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Nutrition — Today</CardTitle>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="text-xs font-medium text-amber-400">{streak}d protein streak</span>
            )}
            <button
              onClick={() => setShowInput(v => !v)}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Log food"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Macro progress bars */}
        <MacroBar
          label={`Calories (${Math.round((totalCalories / targets.calories) * 100)}%)`}
          value={totalCalories}
          target={targets.calories}
          colour="#38bdf8"
        />
        <MacroBar
          label={`Protein (${Math.round((totalProtein / targets.protein_g) * 100)}%)`}
          value={totalProtein}
          target={targets.protein_g}
          colour="#34d399"
        />

        {/* Log input */}
        {showInput && parseState !== 'confirm' && (
          <div className="pt-1 space-y-2 border-t border-border">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse() }}
              placeholder="e.g. 200g chicken breast with rice and broccoli"
              rows={2}
              className="w-full text-xs rounded-lg border border-border bg-muted/30 px-3 py-2 placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                onClick={handleParse}
                disabled={!inputText.trim() || parseState === 'parsing'}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {parseState === 'parsing' ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Estimating…</>
                ) : 'Estimate macros'}
              </button>
              <button
                onClick={() => { setShowInput(false); setInputText(''); setParseState('idle') }}
                className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
            {parseState === 'error' && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </div>
        )}

        {/* Confirm estimate */}
        {(parseState === 'confirm' || parseState === 'saving') && estimate && (
          <div className="pt-1 space-y-2 border-t border-border">
            <p className="text-xs font-medium">{estimate.description}{estimate.approximate && <span className="text-muted-foreground ml-1">(estimated)</span>}</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { label: 'kcal', value: estimate.calories, colour: 'text-sky-400' },
                { label: 'protein', value: `${estimate.protein_g}g`, colour: 'text-emerald-400' },
                { label: 'carbs', value: `${estimate.carbs_g ?? '—'}g`, colour: 'text-amber-400' },
                { label: 'fat', value: `${estimate.fat_g ?? '—'}g`, colour: 'text-orange-400' },
              ].map(({ label, value, colour }) => (
                <div key={label} className="rounded-lg bg-muted/40 px-1 py-1.5">
                  <p className={`text-sm font-bold tabular-nums ${colour}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSaving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle className="w-3 h-3" /> Log it</>
                )}
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Entry list */}
        {allEntries.length > 0 && (
          <EntryList entries={allEntries} sessionCount={sessionEntries.length} />
        )}

        {allEntries.length === 0 && parseState === 'idle' && !showInput && (
          <p className="text-xs text-muted-foreground py-1">Nothing logged today — tap + to add a meal.</p>
        )}
      </CardContent>
    </Card>
  )
}

function EntryList({ entries, sessionCount }: { entries: LoggedEntry[]; sessionCount: number }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? entries : entries.slice(0, 4)

  return (
    <div className="space-y-1 pt-1 border-t border-border">
      {visible.map((e, i) => (
        <div key={i} className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground w-10 shrink-0">{e.time ?? '—'}</span>
          <span className={`text-xs flex-1 truncate ${i < sessionCount ? 'text-emerald-400' : ''}`}>
            {e.description}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {e.calories}kcal · {e.protein_g}g
          </span>
        </div>
      ))}
      {entries.length > 4 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `${entries.length - 4} more`}
        </button>
      )}
    </div>
  )
}
