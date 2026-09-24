import { useState } from 'react'
import { Plus, Pencil, Trash2, Sprout, X, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useCrops, useCreateCrop, useUpdateCrop, useDeleteCrop } from '../hooks/useManagement'

export default function ManageCrops() {
  const { data: crops, isLoading, error, refetch } = useCrops()
  const createCrop = useCreateCrop()
  const updateCrop = useUpdateCrop()
  const deleteCrop = useDeleteCrop()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '', variety: '', avg_grow_days: '', lead_time_hours: '24',
    unit_of_measure: 'lbs', target_yield_per_acre: '',
  })

  const resetForm = () => {
    setForm({ name: '', variety: '', avg_grow_days: '', lead_time_hours: '24', unit_of_measure: 'lbs', target_yield_per_acre: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (crop) => {
    setForm({
      name: crop.name || '',
      variety: crop.variety || '',
      avg_grow_days: String(crop.avg_grow_days || ''),
      lead_time_hours: String(crop.lead_time_hours || '24'),
      unit_of_measure: crop.unit_of_measure || 'lbs',
      target_yield_per_acre: String(crop.target_yield_per_acre || ''),
    })
    setEditingId(crop.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      variety: form.variety || null,
      avg_grow_days: parseInt(form.avg_grow_days),
      lead_time_hours: parseInt(form.lead_time_hours),
      unit_of_measure: form.unit_of_measure,
      target_yield_per_acre: form.target_yield_per_acre ? parseFloat(form.target_yield_per_acre) : null,
    }

    if (editingId) {
      await updateCrop.mutateAsync({ id: editingId, ...payload })
    } else {
      await createCrop.mutateAsync(payload)
    }
    resetForm()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this crop? This cannot be undone.')) {
      await deleteCrop.mutateAsync(id)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Crops & Varieties"
        description="Bluestem Greens crops and varieties — days seed-to-cut, cut-to-cooler lead time, and target yield per sq ft"
        actions={
          !showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Crop
            </button>
          )
        }
      />

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Edit Crop' : 'New Crop'}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="e.g. Living Butter Lettuce" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Variety</label>
              <input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="e.g. Bibb / Boston" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Avg Grow Days *</label>
              <input required type="number" min="1" value={form.avg_grow_days} onChange={(e) => setForm({ ...form, avg_grow_days: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="21" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Lead Time (hours) *</label>
              <input required type="number" min="1" value={form.lead_time_hours} onChange={(e) => setForm({ ...form, lead_time_hours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="24" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit of Measure *</label>
              <select value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                <option value="lbs">lbs</option>
                <option value="heads">heads</option>
                <option value="bunches">bunches</option>
                <option value="each">each</option>
                <option value="cases">cases</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target Yield / sq ft</label>
              <input type="number" step="0.01" value={form.target_yield_per_acre} onChange={(e) => setForm({ ...form, target_yield_per_acre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="2.0" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={createCrop.isPending || updateCrop.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {crops?.length === 0 ? (
        <EmptyState icon={Sprout} title="No crops defined" description="Add your first crop to get started with grow cycles" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Variety</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Grow Days</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Lead Time</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Unit</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Target Yield / sq ft</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {crops?.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-5 py-3 text-gray-600">{c.variety || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{c.avg_grow_days}d</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.lead_time_hours <= 48 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.lead_time_hours}h
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.unit_of_measure}</td>
                    <td className="px-5 py-3 text-gray-600">{c.target_yield_per_acre ? `${c.target_yield_per_acre}` : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 ml-1" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
