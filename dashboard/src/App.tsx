import { ScoreCard } from '@/components/ScoreCard'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { TrendCharts } from '@/components/TrendCharts'
import { WorkoutHistory } from '@/components/WorkoutHistory'
import { PRTable } from '@/components/PRTable'
import { HyroxCountdown } from '@/components/HyroxCountdown'
import { StatTiles } from '@/components/StatTiles'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold">Fitness Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">James Angel · Hyrox 2026 Training</p>
        </div>

        {/* Stat tiles */}
        <StatTiles />

        {/* Score + Hyrox — equal height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          <ScoreCard />
          <HyroxCountdown />
        </div>

        {/* Main 3-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <CategoryBreakdown />
          <WorkoutHistory />
          <div className="space-y-4">
            <TrendCharts />
            <PRTable />
          </div>
        </div>

      </div>
    </div>
  )
}
