export type WorkoutType = 'strength' | 'cardio' | 'hybrid' | 'walk';

export type CardioSubtype =
  | 'run'
  | 'zone2-run'
  | 'hiit'
  | 'stationary-bike'
  | 'walk'
  | 'other';

export interface ExerciseSet {
  reps: number;
  weight_kg: number | null; // null = bodyweight
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

export type SplitType = 'warmup' | 'cooldown' | 'interval' | 'rest' | 'work' | 'steady';

export interface KmSplit {
  km?: number;
  type?: SplitType;
  distance_km?: number; // for partial final split (e.g. 0.77km)
  pace_per_km?: string;  // "8:23" (mm:ss)
  avg_hr?: number;
  cadence_spm?: number;
  notes?: string;
}

// Apple Watch heart rate zones
// Zone 1: <132 bpm  Zone 2: 133–146 bpm  Zone 3: 147–160 bpm  Zone 4: 161–174 bpm  Zone 5: 175+ bpm
export interface HRZones {
  zone1_min?: number;  // time in Zone 1 (<132 bpm), in seconds
  zone2_min?: number;  // time in Zone 2 (133–146 bpm), in seconds
  zone3_min?: number;  // time in Zone 3 (147–160 bpm), in seconds
  zone4_min?: number;  // time in Zone 4 (161–174 bpm), in seconds
  zone5_min?: number;  // time in Zone 5 (175+ bpm), in seconds
}

export interface Workout {
  id: string;                    // e.g. "2026-04-08-zone2-run"
  date: string;                  // ISO 8601: "2026-04-08"
  title?: string;                // human-readable name, e.g. "Hyrox Simulation Run"
  type: WorkoutType;
  cardio_subtype?: CardioSubtype;
  duration_min: number;
  approximate?: boolean;         // true when duration/distance is estimated
  distance_km?: number;
  avg_pace_per_km?: string;      // "8:23" (mm:ss)
  avg_hr?: number;
  max_hr?: number;
  calories_active?: number;
  calories_total?: number;
  calories?: number;             // when only one calorie figure is recorded
  avg_cadence_spm?: number;
  cadence_spm?: number;
  total_volume_kg?: number;
  hr_zones?: HRZones;
  exercises?: Exercise[];
  splits?: KmSplit[];
  notes?: string;
  source?: 'manual' | 'fitbod' | 'apple-watch' | 'strava';
  rpe?: number;    // Rate of Perceived Exertion: 1–10
  trimp?: number;  // Training Impulse: duration_min × rpe (derived, can be stored or computed)
}
