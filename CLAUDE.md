# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

Always work on `main`. Never create a separate branch. All commits and pushes go directly to `main`.

## Commands

```bash
npm run context            # Print 7-day context snapshot for AI recommendations
npm run upcoming           # Print next 3 planned sessions from the active program
npm run score              # Print composite fitness score breakdown
npm run score -- --save    # Print breakdown and append result to data/composite-scores.json
npm run import:health      # Import sleep + VO2 from Health Auto Export JSON files
npm run typecheck          # Type-check CLI + schema TypeScript (no emit)
npm run dashboard          # Start dashboard dev server (Vite, hot reload)
npm run dashboard:build    # Production build of dashboard → dashboard/dist/
```

Health Auto Export syncs daily JSON files to iCloud. Run `npm run import:health` to pull sleep, HRV, resting HR, and VO2 max into the data files. Safe to run repeatedly — it upserts by date.

No build step for CLI — `tsx` runs TypeScript directly. No test or lint tooling configured.

## Structure

```
cli/          # TypeScript CLI scripts (calculate-score.ts, score.ts)
dashboard/    # Vite + React + Tailwind dashboard
  src/
    components/   # ScoreCard, CategoryBreakdown, TrendCharts, WorkoutHistory, PRTable, HyroxCountdown
    components/ui/ # shadcn/ui primitives (Card, Badge)
    lib/
      data.ts    # Loads all JSON files, derives score inputs, exports typed data
      score.ts   # Score calculation logic (copy of cli/score.ts for browser use)
      utils.ts   # cn() Tailwind merge helper
schema/       # Shared TypeScript interfaces
data/         # All JSON data files (source of truth)
```

Dashboard reads `data/` via Vite aliases (`@data/*` → `../data/*`). Workout files are loaded with `import.meta.glob`. The score calculation in `dashboard/src/lib/score.ts` is a copy of `cli/score.ts` — keep them in sync if score logic changes.

## Architecture

A personal fitness analytics tool: structured JSON data logs + TypeScript scripts to calculate a composite fitness score.

**Data flow:**
```
data/*.json + data/workouts/*.json
    → src/calculate-score.ts (loads data, derives metrics)
    → src/score.ts (normalized 0–100 category scores)
    → console output + optional data/composite-scores.json append
```

**Score categories** (in `src/score.ts`):
- Cardio 35% — VO2 max, Zone 2 pace, resting HR
- Strength 30% — Fitbod overall, lift-to-bodyweight ratios, pull-ups
- Body Comp 20% — Body fat %, weight vs 75kg goal
- Consistency 15% — Sessions/week, cardio frequency (4-week window)

Each metric is normalized to 0–100 with floor/ceiling bounds; "lower is better" metrics (pace, HR, BF%) are inverted.

**Score scale:** 0–30 Beginner → 50–65 Solid → 75–85 High Performance → 85–100 Elite

## Data Files

All data lives in `data/` as JSON. Schemas are in `schema/`.

| What to update | File |
|---|---|
| New workout | `data/workouts/YYYY-MM-DD-slug.json` |
| Weight, VO2, RHR, Fitbod, pace | `data/stats-snapshots.json` |
| Daily weigh-in | `data/body-weight-log.json` |
| Personal records | `data/personal-records.json` |
| Nutrition | `data/nutrition/` |
| Fitness score | `npm run score -- --save` |
| Sleep / recovery | `data/sleep-log.json` → `entries` array |

Workout files follow `schema/workout.ts`. Stats snapshots are an append-only time-series array. Sleep entries follow `schema/sleep.ts`.

## Logging a Workout from a Screenshot

When a screenshot of a workout is shared in the chat:

1. **Extract all visible data** — date, duration, distance, pace, HR (avg + max), calories (active and/or total), cadence, splits, exercises/sets/weights, source app.
2. **Determine workout type** from context:
   - `type`: `strength` | `cardio` | `hybrid` | `walk`
   - `cardio_subtype` (if cardio/hybrid): `run` | `zone2-run` | `hiit` | `stationary-bike` | `walk` | `other`
   - Classify as `zone2-run` only if HR was clearly in Zone 2 per Apple Watch zones (133–146 bpm avg); otherwise use `run`.
