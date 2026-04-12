import { createContext, useContext, useState } from 'react'

export type TimeRange = '2w' | '1m' | '3m' | 'all'

export const TIME_RANGE_DAYS: Record<TimeRange, number | null> = {
  '2w':  14,
  '1m':  30,
  '3m':  90,
  'all': null,
}

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '2w':  '2W',
  '1m':  '1M',
  '3m':  '3M',
  'all': 'All',
}

interface TimeRangeContextValue {
  range: TimeRange
  setRange: (r: TimeRange) => void
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  range: '1m',
  setRange: () => {},
})

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<TimeRange>('1m')
  return (
    <TimeRangeContext.Provider value={{ range, setRange }}>
      {children}
    </TimeRangeContext.Provider>
  )
}

export function useTimeRange() {
  return useContext(TimeRangeContext)
}

/** Filter an array of objects with a `date: string` field to the selected range.
 *  Uses the latest date in the dataset as "today" so the filter works correctly
 *  even when the data dates differ from the real system clock. */
export function filterByRange<T extends { date: string }>(items: T[], range: TimeRange): T[] {
  const days = TIME_RANGE_DAYS[range]
  if (days === null || items.length === 0) return items
  const latest = items.reduce((max, item) => (item.date > max ? item.date : max), items[0].date)
  const cutoff = new Date(latest)
  cutoff.setDate(cutoff.getDate() - days + 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return items.filter((item) => item.date >= cutoffStr)
}
