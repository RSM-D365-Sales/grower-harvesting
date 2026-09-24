import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, X, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import RoleGuard from '../components/RoleGuard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useAllTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember } from '../hooks/useManagement'

const ROLES = [
  { value: 'field_manager', label: 'Field Manager' },
  { value: 'harvester', label: 'Harvester' },
  { value: 'planner', label: 'Planner' },
  { value: 'driver', label: 'Driver' },
  { value: 'quality_inspector', label: 'Quality Inspector' },
]

export default function ManageTeam() {
  return (
    <RoleGuard requiredRole="manager">
      <TeamContent />
    </RoleGuard>
  )
}

function TeamContent() {
  const { data: members, isLoading, error, refetch } = useAllTeamMembers()
  const createMember = useCreateTeamMember()
  const updateMember = useUpdateTeamMember()
  const deleteMember = useDeleteTeamMember()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ full_name: '', role: 'harvester', email: '', phone: '', is_active: true })

  const resetForm = () => {
    setForm({ full_name: '', role: 'harvester', email: '', phone: '', is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (m) => {
    setForm({
      full_name: m.full_name || '',
      role: m.role || 'harvester',
      email: m.email || '',
      phone: m.phone || '',
      is_active: m.is_active !== false,
    })
    setEditingId(m.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      full_name: form.full_name,
      role: form.role,
      email: form.email || null,
      phone: form.phone || null,
      is_active: form.is_active,
    }
    if (editingId) {
      await updateMember.mutateAsync({ id: editingId, ...payload })
    } else {
      await createMember.mutateAsync(payload)
    }
    resetForm()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this team member?')) {
      await deleteMember.mutateAsync(id)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Crews & Team Members"
        description="Bluestem field staff and harvest crews assigned to picks"
        actions={
          !showForm && (
            <button onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Member
            </button>
          )
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Edit Member' : 'New Team Member'}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="Sam Fischer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role *</label>
              <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="sam.fischer@bluestemfresh.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="(616) 555-0140" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                Active
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={createMember.isPending || updateMember.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {members?.length === 0 ? (
        <EmptyState icon={Users} title="No team members" description="Add team members to assign them to harvest schedules" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members?.map((m) => (
                  <tr key={m.id} className={`hover:bg-gray-50/50 ${!m.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{m.full_name}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        {ROLES.find(r => r.value === m.role)?.label || m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{m.email || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{m.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => startEdit(m)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 ml-1" title="Delete">
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
