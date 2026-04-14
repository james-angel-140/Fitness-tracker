export type InjurySeverity = 'mild' | 'moderate' | 'severe';
export type InjuryStatus = 'active' | 'rehab' | 'resolved';

export interface Injury {
  id: string;                     // e.g. "right-shoulder-rotator-cuff-2026-04"
  body_part: string;              // e.g. "right shoulder"
  injury_type: string;            // e.g. "rotator cuff tear"
  severity: InjurySeverity;
  status: InjuryStatus;
  date_onset: string;             // ISO 8601: "2026-04-14"
  date_resolved?: string;         // ISO 8601, omit if still active
  affected_movements: string[];   // movements to avoid or modify
  rehab_exercises?: string[];     // prescribed rehab work
  notes?: string;
}
