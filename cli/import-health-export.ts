/**
 * import-health-export.ts
 *
 * Reads daily JSON files from Health Auto Export and upserts into:
 *   data/sleep-log.json       — sleep stages, HRV, overnight RHR, respiratory rate
 *   data/body-weight-log.json — daily weight from Withings scale
 *   data/stats-snapshots.json — VO2 max, weight, body fat % (when readings appear)
 *
 * Usage:
 *   npx tsx cli/import-health-export.ts
 *   npx tsx cli/import-health-export.ts --dry-run   # preview only, no writes
 */

import * as fs from 'fs'
import * as path from 'path'

const HAE_DIR =
  `${process.env.HOME}/Library/Mobile Documents/iCloud~com~ifunography~HealthExport/Documents/New Automation`

const DATA_DIR = path.resolve(__dirname, '../data')
const SLEEP_LOG_PATH = path.join(DATA_DIR, 'sleep-log.json')
const STATS_PATH = path.join(DATA_DIR, 'stats-snapshots.json')
const WEIGHT_LOG_PATH = path.join(DATA_DIR, 'body-weight-log.json')

const DRY_RUN = process.argv.includes('--dry-run')
const LBS_TO_KG = 0.453592

// ─── Types ────────────────────────────────────────────────────────────────────

interface SleepEntry {
  date: string
  duration_hr: number
  sleep_hr: number
  deep_hr?: number
  rem_hr?: number
  awake_hr?: number
  hrv_ms?: number
  resting_hr?: number
  respiratory_rate?: number
  source: string
}

interface WeightEntry {
  date: string
  weight_kg: number
  body_fat_pct?: number
  lean_mass_kg?: number
  change_kg?: number | null
  notes?: string
}

interface WeightLog {
  goal_weight_kg: number
  goal_body_fat_pct?: number
  goal_notes?: string
  starting_weight_kg: number
  starting_date: string
  entries: WeightEntry[]
  monthly_averages: { month: string; avg_weight_kg: number }[]
}

