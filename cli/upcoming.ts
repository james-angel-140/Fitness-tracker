/**
 * upcoming.ts
 *
 * Prints the next 3 days of planned sessions from the active program.
 *
 * Usage:
 *   npm run upcoming
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(__dirname, '../data')
const TODAY = new Date('2026-04-11')
const DAYS_AHEAD = 3

const programs: any[] = readdirSync(join(DATA_DIR, 'programs'))
  .map(f => JSON.parse(readFileSync(join(DATA_DIR, 'programs', f), 'utf-8')))

const hr = '─'.repeat(60)
const lines: string[] = []

lines.push(hr)
lines.push(`  UPCOMING SESSIONS  —  ${TODAY.toDateString()}`)
lines.push(hr)

if (programs.length === 0) {
  lines.push('\n  No active program found in data/programs/\n')
  console.log(lines.join('\n'))
  process.exit(0)
}

const prog = programs[0]
lines.push(`\n  Program: ${prog.name}`)
lines.push(`  Event: Hyrox — April 29, 2026\n`)

// Collect all days across all phases into a flat list
const allDays: any[] = prog.phases.flatMap((phase: any) =>
  (phase.days ?? []).map((d: any) => ({ ...d, phase: phase.name }))
)

// Find the next 3 days from today (inclusive of today if not yet done)
const upcoming = allDays
  .filter((d: any) => new Date(d.date) >= TODAY)
  .slice(0, DAYS_AHEAD)

if (upcoming.length === 0) {
  lines.push('  No upcoming sessions found — program may have ended.\n')
} else {
  for (const day of upcoming) {
    const date = new Date(day.date)
    const isToday = day.date === TODAY.toISOString().slice(0, 10)
    const isTomorrow = date.getTime() - TODAY.getTime() === 86_400_000

    const label = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : day.day_of_week
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

    lines.push(`  ${label.padEnd(10)}  ${dateStr}`)
    lines.push(`  ${''.padEnd(10)}  ${day.focus}`)
    lines.push(`  ${''.padEnd(10)}  ${day.session}`)
    if (day.phase) lines.push(`  ${''.padEnd(10)}  [${day.phase}]`)
    lines.push('')
  }
}

lines.push(hr + '\n')
console.log(lines.join('\n'))
