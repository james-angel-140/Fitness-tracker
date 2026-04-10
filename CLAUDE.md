# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run score              # Print composite fitness score breakdown
npm run score -- --save    # Print breakdown and append result to data/composite-scores.json
npm run typecheck          # Type-check CLI + schema TypeScript (no emit)
npm run dashboard          # Start dashboard dev server (Vite, hot reload)
npm run dashboard:build    # Production build of dashboard → dashboard/dist/
```

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

Workout files follow `schema/workout.ts`. Stats snapshots are an append-only time-series array.

## Logging a Workout from a Screenshot

When a screenshot of a workout is shared in the chat:

1. **Extract all visible data** — date, duration, distance, pace, HR (avg + max), calories (active and/or total), cadence, splits, exercises/sets/weights, source app.
2. **Determine workout type** from context:
   - `type`: `strength` | `cardio` | `hybrid` | `walk`
   - `cardio_subtype` (if cardio/hybrid): `run` | `zone2-run` | `hiit` | `stationary-bike` | `walk` | `other`
   - Classify as `zone2-run` only if HR was clearly in Zone 2 (120–130 bpm avg); otherwise use `run`.
3. **Build the JSON** matching `schema/workout.ts` exactly:
   - `id`: `"YYYY-MM-DD-slug"` where slug describes the session (e.g. `upper-body`, `zone2-run`, `legs`)
   - `date`: ISO 8601 `"YYYY-MM-DD"`
   - `duration_min`: integer minutes
   - Omit optional fields (`distance_km`, `avg_pace_per_km`, `splits`, `exercises`, etc.) if not present in the screenshot — do not guess or fabricate
   - Set `approximate: true` if any key metric (duration, distance) looks estimated
   - `source`: `"strava"` | `"fitbod"` | `"apple-watch"` | `"manual"` — infer from the app UI in the screenshot
   - Weights in kg — if screenshot shows lbs, convert (`× 0.4536`) and note the conversion
   - Pace as `"mm:ss"` string (e.g. `"8:23"`)
   - `calories_active` + `calories_total` if both shown; `calories` if only one figure
4. **Ask before writing** if any required field is ambiguous or missing:
   - Always required: `date`, `type`, `duration_min`
   - Ask if unclear: workout type classification, exercise names (if abbreviated), whether weights are kg or lbs
   - Do not ask about optional fields that simply aren't present
5. **Write the file** to `data/workouts/YYYY-MM-DD-slug.json` once confirmed.
6. **Check for PR updates** — if the session contains a strength exercise, compare against `data/personal-records.json`. If any set beats the current best, flag it and ask whether to update the PR file.

## AI Agent Role

This repo is used as a personal fitness coaching tool. When acting as a coach:

- Read `fitness-tracker.md` for full context: current stats, active program, event schedule, goals
- Current primary goal: **Hyrox April 29, 2026** — maintain strength (Fitbod ≥58), improve Zone 2 pace at 120–130 bpm, body recomp to 75kg/14% BF
- Active program: Hyrox Peak & Taper (Apr 5–28) with phases in `data/programs/`
- Recommendations should be data-backed and account for recent training load, recovery, and event proximity
- When logging data: preserve existing formats, append in reverse-chronological order, never delete historical entries
