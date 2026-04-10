export interface ProgramDay {
  day_of_week: string;  // "Mon", "Tue", etc.
  date: string;         // ISO 8601
  focus: string;
  session: string;
}

export interface ProgramPhase {
  name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  focus: string;
  days: ProgramDay[];
}

export interface HyroxStation {
  station: string;
  rx_distance_or_volume: string;
  notes: string;
}

export interface Program {
  id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  days_per_week: number;
  rest_days_per_week: number;
  taper_start_date?: string;
  phases: ProgramPhase[];
  station_reference?: HyroxStation[];
  notes?: string;
}
