import { useState } from 'react'
import { ScoreCard } from '@/components/ScoreCard'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { ScoreBreakdownChart, WeightChart, BodyFatChart, Vo2Chart, RhrChart, TrainingLoadChart, Zone2PaceChart } from '@/components/TrendCharts'
import { WorkoutHistory } from '@/components/WorkoutHistory'
import { PRTable } from '@/components/PRTable'
import { HyroxCountdown } from '@/components/HyroxCountdown'
import { StatTiles } from '@/components/StatTiles'
import { SleepCard } from '@/components/SleepCard'
import { ReadinessCard } from '@/components/ReadinessCard'
import { UpcomingSessions } from '@/components/UpcomingSessions'
import { ConsistencyGauge } from '@/components/ConsistencyGauge'
import { ComplianceWidget } from '@/components/ComplianceWidget'
import { NutritionLog } from '@/components/NutritionLog'
import { MuscleVolumeCard } from '@/components/MuscleVolumeCard'
import { NutritionHistory } from '@/components/NutritionHistory'
import { InjuryCard } from '@/components/InjuryCard'
import { WeightPredictionCard } from '@/components/WeightPredictionCard'
import { TimeRangeProvider, useTimeRange, TIME_RANGE_LABELS, type TimeRange } from '@/lib/TimeRangeContext'

const TABS = ['Overview', 'Training', 'Body', 'Strength', 'Nutrition'] as const
type Tab = typeof TABS[number]

function TimeRangeSelector() {
  const { range, setRange } = useTimeRange()
  return (
    <div className="flex gap-1 rounded-md border border-border p-0.5 bg-muted/30">
      {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded transition-colors ${
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

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-none max-w-full">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 min-h-[44px] ${
            active === tab
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <ScoreCard />
        <ConsistencyGauge />
        <HyroxCountdown />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <ScoreBreakdownChart />
        </div>
        <CategoryBreakdown />
      </div>
    </div>
  )
}

function TrainingTab() {
  return (
    <div className="space-y-4">
      <TrainingLoadChart />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        <UpcomingSessions />
        <WorkoutHistory />
        <ComplianceWidget />
      </div>
    </div>
  )
}

function BodyTab() {
  return (
    <div className="space-y-4">
      <InjuryCard />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WeightChart />
        <BodyFatChart />
        <Vo2Chart />
        <RhrChart />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SleepCard />
        <ReadinessCard />
      </div>
      <WeightPredictionCard />
      <Zone2PaceChart />
    </div>
  )
}

function StrengthTab() {
  return (
    <div className="space-y-4">
      <PRTable />
      <MuscleVolumeCard />
    </div>
  )
}

function NutritionTab() {
  return (
    <div className="space-y-4">
      <NutritionLog />
      <NutritionHistory />
    </div>
  )
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8 space-y-4">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">Fitness Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">James Angel · Hyrox 2026 Training</p>
          </div>
          <TimeRangeSelector />
        </div>

        {/* Persistent stat tiles */}
        <StatTiles />

        {/* Tab navigation */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div className="pt-2">
          {activeTab === 'Overview'   && <OverviewTab />}
          {activeTab === 'Training'   && <TrainingTab />}
          {activeTab === 'Body'       && <BodyTab />}
          {activeTab === 'Strength'   && <StrengthTab />}
          {activeTab === 'Nutrition'  && <NutritionTab />}
        </div>

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
