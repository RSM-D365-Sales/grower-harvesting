import { Link } from 'react-router-dom'
import {
  Sprout,
  CalendarDays,
  BarChart3,
  ArrowRightLeft,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import KpiCard from '../components/KpiCard'
import PhaseBadge from '../components/PhaseBadge'
import StatusBadge from '../components/StatusBadge'
import { LoadingSpinner, ErrorMessage } from '../components/StatusMessages'
import { useDashboardKpis, useGrowCycles, useHarvestSchedules, useYieldRecords } from '../hooks/useSupabase'

// Brand chart order: Blue → Green → Amber → Midnight → Mid Grey (BRAND_GUIDE.md).
const PHASE_COLORS = {
  field_prep: '#888b8d',
  planting: '#3a4fa8',
  growing: '#009cde',
  harvest_ready: '#f2a900',
  harvesting: '#3f9c35',
  complete: '#00153d',
}

// A = Premium retail, B = Foodservice, C = Processing (GRP fresh-cut), reject = compost
const GRADE_COLORS = { A: '#3f9c35', B: '#009cde', C: '#f2a900', reject: '#d0342c' }

const formatByUnit = (byUnit = {}) =>
  Object.entries(byUnit)
    .sort(([, a], [, b]) => b - a)
    .map(([unit, qty]) => `${qty.toLocaleString()} ${unit}`)
    .join(' · ') || '0 lbs'

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKpis()
  const { data: cycles } = useGrowCycles()
  const { data: schedules } = useHarvestSchedules()
  const { data: yields } = useYieldRecords()

  if (kpisLoading) return <LoadingSpinner />
  if (kpisError) return <ErrorMessage message={kpisError.message} />

  // Build chart data
  const phaseCounts = {}
  cycles?.forEach((c) => {
    phaseCounts[c.phase] = (phaseCounts[c.phase] || 0) + 1
  })
  const phaseChartData = Object.entries(phaseCounts).map(([phase, count]) => ({
    phase: phase.replace('_', ' '),
    count,
    fill: PHASE_COLORS[phase] || '#888b8d',
  }))

  // Grade split on lbs only so heads and bunches don't get added to pounds
  const gradeCounts = {}
  yields?.filter((y) => (y.unit_of_measure || 'lbs') === 'lbs').forEach((y) => {
    const g = y.grade || 'Ungraded'
    gradeCounts[g] = (gradeCounts[g] || 0) + Number(y.quantity)
  })
  const gradeChartData = Object.entries(gradeCounts).map(([grade, qty]) => ({ name: grade, value: qty }))

  const upcomingSchedules = schedules
    ?.filter((s) => s.status === 'scheduled')
    .slice(0, 5) || []

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Bluestem Greens — greenhouse bays, the seed-to-cut pipeline, and D365 F&SC sync status"
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Active Bays"
          value={kpis.activeFields}
          subtitle="Greenhouse bays in cycle"
          icon={MapPin}
          color="primary"
        />
        <KpiCard
          title="Harvest Ready"
          value={kpis.harvestReady}
          subtitle="Awaiting a cut schedule"
          icon={Sprout}
          color="harvest"
        />
        <KpiCard
          title="Total Yield"
          value={formatByUnit(kpis.yieldByUnit)}
          subtitle="All recorded cuts"
          icon={TrendingUp}
          color="primary"
        />
        <KpiCard
          title="Scheduled Harvests"
          value={kpis.totalSchedules}
          subtitle="All time"
          icon={CalendarDays}
          color="primary"
        />
        <KpiCard
          title="Short Lead-Time Crops"
          value={kpis.shortLeadCropCount}
          subtitle="≤48hr cut-to-cooler"
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="Pending D365 Sync"
          value={kpis.pendingSync}
          subtitle="Awaiting push"
          icon={ArrowRightLeft}
          color="d365"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grow Cycle Phases */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Grow Cycles by Phase</h3>
          {phaseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={phaseChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="phase" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {phaseChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No grow cycles yet</p>
          )}
        </div>

        {/* Yield by Grade */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Yield by Grade (lbs)</h3>
          {gradeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={gradeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                >
                  {gradeChartData.map((entry, i) => (
                    <Cell key={i} fill={GRADE_COLORS[entry.name] || '#888b8d'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No yield records yet</p>
          )}
        </div>
      </div>

      {/* Upcoming Harvests & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Schedules */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming Cuts</h3>
            <Link to="/harvest-scheduling" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          {upcomingSchedules.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {upcomingSchedules.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {s.grow_cycle?.field?.name || 'Bay'} — {s.grow_cycle?.crop?.name || 'Crop'}
                      {s.grow_cycle?.crop?.variety && (
                        <span className="text-gray-400 font-normal"> · {s.grow_cycle.crop.variety}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.scheduled_date} {s.start_time && `at ${s.start_time}`}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm p-5 text-center">No upcoming cuts scheduled</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          {[
            { to: '/grow-cycles', label: 'Manage Grow Cycles', icon: Sprout, desc: 'Every bay from seeding to cut' },
            { to: '/harvest-scheduling', label: 'Schedule a Cut', icon: CalendarDays, desc: 'Assign crews & dates' },
            { to: '/yield-management', label: 'Record Yields', icon: BarChart3, desc: 'Log cut-by-cut production' },
            { to: '/d365', label: 'D365 Sync Status', icon: ArrowRightLeft, desc: 'View integration queue' },
          ].map(({ to, label, icon: Icon, desc }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all"
            >
              <Icon className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
