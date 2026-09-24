import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Filter, Eye } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PhaseBadge from '../components/PhaseBadge'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useGrowCycles, useCreateGrowCycle, useUpdateGrowCyclePhase, useFields, useCrops } from '../hooks/useSupabase'

const PHASES = ['field_prep', 'planting', 'growing', 'harvest_ready', 'harvesting', 'complete']
const NEXT_PHASE = {
  field_prep: 'planting',
  planting: 'growing',
  growing: 'harvest_ready',
  harvest_ready: 'harvesting',
  harvesting: 'complete',
}

export default function GrowCycles() {
  const [filterPhase, setFilterPhase] = useState('')
  const [showNew, setShowNew] = useState(false)

  const { data: cycles, isLoading, error, refetch } = useGrowCycles(filterPhase ? { phase: filterPhase } : {})
  const { data: fields } = useFields()
  const { data: crops } = useCrops()
  const createCycle = useCreateGrowCycle()
  const updatePhase = useUpdateGrowCyclePhase()

  const [form, setForm] = useState({
    field_id: '',
    crop_id: '',
    field_prep_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    await createCycle.mutateAsync({
      ...form,
      phase: 'field_prep',
    })
    setShowNew(false)
    setForm({ field_id: '', crop_id: '', field_prep_date: new Date().toISOString().split('T')[0], notes: '' })
  }

  const handleAdvance = async (id, currentPhase) => {
    const next = NEXT_PHASE[currentPhase]
    if (!next) return

    const extraFields = {}
    if (next === 'planting') extraFields.planting_date = new Date().toISOString().split('T')[0]
    if (next === 'harvesting') extraFields.actual_harvest_date = new Date().toISOString().split('T')[0]

    await updatePhase.mutateAsync({ id, phase: next, extraFields })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Grow Cycles"
        description="Track every greenhouse bay from seeding through the final cut"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Cycle
          </button>
        }
      />

      {/* Phase Pipeline */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setFilterPhase('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            !filterPhase ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Phases
        </button>
        {PHASES.map((p) => (
          <button
            key={p}
            onClick={() => setFilterPhase(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterPhase === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* New Cycle Form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Start New Grow Cycle</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bay / Room</label>
              <select
                value={form.field_id}
                onChange={(e) => setForm({ ...form, field_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select bay...</option>
                {fields?.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({Number(f.area_acres).toLocaleString()} sq ft)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Crop</label>
              <select
                value={form.crop_id}
                onChange={(e) => setForm({ ...form, crop_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select crop...</option>
                {crops?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.variety} ({c.avg_grow_days}d)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bay Prep Date</label>
              <input
                type="date"
                value={form.field_prep_date}
                onChange={(e) => setForm({ ...form, field_prep_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={createCycle.isPending}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createCycle.isPending ? 'Creating...' : 'Create'}
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

      {/* Cycles Table */}
      {cycles?.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No grow cycles found"
          description={filterPhase ? `No cycles in "${filterPhase.replace('_', ' ')}" phase` : 'Start by creating your first grow cycle'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Bay / Room</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Crop</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Phase</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Prep Date</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Plant Date</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Expected Harvest</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cycles?.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{c.field?.name}</p>
                      <p className="text-xs text-gray-400">{Number(c.field?.area_acres || 0).toLocaleString()} sq ft · {c.field?.location}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-700">{c.crop?.name}</p>
                      <p className="text-xs text-gray-400">{c.crop?.variety}</p>
                    </td>
                    <td className="px-5 py-3"><PhaseBadge phase={c.phase} /></td>
                    <td className="px-5 py-3 text-gray-600">{c.field_prep_date || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{c.planting_date || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{c.expected_harvest_date || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/grow-cycles/${c.id}`}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {NEXT_PHASE[c.phase] && (
                          <button
                            onClick={() => handleAdvance(c.id, c.phase)}
                            disabled={updatePhase.isPending}
                            className="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 font-medium disabled:opacity-50"
                          >
                            → {NEXT_PHASE[c.phase].replace('_', ' ')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
