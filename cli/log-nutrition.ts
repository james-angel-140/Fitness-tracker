/**
 * log-nutrition.ts
 *
 * Appends a food / meal entry to data/nutrition/daily-log.json.
 * Each entry is timestamped so daily and weekly totals can be derived.
 *
 * Usage:
 *   npm run log:nutrition -- --food "Chicken + rice bowl" --calories 650 --protein 45
 *   npm run log:nutrition -- --food "Protein shake" --calories 220 --protein 40 --carbs 10 --fat 5
 *   npm run log:nutrition -- --food "Full day estimate" --calories 2100 --protein 158 --date 2026-04-11
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const LOG_FILE = join(DATA_DIR, 'nutrition', 'daily-log.json')

// ─── Parse args ───────────────────────────────────────────────────────────────

function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

function getNumArg(flag: string): number | null {
  const v = getArg(flag)
  if (v === null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

const food = getArg('--food')
const calories = getNumArg('--calories')
const protein = getNumArg('--protein')
const carbs = getNumArg('--carbs')
const fat = getNumArg('--fat')
const dateArg = getArg('--date')

if (!food) {
  console.error('Error: --food is required. e.g. --food "Chicken + rice"')
  process.exit(1)
}
if (calories === null) {
  console.error('Error: --calories is required. e.g. --calories 650')
  process.exit(1)
}
if (protein === null) {
  console.error('Error: --protein is required. e.g. --protein 45')
  process.exit(1)
}

// ─── Build entry ──────────────────────────────────────────────────────────────

const now = new Date()
const date = dateArg ?? now.toISOString().slice(0, 10)
const time = now.toTimeString().slice(0, 5) // "HH:MM"

const entry: Record<string, unknown> = {
  date,
  time,
  description: food,
  calories,
  protein_g: protein,
}
if (carbs !== null) entry.carbs_g = carbs
if (fat !== null) entry.fat_g = fat

// ─── Append to log ────────────────────────────────────────────────────────────

const log: unknown[] = JSON.parse(readFileSync(LOG_FILE, 'utf8'))
log.push(entry)

// Keep sorted by date + time
log.sort((a: any, b: any) => {
  const da = `${a.date}T${a.time ?? '00:00'}`
  const db = `${b.date}T${b.time ?? '00:00'}`
  return da.localeCompare(db)
})

writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + '\n')

// ─── Summary ──────────────────────────────────────────────────────────────────

// Compute today's running total
const todayEntries = (log as any[]).filter((e) => e.date === date)
const totalCal = todayEntries.reduce((s: number, e: any) => s + (e.calories ?? 0), 0)
const totalPro = todayEntries.reduce((s: number, e: any) => s + (e.protein_g ?? 0), 0)

console.log(`
  Logged: ${food}
  ${calories} kcal · ${protein}g protein${carbs != null ? ` · ${carbs}g carbs` : ''}${fat != null ? ` · ${fat}g fat` : ''}

  Today (${date}) — ${todayEntries.length} entr${todayEntries.length === 1 ? 'y' : 'ies'}:
    Calories: ${totalCal} / 2300 kcal  (${Math.round((totalCal / 2300) * 100)}%)
    Protein:  ${totalPro}g / 165g      (${Math.round((totalPro / 165) * 100)}%)
`)
