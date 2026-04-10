export interface SleepEntry {
  date: string          // ISO 8601 date the sleep *ended* (i.e. morning you woke up): "2026-04-10"
  duration_hr: number   // Total time in bed (hours, one decimal: 7.5)
  sleep_hr?: number     // Actual sleep (Apple Health "asleep" minutes converted to hours)
  deep_hr?: number      // Deep sleep hours (from Apple Watch)
  rem_hr?: number       // REM sleep hours (from Apple Watch)
  awake_hr?: number     // Time awake during the night (hours)
  sleep_score?: number  // Apple sleep score 0–100 (if available)
  hrv_ms?: number       // Overnight HRV (ms) — key recovery metric
  resting_hr?: number   // Overnight resting HR (bpm) — can differ from daytime RHR
  respiratory_rate?: number  // breaths per minute (Apple Watch)
  notes?: string
  source: 'health-auto-export' | 'apple-shortcut' | 'manual'
}

export interface SleepLog {
  entries: SleepEntry[]
}
