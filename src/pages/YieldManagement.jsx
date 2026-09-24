import { useState } from 'react'
import { Plus, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import KpiCard from '../components/KpiCard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import {
  useYieldRecords,
  useCreateYieldRecord,
  useGrowCycles,
  useCrops,
  useQueueD365Sync,
} from '../hooks/useSupabase'

// Produce grades: A = US Fancy, B = US #1, C = US #2 / processing, reject = cull
const GRADE_COLORS = { A: '#3f9c35', B: '#009cde', C: '#f2a900', reject: '#d0342c' }
const GRADE_LABELS = { A: 'A · US Fancy', B: 'B · US #1', C: 'C · US #2 / Processing', reject: 'Reject · Cull' }

export default function YieldManagement() {
  const [showNew, setShowNew] = useState(false)
  const { data: yields, isLoading, error, refetch } = useYieldRecords()
  const { data: cycles } = useGrowCycles()
  const { data: crops } = useCrops()
  const createYield = useCreateYieldRecord()
  const queueSync = useQueueD365Sync()

  const [form, setForm] = useState({
    grow_cycle_id: '',
    quantity: '',
    unit_of_measure: 'lbs',
    grade: 'A',
    notes: '',
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    const record = await createYield.mutateAsync({
      ...form,
      quantity: Number(form.quantity),
    })

    // Auto-queue to D365
    await queueSync.mutateAsync({
      entity_type: 'yield',
      entity_id: record.id,
      payload: {
        quantity: record.quantity,
        unit: record.unit_of_measure,
        grade: record.grade,
        grow_cycle_id: record.grow_cycle_id,
        recorded_at: record.recorded_at,
      },
    })

    setShowNew(false)
    setForm({ grow_cycle_id: '', quantity: '', unit_of_measure: 'lbs', grade: 'A', notes: '' })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  // KPIs
  const totalQty = yields?.reduce((s, y) => s + Number(y.quantity), 0) || 0
  const gradeA = yields?.filter((y) => y.grade === 'A').reduce((s, y) => s + Number(y.quantity), 0) || 0
  const gradeAPercent = totalQty > 0 ? Math.round((gradeA / totalQty) * 100) : 0

  // Short lead-time crop yields
  const shortLeadCropIds = new Set(crops?.filter((c) => c.is_short_lead_time).map((c) => c.id) || [])
  const shortLeadYields = yields?.filter(
    (y) => y.grow_cycle?.crop && shortLeadCropIds.has(y.grow_cycle.crop.id)
  ) || []
  const shortLeadTotal = shortLeadYields.reduce((s, y) => s + Number(y.quantity), 0)

  // Chart: yield by crop
  const yieldByCrop = {}
  yields?.forEach((y) => {
    const cropName = y.grow_cycle?.crop?.name || 'Unknown'
    yieldByCrop[cropName] = (yieldByCrop[cropName] || 0) + Number(y.quantity)
  })
  const chartData = Object.entries(yieldByCrop)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <div>
      <PageHeader
        title="Yield Management"
        description="Record pick-by-pick yields — every record is queued to D365 F&SC automatically"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Yield
          </button>
        }
      />

      {/* Yield KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Yield" value={`${totalQty.toLocaleString()} lbs`} icon={TrendingUp} color="primary" />
        <KpiCard title="Grade A %" value={`${gradeAPercent}%`} subtitle={`${gradeA.toLocaleString()} lbs`} icon={TrendingUp} color="primary" />
        <KpiCard title="Short Lead-Time Yield" value={`${shortLeadTotal.toLocaleString()} lbs`} subtitle="≤48hr lead time crops" icon={AlertTriangle} color="red" />
        <KpiCard title="Total Records" value={yields?.length || 0} icon={TrendingUp} color="gray" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Yield by Crop</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#009cde" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* New Yield Form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Record New Yield</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grow Cycle</label>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 2400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select
                value={form.unit_of_measure}
                onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
                <option value="bunches">bunches</option>
                <option value="crates">crates</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grade</label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(GRADE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={createYield.isPending}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createYield.isPending ? 'Saving...' : 'Save'}
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

      {/* Yield Records Table */}
      {yields?.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No yield records"
          description="Start recording yields from your harvests"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Block / Crop</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Quantity</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Grade</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Lead Time</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Recorded</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {yields?.map((y) => {
                  const crop = y.grow_cycle?.crop
                  const isShortLead = crop && shortLeadCropIds.has(crop.id)
                  return (
                    <tr key={y.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{y.grow_cycle?.field?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{crop?.name || '—'} — {crop?.variety || ''}</p>
                      </td>
                      <td className="px-5 py-3 font-medium">{Number(y.quantity).toLocaleString()} {y.unit_of_measure}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: GRADE_COLORS[y.grade] || '#888b8d' }}
                          title={GRADE_LABELS[y.grade] || y.grade}
                        >
                          {y.grade === 'reject' ? 'R' : y.grade}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {isShortLead ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="w-3 h-3" /> {crop.lead_time_hours}h
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{crop?.lead_time_hours || '—'}h</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {new Date(y.recorded_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{y.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
