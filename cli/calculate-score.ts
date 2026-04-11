/**
 * calculate-score.ts
 *
 * Reads the structured data files and computes the Composite Fitness Score.
 *
 * Usage:
 *   npm run score              # print breakdown
 *   npm run score -- --save   # print + append result to data/composite-scores.json
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  calculateCompositeScore,
  parsePace,
  scoreLabel,
  type ScoreInputs,
} from './score.js';

// ─── Types for the data files ─────────────────────────────────────────────────

interface FitbodScores {
  overall: number;
  push: number;
  pull: number;
  legs: number;
}

interface StatsSnapshot {
  date: string;
  weight_kg: number;
  body_fat_pct?: number;
  vo2_max?: number;
  resting_hr_bpm?: number;
  fitbod?: FitbodScores;
}

interface WeightEntry {
  date: string;
  weight_kg: number;
}

interface BodyWeightLog {
  entries: WeightEntry[];
}

interface LiftRecord {
  lift: string;
  current_best_kg: number | null;
  current_best_reps: number | string;
}

interface Workout {
  id: string;
  date: string;
  type: string;
  cardio_subtype?: string;
  avg_pace_per_km?: string;
}

interface CompositeScore {
  date: string;
  score: number;
  categories: {
    cardio: number;
    strength: number;
    body_comp: number;
    consistency: number;
  };
  notes?: string;
}

// ─── Load data ────────────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), 'data');

function load<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, relativePath), 'utf8')) as T;
}

const statsSnapshots = load<StatsSnapshot[]>('stats-snapshots.json');
const bodyWeightLog = load<BodyWeightLog>('body-weight-log.json');
const prs = load<LiftRecord[]>('personal-records.json');

const workoutFiles = readdirSync(join(DATA_DIR, 'workouts')).filter(f =>
  f.endsWith('.json'),
);
const workouts: Workout[] = workoutFiles.map(f =>
  load<Workout>(`workouts/${f}`),
);
workouts.sort((a, b) => a.date.localeCompare(b.date));

// ─── Derive inputs ────────────────────────────────────────────────────────────

// Latest stats snapshot
const latestStats = statsSnapshots.at(-1);
if (!latestStats) throw new Error('No stats snapshots found in stats-snapshots.json');

// Latest weight entry (body-weight-log is more granular than stats snapshots)
const latestWeight = bodyWeightLog.entries.at(-1);
if (!latestWeight) throw new Error('No weight entries found in body-weight-log.json');

// Most recent Zone 2 run — this is what the Zone 2 pace metric uses
const latestZone2Run = workouts
  .filter(w => w.cardio_subtype === 'zone2-run' && w.avg_pace_per_km)
  .at(-1);

// Consistency: count sessions in the 28 days ending today
const today = new Date();
const fourWeeksAgo = new Date(today);
fourWeeksAgo.setDate(today.getDate() - 28);

const recentWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo);
const totalSessions = recentWorkouts.length;
const cardioTypes = ['cardio', 'walk'];
const cardioSessionCount = recentWorkouts.filter(w =>
  cardioTypes.includes(w.type),
).length;

// PR lookups
function pr(lift: string): LiftRecord {
  const record = prs.find(p => p.lift === lift);
  if (!record) throw new Error(`No PR record found for "${lift}"`);
  return record;
}

const benchPR = pr('Barbell Bench Press');
const deadliftPR = pr('Deadlift');
const legPressPR = pr('Leg Press');
const pullupPR = pr('Pull-up');

// ─── Scan back for latest non-null metric ─────────────────────────────────────

function latestMetric<K extends keyof StatsSnapshot>(key: K): StatsSnapshot[K] | undefined {
  for (let i = statsSnapshots.length - 1; i >= 0; i--) {
    if (statsSnapshots[i][key] != null) return statsSnapshots[i][key];
  }
  return undefined;
}

// ─── Assemble inputs ──────────────────────────────────────────────────────────

const vo2_max = latestMetric('vo2_max');
const resting_hr_bpm = latestMetric('resting_hr_bpm');
const body_fat_pct = latestMetric('body_fat_pct');
const fitbod = latestMetric('fitbod');

if (!vo2_max) throw new Error('vo2_max not found in any stats snapshot');
if (!resting_hr_bpm) throw new Error('resting_hr_bpm not found in any stats snapshot');
if (!body_fat_pct) throw new Error('body_fat_pct not found in any stats snapshot');
if (!fitbod) throw new Error('fitbod scores not found in any stats snapshot');
if (!benchPR.current_best_kg) throw new Error('Bench press PR has no weight recorded');
if (!deadliftPR.current_best_kg) throw new Error('Deadlift PR has no weight recorded');
if (!legPressPR.current_best_kg) throw new Error('Leg press PR has no weight recorded');

const zone2PaceMinPerKm = latestZone2Run?.avg_pace_per_km
  ? parsePace(latestZone2Run.avg_pace_per_km)
  : 8.0; // fallback estimate used before first zone2 run is logged

const inputs: ScoreInputs = {
  cardio: {
    vo2_max,
    zone2_pace_min_per_km: zone2PaceMinPerKm,
    resting_hr_bpm,
  },
  strength: {
    fitbod_overall: fitbod.overall,
    bench_press_kg: benchPR.current_best_kg,
    deadlift_kg: deadliftPR.current_best_kg,
    leg_press_kg: legPressPR.current_best_kg,
    pullup_reps: Number(pullupPR.current_best_reps),
    body_weight_kg: latestWeight.weight_kg,
  },
  body_comp: {
    body_fat_pct,
    weight_kg: latestWeight.weight_kg,
  },
  consistency: {
    sessions_per_week_avg: Math.round((totalSessions / 4) * 100) / 100,
    total_sessions_last_4_weeks: totalSessions,
    cardio_sessions_per_week_avg: Math.round((cardioSessionCount / 4) * 100) / 100,
  },
};

// ─── Calculate ────────────────────────────────────────────────────────────────

const result = calculateCompositeScore(inputs);

// ─── Print breakdown ─────────────────────────────────────────────────────────

const bar = (score: number, max: number = 100): string => {
  const filled = Math.round((score / max) * 20);
  return `[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}]`;
};

const fmt = (n: number, pad = 5): string => String(n).padStart(pad);

const dateStr = today.toISOString().slice(0, 10);

console.log(`
╔══════════════════════════════════════════════════════╗
║         Composite Fitness Score — ${dateStr}       ║
╚══════════════════════════════════════════════════════╝

  ${result.score} / 100  ${bar(result.score)}  ${scoreLabel(result.score)}

  Data from: stats ${latestStats.date} · weight ${latestWeight.date}${latestZone2Run ? ` · zone2 ${latestZone2Run.date}` : ' · zone2 (estimated)'}

──────────────────────────────────────────────────────
  CARDIO  ${fmt(result.cardio.contribution, 4)} / 35   ${bar(result.cardio.contribution, 35)}
──────────────────────────────────────────────────────

  VO2 Max           ${inputs.cardio.vo2_max}          →  ${fmt(result.cardio.vo2_max_score)} / 100
  Zone 2 Pace       ${latestZone2Run?.avg_pace_per_km ?? '~8:00'}/km     →  ${fmt(result.cardio.zone2_pace_score)} / 100${!latestZone2Run ? '  ⚠ estimated' : ''}
  Resting HR        ${inputs.cardio.resting_hr_bpm} bpm        →  ${fmt(result.cardio.resting_hr_score)} / 100

──────────────────────────────────────────────────────
  STRENGTH  ${fmt(result.strength.contribution, 4)} / 40   ${bar(result.strength.contribution, 40)}
──────────────────────────────────────────────────────

  Fitbod Overall    ${inputs.strength.fitbod_overall}           →  ${fmt(result.strength.fitbod_overall_score)} / 100
  Bench Press       ${inputs.strength.bench_press_kg}kg / ${inputs.strength.body_weight_kg}kg = ${(inputs.strength.bench_press_kg / inputs.strength.body_weight_kg).toFixed(2)}×  →  ${fmt(result.strength.bench_press_score)} / 100
  Deadlift          ${inputs.strength.deadlift_kg}kg / ${inputs.strength.body_weight_kg}kg = ${(inputs.strength.deadlift_kg / inputs.strength.body_weight_kg).toFixed(2)}×  →  ${fmt(result.strength.deadlift_score)} / 100
  Leg Press         ${inputs.strength.leg_press_kg}kg / ${inputs.strength.body_weight_kg}kg = ${(inputs.strength.leg_press_kg / inputs.strength.body_weight_kg).toFixed(2)}×  →  ${fmt(result.strength.leg_press_score)} / 100
  Pull-ups          ${inputs.strength.pullup_reps} reps         →  ${fmt(result.strength.pullup_score)} / 100

──────────────────────────────────────────────────────
  BODY COMP  ${fmt(result.body_comp.contribution, 4)} / 25   ${bar(result.body_comp.contribution, 25)}
──────────────────────────────────────────────────────

  Body Fat          ${inputs.body_comp.body_fat_pct}%          →  ${fmt(result.body_comp.body_fat_score)} / 100
  Weight vs Goal    ${inputs.body_comp.weight_kg}kg / 75kg       →  ${fmt(result.body_comp.weight_vs_goal_score)} / 100

──────────────────────────────────────────────────────
  CONSISTENCY  ${fmt(result.consistency.score, 4)} / 100  (standalone)  ${bar(result.consistency.score)}
──────────────────────────────────────────────────────

  Sessions/week     ${inputs.consistency.sessions_per_week_avg.toFixed(1)}           →  ${fmt(result.consistency.sessions_per_week_score)} / 100
  Sessions (4wk)    ${inputs.consistency.total_sessions_last_4_weeks}             →  ${fmt(result.consistency.total_sessions_4wk_score)} / 100
  Cardio/week       ${inputs.consistency.cardio_sessions_per_week_avg.toFixed(1)}           →  ${fmt(result.consistency.cardio_sessions_score)} / 100

══════════════════════════════════════════════════════
`);

// ─── Save (--save flag) ───────────────────────────────────────────────────────

if (process.argv.includes('--save')) {
  const scoresPath = join(DATA_DIR, 'composite-scores.json');
  const scores: CompositeScore[] = load<CompositeScore[]>('composite-scores.json');

  const entry: CompositeScore = {
    date: dateStr,
    score: result.score,
    categories: {
      cardio: result.cardio.contribution,
      strength: result.strength.contribution,
      body_comp: result.body_comp.contribution,
      consistency: result.consistency.score,
    },
  };

  scores.push(entry);
  writeFileSync(scoresPath, JSON.stringify(scores, null, 2) + '\n');
  console.log(`  Saved to data/composite-scores.json\n`);
}
