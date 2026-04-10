export interface EventResult {
  finish_time?: string;
  placement?: string;
  notes?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;          // ISO 8601
  location?: string;
  category?: string;
  goal: string;
  registered: boolean;
  training_focus?: string;
  taper_plan?: string;
  gear_needed?: string[];
  prep_notes?: string;
  result?: EventResult;
}
