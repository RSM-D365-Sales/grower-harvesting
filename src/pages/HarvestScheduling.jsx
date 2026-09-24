import { useState } from 'react'
import { Plus, Users, Clock, CalendarDays } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import {
  useHarvestSchedules,
  useCreateHarvestSchedule,
  useUpdateHarvestSchedule,
  useGrowCycles,
  useTeamMembers,
} from '../hooks/useSupabase'

export default function HarvestScheduling() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)

  const { data: schedules, isLoading, error, refetch } = useHarvestSchedules(
    statusFilter ? { status: statusFilter } : {}
  )
  const { data: cycles } = useGrowCycles({ phase: 'harvest_ready' })
  const { data: teamMembers } = useTeamMembers()
  const createSchedule = useCreateHarvestSchedule()
  const updateSchedule = useUpdateHarvestSchedule()

  const [form, setForm] = useState({
    grow_cycle_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: '06:00',
    end_time: '14:00',
    notes: '',
    memberIds: [],
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    const { memberIds, ...schedule } = form
    await createSchedule.mutateAsync({ schedule, memberIds })
    setShowNew(false)
    setForm({
      grow_cycle_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '06:00',
      end_time: '14:00',
      notes: '',
      memberIds: [],
    })
  }

  const toggleMember = (id) => {
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((m) => m !== id)
        : [...prev.memberIds, id],
    }))
  }

  const handleStatusChange = async (id, newStatus) => {
    await updateSchedule.mutateAsync({ id, updates: { status: newStatus } })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Harvest Scheduling"
        description="Schedule picks on harvest-ready blocks and assign crews"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        }
      />

      {/* Status Filters */}
      <div className="flex gap-2 mb-6">
        {['', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* New Schedule Form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Schedule New Harvest</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Block · Crop (Harvest Ready)</label>
                <select
                  value={form.grow_cycle_id}
                  onChange={(e) => setForm({ ...form, grow_cycle_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select cycle...</option>
                  {cycles?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.field?.name} — {c.crop?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Team Members */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                <Users className="w-3.5 h-3.5 inline mr-1" />
                Assign Crew &amp; Team
              </label>
              <div className="flex flex-wrap gap-2">
                {teamMembers?.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => toggleMember(tm.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.memberIds.includes(tm.id)
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tm.full_name}
                    <span className="ml-1 text-[10px] text-gray-400">({tm.role.replace('_', ' ')})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createSchedule.isPending}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createSchedule.isPending ? 'Scheduling...' : 'Create Schedule'}
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List */}
      {schedules?.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No picks scheduled"
          description="Create a schedule to assign crews to harvest-ready blocks"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules?.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-800">
                    {s.grow_cycle?.field?.name || 'Block'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {s.grow_cycle?.crop?.name || 'Crop'}
                    {s.grow_cycle?.crop?.variety && ` · ${s.grow_cycle.crop.variety}`}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  {s.scheduled_date}
                </div>
                {s.start_time && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {s.start_time} – {s.end_time}
                  </div>
                )}
              </div>

              {/* Team Members */}
              {s.harvest_schedule_members?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">Crew</p>
                  <div className="flex flex-wrap gap-1">
                    {s.harvest_schedule_members.map((m) => (
                      <span key={m.id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                        {m.team_member?.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {s.notes && (
                <p className="text-xs text-gray-400 mt-3 italic">{s.notes}</p>
              )}

              {/* Status Actions */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                {s.status === 'scheduled' && (
                  <button
                    onClick={() => handleStatusChange(s.id, 'in_progress')}
                    className="px-3 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 font-medium"
                  >
                    Start Harvest
                  </button>
                )}
                {s.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(s.id, 'completed')}
                    className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium"
                  >
                    Mark Complete
                  </button>
                )}
                {(s.status === 'scheduled' || s.status === 'in_progress') && (
                  <button
                    onClick={() => handleStatusChange(s.id, 'cancelled')}
                    className="px-3 py-1 text-xs bg-gray-50 text-gray-500 rounded-md hover:bg-gray-100 font-medium"
                  >
                    Cancel
                  </button>
                )}
                {s.status === 'cancelled' && (
                  <button
                    onClick={() => handleStatusChange(s.id, 'scheduled')}
                    className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
