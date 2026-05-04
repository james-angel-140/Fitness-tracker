export type MesocyclePhaseType = 'accumulation' | 'intensification' | 'deload';

export interface MesocycleWeek {
  week: number;           // 1-indexed within the phase
  start_date: string;     // ISO 8601
  end_date: string;       // ISO 8601
  volume_modifier: number; // multiplier vs baseline, e.g. 1.0 / 1.1 / 0.6 for deload
  intensity_modifier: number; // relative load target, e.g. 1.0 / 1.05 / 0.85
  calorie_target: number; // kcal/day
  protein_target_g: number;
  notes?: string;
}

export interface MesocyclePhase {
  name: string;
  type: MesocyclePhaseType;
  start_date: string;
  end_date: string;
  weeks: MesocycleWeek[];
  focus: string;          // e.g. "Hypertrophy — volume accumulation"
  training_days_per_week: number;
  zone2_sessions_per_week: number;
}

export interface MesocycleSplit {
  day: string;            // "Mon" | "Tue" etc.
  focus: string;          // e.g. "Push — Chest / Front Delts / Triceps"
  muscle_groups: string[];
}

export interface Mesocycle {
  id: string;             // e.g. "mesocycle-2026-05"
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  phases: MesocyclePhase[];
  weekly_split: MesocycleSplit[];
  baseline_calories: number;   // TDEE estimate for this cycle
  baseline_protein_g: number;
  notes?: string;
}
