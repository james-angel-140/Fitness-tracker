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

export interface KmSplit {
  km: number;
  distance_km?: number; // for partial final split (e.g. 0.77km)
  pace_per_km: string;  // "8:23" (mm:ss)
  avg_hr: number;
  notes?: string;
}

export interface Workout {
  id: string;                    // e.g. "2026-04-08-zone2-run"
  date: string;                  // ISO 8601: "2026-04-08"
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
  cadence_spm?: number;
  total_volume_kg?: number;
  exercises?: Exercise[];
  splits?: KmSplit[];
  notes?: string;
  source?: 'manual' | 'fitbod' | 'apple-watch' | 'strava';
}
