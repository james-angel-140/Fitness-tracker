export interface FitbodScores {
  overall: number;
  push: number;
  pull: number;
  legs: number;
}

export interface StatsSnapshot {
  date: string;           // ISO 8601: "2026-04-05"
  weight_kg: number;
  body_fat_pct?: number;
  vo2_max?: number;
  resting_hr_bpm?: number;
  pace_5k?: string;       // "mm:ss" per km, null if unknown
  pace_10k?: string;
  fitbod?: FitbodScores;
  notes?: string;
}
