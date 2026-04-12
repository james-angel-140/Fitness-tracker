import { ScoreCard } from '@/components/ScoreCard'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { ScoreBreakdownChart, WeightChart, BodyFatChart, Vo2Chart, RhrChart, TrainingLoadChart } from '@/components/TrendCharts'
import { WorkoutHistory } from '@/components/WorkoutHistory'
import { PRTable } from '@/components/PRTable'
import { HyroxCountdown } from '@/components/HyroxCountdown'
import { StatTiles } from '@/components/StatTiles'
import { SleepCard } from '@/components/SleepCard'
import { UpcomingSessions } from '@/components/UpcomingSessions'
import { ConsistencyGauge } from '@/components/ConsistencyGauge'
import { TimeRangeProvider, useTimeRange, TIME_RANGE_LABELS, type TimeRange } from '@/lib/TimeRangeContext'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">
      {children}
    </p>
  )
}

function TimeRangeSelector() {
  const { range, setRange } = useTimeRange()
  return (
    <div className="flex gap-1 rounded-md border border-border p-0.5 bg-muted/30">
      {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            range === r
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {TIME_RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  )
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">Fitness Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">James Angel · Hyrox 2026 Training</p>
          </div>
          <TimeRangeSelector />
        </div>

        {/* Key numbers at a glance */}
        <StatTiles />

        {/* ── WHERE DO I STAND? ─────────────────────────────── */}
        <SectionLabel>Where do I stand?</SectionLabel>

        {/* Score + consistency + event countdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
          <ScoreCard />
          <ConsistencyGauge />
          <HyroxCountdown />
        </div>

        {/* Score history + category breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <ScoreBreakdownChart />
          </div>
          <CategoryBreakdown />
        </div>

        {/* ── HOW IS MY BODY DOING? ─────────────────────────── */}
        <SectionLabel>How is my body doing?</SectionLabel>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <WeightChart />
          <BodyFatChart />
          <Vo2Chart />
          <RhrChart />
          <SleepCard />
        </div>

        {/* ── WHAT AM I TRAINING & HOW HARD? ───────────────── */}
        <SectionLabel>What am I training and how hard?</SectionLabel>

        <TrainingLoadChart />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <UpcomingSessions />
          <WorkoutHistory />
        </div>

        {/* ── HOW STRONG AM I? ──────────────────────────────── */}
        <SectionLabel>How strong am I?</SectionLabel>

        <PRTable />

      </div>
    </div>
  )
}

export default function App() {
  return (
    <TimeRangeProvider>
      <Dashboard />
    </TimeRangeProvider>
  )
}