3. **Build the JSON** matching `schema/workout.ts` exactly:
   - `id`: `"YYYY-MM-DD-slug"` where slug describes the session (e.g. `upper-body`, `zone2-run`, `legs`)
   - `date`: ISO 8601 `"YYYY-MM-DD"`
   - `title`: human-readable session name (e.g. `"Hyrox Simulation Run"`, `"Upper Body Push"`) — always include
   - `duration_min`: integer minutes
   - For structured sessions (intervals, circuits), populate `splits` with `type` (`warmup` | `interval` | `rest` | `work` | `steady` | `cooldown`), `distance_km`, `pace_per_km`, `avg_hr` per segment
   - Omit optional fields (`distance_km`, `avg_pace_per_km`, `exercises`, etc.) if not present in the screenshot — do not guess or fabricate
   - Set `approximate: true` if any key metric (duration, distance) looks estimated
   - `source`: `"strava"` | `"fitbod"` | `"apple-watch"` | `"manual"` — infer from the app UI in the screenshot
   - Weights in kg — if screenshot shows lbs, convert (`× 0.4536`) and note the conversion
   - Pace as `"mm:ss"` string (e.g. `"8:23"`)
   - `calories_active` + `calories_total` if both shown; `calories` if only one figure
   - `rpe`: always ask the user "RPE for this session? (1–10)" after logging a workout — this powers the training load chart. If they don't know, omit it (the dashboard will estimate).
4. **Ask before writing** if any required field is ambiguous or missing:
   - Always required: `date`, `type`, `duration_min`
   - Ask if unclear: workout type classification, exercise names (if abbreviated), whether weights are kg or lbs
   - Do not ask about optional fields that simply aren't present
5. **Write the file** to `data/workouts/YYYY-MM-DD-slug.json` once confirmed.
6. **Check for PR updates** — if the session contains a strength exercise, compare against `data/personal-records.json`. If any set beats the current best, flag it and ask whether to update the PR file.

## Logging Sleep from a Screenshot

When a screenshot of Apple Health or Sleep app data is shared:

1. **Extract**: date (the morning woken up), time in bed, time asleep, deep sleep, REM, awake time, sleep score, HRV, overnight HR, respiratory rate — take whatever is visible.
2. **Build the JSON** matching `schema/sleep.ts`:
   - `date`: ISO 8601 date of the *morning* (e.g. woke up April 10 → `"2026-04-10"`)
   - `duration_hr`: total time in bed as decimal hours (e.g. 7h 30m → `7.5`)
   - `sleep_hr`: actual sleep time (exclude awake periods) — prefer this over `duration_hr` for quality tracking
   - `source`: `"manual"` for screenshots; `"health-auto-export"` or `"apple-shortcut"` for automated imports
   - Omit any fields not visible — do not guess
3. **Append** to the `entries` array in `data/sleep-log.json` (newest last).
4. **Flag** if HRV is significantly lower than recent average (>15% drop) — this is a recovery warning.

## Proactive Data Reminders

**At the start of every coaching conversation**, check the last entry date of each key data file and proactively flag anything stale. Use today's date from `# currentDate` in context.

| Data | File | Stale if not updated in |
|---|---|---|
| Workouts | `data/workouts/` (newest file date) | 3 days |
| Body weight | `data/body-weight-log.json` | 5 days |
| Sleep | `data/sleep-log.json` | 2 days |
| Stats (VO2, RHR, Fitbod) | `data/stats-snapshots.json` | 14 days |
| Nutrition summary | `data/nutrition/weekly-summaries.json` | 7 days |
| Composite score | `data/composite-scores.json` | 7 days |

Example reminder format: "⚠️ Sleep hasn't been logged in 4 days — share a Health screenshot or I can walk you through the Apple Shortcut setup."

Also proactively suggest the next planned session from the active program if the user hasn't logged it yet.

## AI Agent Role

This repo is used as a personal fitness coaching tool. When acting as a coach:

**IMPORTANT: Before making any recommendation for today's training or a short-term plan (next 1–3 days), always run `npm run context` first.** This prints a 7-day snapshot of sleep, recovery, training load, and current stats. Use this output as the primary basis for your recommendations — do not guess or rely on memory from earlier in the conversation.

- Read `fitness-tracker.md` for full context: current stats, active program, event schedule, goals
- Current primary goal: **Hyrox April 29, 2026** — maintain strength (Fitbod ≥58), improve Zone 2 pace at 120–130 bpm, body recomp to 75kg/14% BF
- Active program: Hyrox Peak & Taper (Apr 5–28) with phases in `data/programs/`
- Recommendations should be data-backed and account for recent training load, recovery, and event proximity
- When logging data: preserve existing formats, append in reverse-chronological order, never delete historical entries
