export interface DailyTargets {
  calories_kcal: number;
  protein_g: number;
  carbs_g?: number;
  fat_g?: number;
  water_l?: number;
}

export interface Ingredient {
  item: string;
  amount: string;
  calories_kcal: number;
  protein_g: number;
  notes?: string;
}

export interface Meal {
  name: string;
  description?: string;
  calories_kcal: number;
  protein_g: number;
  ingredients?: Ingredient[];
  notes?: string;
}

export interface PrePostTraining {
  pre_60_90_min: string;
  during_over_60_min: string;
  post_within_30_min: string;
}

export interface FoodStack {
  daily_targets: DailyTargets;
  current_intake: Omit<DailyTargets, 'carbs_g' | 'fat_g' | 'water_l'>;
  meals: Meal[];
  daily_total_calories_kcal: number;
  daily_total_protein_g: number;
  training_nutrition: PrePostTraining;
}

export interface WeeklyNutritionSummary {
  week_of: string;          // ISO 8601 date of Monday
  avg_calories_kcal: number;
  avg_protein_g: number;
  notes?: string;
}