interface StatsSnapshot {
  date: string
  weight_kg: number
  body_fat_pct?: number
  vo2_max?: number
  resting_hr_bpm?: number
  fitbod?: { overall: number; push: number; pull: number; legs: number }
  notes?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(haeDate: string): string {
  return haeDate.slice(0, 10)
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function firstForDate<T extends { date: string }>(
  items: T[],
  isoDate: string,
): T | undefined {
  return items.find((i) => toISODate(i.date) === isoDate)
}

// ─── Parse one HAE file ───────────────────────────────────────────────────────

interface ParsedDay {
  isoDate: string
  sleep?: SleepEntry
  weight_kg?: number
  body_fat_pct?: number
  lean_mass_kg?: number
  vo2?: number
}

function parseHAEFile(filePath: string): ParsedDay {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const metrics: { name: string; units?: string; data: Record<string, unknown>[] }[] =
    raw.data?.metrics ?? []

  const isoDate = path
    .basename(filePath, '.json')
    .replace('HealthAutoExport-', '')

  const get = (name: string) => metrics.find((m) => m.name === name)

  // Sleep ─────────────────────────────────────────────────────────────────────
  const sleepMetric = get('sleep_analysis')
  const sleepData = (sleepMetric?.data ?? []) as {
    date: string
    totalSleep?: number
    core?: number
    deep?: number
    rem?: number
    awake?: number
    sleepStart?: string
    sleepEnd?: string
    inBedStart?: string
    inBedEnd?: string
  }[]

  let sleep: SleepEntry | undefined
  const summary = sleepData.find((s) => (s.totalSleep ?? 0) > 0)
  if (summary) {
    const inBedStart = summary.inBedStart ?? summary.sleepStart
    const inBedEnd = summary.inBedEnd ?? summary.sleepEnd
    let durationHr = summary.totalSleep ?? 0
    if (inBedStart && inBedEnd) {
      const start = new Date(inBedStart.replace(' +0100', '+01:00'))
      const end = new Date(inBedEnd.replace(' +0100', '+01:00'))
      durationHr = (end.getTime() - start.getTime()) / 3_600_000
    }
    sleep = {
      date: isoDate,
      duration_hr: r2(durationHr),
      sleep_hr: r2(summary.totalSleep ?? 0),
      ...(summary.deep != null && { deep_hr: r2(summary.deep) }),
      ...(summary.rem != null && { rem_hr: r2(summary.rem) }),
      ...(summary.awake != null && { awake_hr: r2(summary.awake) }),
      source: 'health-auto-export',
    }
  }

  // HRV — overnight readings (before 9am)
  const hrvData = (get('heart_rate_variability')?.data ?? []) as { date: string; qty: number }[]
  const overnightHrv = hrvData.filter((h) => {
    const hour = new Date(h.date.replace(' +0100', '+01:00')).getHours()
    return hour < 9
  })
  if (overnightHrv.length > 0 && sleep) {
    sleep.hrv_ms = Math.round(
      overnightHrv.reduce((s, h) => s + h.qty, 0) / overnightHrv.length,
    )
  }

  // Resting HR
  const rhrData = (get('resting_heart_rate')?.data ?? []) as { date: string; qty: number }[]
  const rhr = firstForDate(rhrData, isoDate)
  if (rhr && sleep) sleep.resting_hr = Math.round(rhr.qty)

  // Respiratory rate (overnight)
  const respData = (get('respiratory_rate')?.data ?? []) as { date: string; qty: number }[]
  const overnightResp = respData.filter((r) => {
    const hour = new Date(r.date.replace(' +0100', '+01:00')).getHours()
    return hour < 9
  })
  if (overnightResp.length > 0 && sleep) {
    sleep.respiratory_rate = r2(
      overnightResp.reduce((s, r) => s + r.qty, 0) / overnightResp.length,
    )
  }

  // VO2 max
  const vo2Data = (get('vo2_max')?.data ?? []) as { date: string; qty: number }[]
  const vo2 = firstForDate(vo2Data, isoDate)

  // Weight — Withings stores in lbs, convert to kg
  const weightMetric = get('weight_body_mass')
  const weightData = (weightMetric?.data ?? []) as { date: string; qty: number }[]
  const weightEntry = firstForDate(weightData, isoDate)
  const weight_kg = weightEntry
    ? r2(weightEntry.qty * (weightMetric?.units === 'lb' ? LBS_TO_KG : 1))
    : undefined

  // Body fat %
  const bfData = (get('body_fat_percentage')?.data ?? []) as { date: string; qty: number }[]
  const bfEntry = firstForDate(bfData, isoDate)
  const body_fat_pct = bfEntry ? r2(bfEntry.qty) : undefined

  // Lean mass — also in lbs from Withings
  const leanMetric = get('lean_body_mass')
  const leanData = (leanMetric?.data ?? []) as { date: string; qty: number }[]
  const leanEntry = firstForDate(leanData, isoDate)
  const lean_mass_kg = leanEntry
    ? r2(leanEntry.qty * (leanMetric?.units === 'lb' ? LBS_TO_KG : 1))
    : undefined

  return {
    isoDate,
    sleep,
    weight_kg,
    body_fat_pct,
    lean_mass_kg,
    vo2: vo2 ? r2(vo2.qty) : undefined,
  }
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

function upsertSleep(entries: SleepEntry[], entry: SleepEntry): 'added' | 'updated' {
  const idx = entries.findIndex((e) => e.date === entry.date)
  if (idx >= 0) { entries[idx] = entry; return 'updated' }
  entries.push(entry)
  return 'added'
}

function upsertWeightEntry(log: WeightLog, day: ParsedDay): 'added' | 'updated' | 'skipped' {
  if (day.weight_kg == null) return 'skipped'

  const entries = log.entries
  const idx = entries.findIndex((e) => e.date === day.isoDate)

  // Compute change_kg relative to the most recent prior entry
  const prior = entries.filter((e) => e.date < day.isoDate).at(-1)
  const change_kg = prior ? r2(day.weight_kg - prior.weight_kg) : null

  const entry: WeightEntry = {
    date: day.isoDate,
    weight_kg: day.weight_kg,
    ...(day.body_fat_pct != null && { body_fat_pct: day.body_fat_pct }),
    ...(day.lean_mass_kg != null && { lean_mass_kg: day.lean_mass_kg }),
    change_kg,
    notes: 'Withings (auto-imported)',
  }

  if (idx >= 0) { entries[idx] = entry; return 'updated' }
  entries.push(entry)
  return 'added'
}

function upsertStatsSnapshot(
  snapshots: StatsSnapshot[],
  day: ParsedDay,
): 'added' | 'updated' | 'skipped' {
  const { isoDate, vo2, weight_kg, body_fat_pct } = day
  if (vo2 == null && weight_kg == null && body_fat_pct == null) return 'skipped'

  const idx = snapshots.findIndex((s) => s.date === isoDate)
  const last = snapshots.at(-1)

  if (idx >= 0) {
    // Merge new fields into existing snapshot
    const existing = snapshots[idx]
    snapshots[idx] = {
      ...existing,
      ...(weight_kg != null && { weight_kg }),
      ...(body_fat_pct != null && { body_fat_pct }),
      ...(vo2 != null && { vo2_max: vo2 }),
    }
    return 'updated'
  }

  // Skip VO2-only snapshot if value hasn't changed from last
  if (vo2 != null && last?.vo2_max === vo2 && weight_kg == null) return 'skipped'

  snapshots.push({
    date: isoDate,
    weight_kg: weight_kg ?? last?.weight_kg ?? 69,
    ...(body_fat_pct != null && { body_fat_pct }),
    ...(vo2 != null && { vo2_max: vo2 }),
    notes: 'auto-imported from Health Auto Export',
  })
  return 'added'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const files = fs
    .readdirSync(HAE_DIR)
    .filter((f) => f.startsWith('HealthAutoExport-') && f.endsWith('.json'))
    .sort()

  if (files.length === 0) {
    console.log('No HAE files found in', HAE_DIR)
    return
  }

  const sleepLog: { entries: SleepEntry[] } = JSON.parse(fs.readFileSync(SLEEP_LOG_PATH, 'utf-8'))
  const weightLog: WeightLog = JSON.parse(fs.readFileSync(WEIGHT_LOG_PATH, 'utf-8'))
  const statsSnapshots: StatsSnapshot[] = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8'))

  let sleepAdded = 0, sleepUpdated = 0
  let weightAdded = 0, weightUpdated = 0
  let statsAdded = 0, statsUpdated = 0

  for (const file of files) {
    const day = parseHAEFile(path.join(HAE_DIR, file))

    if (day.sleep) {
      const result = upsertSleep(sleepLog.entries, day.sleep)
      if (result === 'added') { sleepAdded++; console.log(`  + sleep  ${day.isoDate}: ${day.sleep.sleep_hr}h, HRV ${day.sleep.hrv_ms ?? '—'}ms`) }
      else { sleepUpdated++; console.log(`  ~ sleep  ${day.isoDate}: updated`) }
    }

    if (day.weight_kg != null) {
      const result = upsertWeightEntry(weightLog, day)
      if (result === 'added') { weightAdded++; console.log(`  + weight ${day.isoDate}: ${day.weight_kg}kg, BF ${day.body_fat_pct ?? '—'}%`) }
      else if (result === 'updated') { weightUpdated++; console.log(`  ~ weight ${day.isoDate}: updated`) }
    }

    const statsResult = upsertStatsSnapshot(statsSnapshots, day)
    if (statsResult === 'added') { statsAdded++; console.log(`  + stats  ${day.isoDate}: VO2 ${day.vo2 ?? '—'}, BF ${day.body_fat_pct ?? '—'}%`) }
    else if (statsResult === 'updated') { statsUpdated++; console.log(`  ~ stats  ${day.isoDate}: updated`) }
  }

  console.log(
    `\nSummary: sleep ${sleepAdded}+/${sleepUpdated}~` +
    ` · weight ${weightAdded}+/${weightUpdated}~` +
    ` · stats ${statsAdded}+/${statsUpdated}~`,
  )

  if (DRY_RUN) {
    console.log('[dry-run] No files written.')
    return
  }

  sleepLog.entries.sort((a, b) => a.date.localeCompare(b.date))
  weightLog.entries.sort((a, b) => a.date.localeCompare(b.date))
  statsSnapshots.sort((a, b) => a.date.localeCompare(b.date))

  fs.writeFileSync(SLEEP_LOG_PATH, JSON.stringify(sleepLog, null, 2) + '\n')
  fs.writeFileSync(WEIGHT_LOG_PATH, JSON.stringify(weightLog, null, 2) + '\n')
  fs.writeFileSync(STATS_PATH, JSON.stringify(statsSnapshots, null, 2) + '\n')
  console.log('Written: sleep-log.json, body-weight-log.json, stats-snapshots.json')
}

main()
