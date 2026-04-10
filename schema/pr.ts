export interface PREntry {
  date: string;             // ISO 8601
  weight_kg: number;
  reps: number | string;    // string for ranges like "5-6" or sets like "5×5"
  estimated_1rm_kg?: number;
  notes?: string;
}

export interface LiftRecord {
  lift: string;
  current_best_kg: number;
  current_best_reps: number | string;
  current_best_date: string;
  notes?: string;
  history: PREntry[];
}

export type PersonalRecords = LiftRecord[];
