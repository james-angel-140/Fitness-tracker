export interface CategoryScores {
  cardio: number;       // out of 35
  strength: number;     // out of 30
  body_comp: number;    // out of 20
  consistency: number;  // out of 15
}

export interface CompositeScore {
  date: string;         // ISO 8601
  score: number;        // 0–100
  categories: CategoryScores;
  notes?: string;
}
