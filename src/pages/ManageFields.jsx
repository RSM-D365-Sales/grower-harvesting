import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, X, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import RoleGuard from '../components/RoleGuard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useAllFields, useCreateField, useUpdateField, useDeleteField } from '../hooks/useManagement'

const STATUSES = [
  { value: 'idle', label: 'Idle' },
  { value: 'field_prep', label: 'Bay Prep' },
  { value: 'planted', label: 'Planted' },
  { value: 'growing', label: 'Growing' },
  { value: 'harvest_ready', label: 'Harvest Ready' },
  { value: 'harvesting', label: 'Harvesting' },
  { value: 'complete', label: 'Complete' },
]

const STATUS_COLORS = {
  idle: 'bg-gray-100 text-gray-600',
  field_prep: 'bg-yellow-100 text-yellow-700',
  planted: 'bg-blue-100 text-blue-700',
  growing: 'bg-green-100 text-green-700',
  harvest_ready: 'bg-amber-100 text-amber-700',
  harvesting: 'bg-orange-100 text-orange-700',
  complete: 'bg-gray-100 text-gray-500',
}

export default function ManageFields() {
  return (
    <RoleGuard requiredRole="manager">
      <FieldsContent />
    </RoleGuard>
  )
}

function FieldsContent() {
  const { data: fields, isLoading, error, refetch } = useAllFields()
  const createField = useCreateField()
  const updateField = useUpdateField()
  const deleteField = useDeleteField()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', location: '', area_acres: '', soil_type: '', status: 'idle' })

  const resetForm = () => {
    setForm({ name: '', location: '', area_acres: '', soil_type: '', status: 'idle' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (f) => {
    setForm({
      name: f.name || '',
      location: f.location || '',
      area_acres: String(f.area_acres || ''),
      soil_type: f.soil_type || '',
      status: f.status || 'idle',
    })
    setEditingId(f.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      location: form.location || null,
      area_acres: form.area_acres ? parseFloat(form.area_acres) : null,
      soil_type: form.soil_type || null,
      status: form.status,
    }
    if (editingId) {
      await updateField.mutateAsync({ id: editingId, ...payload })
    } else {
      await createField.mutateAsync(payload)
    }
    resetForm()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this bay? Associated grow cycles will also be removed.')) {
      await deleteField.mutateAsync(id)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Growing Bays"
        description="Greenhouse bays, micro rooms, and the propagation house on the Holland campus"
        actions={
          !showForm && (
            <button onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Bay
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Edit Bay' : 'New Bay'}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bay Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="GH-1 Bay A — Living Lettuce" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="Greenhouse 1 · NFT channels west" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Area (sq ft)</label>
              <input type="number" step="1" value={form.area_acres} onChange={(e) => setForm({ ...form, area_acres: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="14400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Growing System</label>
              <input value={form.soil_type} onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="NFT Hydroponic" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={createField.isPending || updateField.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {fields?.length === 0 ? (
        <EmptyState icon={MapPin} title="No bays defined" description="Add your first greenhouse bay or grow room" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Bay / Room</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sq ft</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Growing System</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields?.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{f.name}</td>
                    <td className="px-5 py-3 text-gray-600">{f.location || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{f.area_acres ? Number(f.area_acres).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{f.soil_type || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUSES.find(s => s.value === f.status)?.label || f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => startEdit(f)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 ml-1" title="Delete">
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
