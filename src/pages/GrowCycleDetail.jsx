import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Sprout, BarChart3 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PhaseBadge from '../components/PhaseBadge'
import StatusBadge from '../components/StatusBadge'
import { LoadingSpinner, ErrorMessage } from '../components/StatusMessages'
import { useGrowCycle } from '../hooks/useSupabase'

const phaseSteps = ['field_prep', 'planting', 'growing', 'harvest_ready', 'harvesting', 'complete']

export default function GrowCycleDetail() {
  const { id } = useParams()
  const { data: cycle, isLoading, error } = useGrowCycle(id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} />
  if (!cycle) return <ErrorMessage message="Grow cycle not found" />

  const currentIdx = phaseSteps.indexOf(cycle.phase)

  return (
    <div>
      <PageHeader
        title={`${cycle.field?.name} — ${cycle.crop?.name}`}
        description={`Cycle started ${cycle.field_prep_date || 'N/A'}`}
        actions={
          <Link
            to="/grow-cycles"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        }
      />

      {/* Phase Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cycle Progress</h3>
        <div className="flex items-center gap-1">
          {phaseSteps.map((step, i) => (
            <div key={step} className="flex-1">
              <div
                className={`h-2 rounded-full ${
                  i <= currentIdx ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
              <p className={`text-[10px] mt-1 text-center font-medium ${
                i <= currentIdx ? 'text-primary-700' : 'text-gray-400'
              }`}>
                {step.replace('_', ' ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Bay / Room
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">Name</dt>
              <dd className="font-medium">{cycle.field?.name}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Location</dt>
              <dd className="font-medium">{cycle.field?.location || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Area</dt>
              <dd className="font-medium">{Number(cycle.field?.area_acres || 0).toLocaleString()} sq ft</dd>
            </div>
            <div>
              <dt className="text-gray-400">Growing System</dt>
              <dd className="font-medium">{cycle.field?.soil_type || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Crop Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Sprout className="w-4 h-4" /> Crop Details
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-400">Crop</dt>
              <dd className="font-medium">{cycle.crop?.name}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Variety</dt>
              <dd className="font-medium">{cycle.crop?.variety || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Avg Grow Days</dt>
              <dd className="font-medium">{cycle.crop?.avg_grow_days} days</dd>
            </div>
            <div>
              <dt className="text-gray-400">Lead Time</dt>
              <dd className="font-medium">
                {cycle.crop?.lead_time_hours}h
                {cycle.crop?.is_short_lead_time && (
                  <span className="ml-1 text-xs text-red-500 font-semibold">SHORT</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Target Yield / sq ft</dt>
              <dd className="font-medium">{cycle.crop?.target_yield_per_acre} {cycle.crop?.unit_of_measure}</dd>
            </div>
          </dl>
        </div>

        {/* Key Dates */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Key Dates
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Bay Prep</dt>
              <dd className="font-medium">{cycle.field_prep_date || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Planting</dt>
              <dd className="font-medium">{cycle.planting_date || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Expected Harvest</dt>
              <dd className="font-medium">{cycle.expected_harvest_date || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Actual Harvest</dt>
              <dd className="font-medium">{cycle.actual_harvest_date || '—'}</dd>
            </div>
          </dl>
          {cycle.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Notes</p>
              <p className="text-sm text-gray-600 mt-1">{cycle.notes}</p>
            </div>
          )}
        </div>

        {/* Yield Records */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Yield Records
          </h3>
          {cycle.yield_records?.length > 0 ? (
            <div className="space-y-2">
              {cycle.yield_records.map((yr) => (
                <div key={yr.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50">
                  <div>
                    <span className="font-medium">{yr.quantity} {yr.unit_of_measure}</span>
                    {yr.grade && <span className="ml-2 text-xs text-gray-500">Grade {yr.grade}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(yr.recorded_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No yield records for this cycle</p>
          )}
        </div>
      </div>

      {/* Harvest Schedules */}
      {cycle.harvest_schedules?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Harvest Schedules</h3>
          <div className="space-y-3">
            {cycle.harvest_schedules.map((hs) => (
              <div key={hs.id} className="p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium">{hs.scheduled_date}</span>
                    {hs.start_time && (
                      <span className="text-xs text-gray-400 ml-2">{hs.start_time} – {hs.end_time}</span>
                    )}
                  </div>
                  <StatusBadge status={hs.status} />
                </div>
                {hs.harvest_schedule_members?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hs.harvest_schedule_members.map((m) => (
                      <span key={m.id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                        {m.team_member?.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
