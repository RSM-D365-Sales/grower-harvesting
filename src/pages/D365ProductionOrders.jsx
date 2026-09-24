import { useState } from 'react'
import { Download, RefreshCw, Factory, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import KpiCard from '../components/KpiCard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useD365ProductionOrders, useExtractD365ProductionOrders } from '../hooks/useD365'

const PROD_STATUSES = ['', 'Created', 'Estimated', 'Scheduled', 'Released', 'Started', 'ReportedFinished', 'Ended']

export default function D365ProductionOrders() {
  const [statusFilter, setStatusFilter] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  const filters = {}
  if (statusFilter) filters.status = statusFilter
  if (itemSearch) filters.item_number = itemSearch

  const { data: orders, isLoading, error, refetch } = useD365ProductionOrders(filters)
  const extract = useExtractD365ProductionOrders()

  const handleExtract = async () => {
    await extract.mutateAsync({ top: 200 })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  // KPIs
  const totalOrders = orders?.length || 0
  const activeOrders = orders?.filter(o => ['Released', 'Started'].includes(o.status)).length || 0
  const totalOrderedQty = orders?.reduce((sum, o) => sum + Number(o.order_quantity || 0), 0) || 0
  const totalRemainingQty = orders?.reduce((sum, o) => sum + Number(o.remaining_quantity || 0), 0) || 0

  return (
    <div>
      <PageHeader
        title="D365 Production Orders"
        description="Production orders extracted from D365 Finance & Supply Chain"
        actions={
          <button
            onClick={handleExtract}
            disabled={extract.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-d365-600 text-white text-sm font-medium rounded-lg hover:bg-d365-700 disabled:opacity-50"
          >
            {extract.isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Extracting...</>
            ) : (
              <><Download className="w-4 h-4" /> Extract from D365</>
            )}
          </button>
        }
      />

      {extract.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Extracted {extract.data.count} production orders ({extract.data.upserted} upserted)
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Orders" value={totalOrders} icon={Factory} color="d365" />
        <KpiCard title="Active (Released/Started)" value={activeOrders} icon={Factory} color="primary" />
        <KpiCard title="Total Ordered Qty" value={totalOrderedQty.toLocaleString()} color="harvest" />
        <KpiCard title="Remaining Qty" value={totalRemainingQty.toLocaleString()} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-400 self-center">Status:</span>
          {PROD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-d365-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Item number..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-d365-500"
          />
        </div>
      </div>

      {/* Table */}
      {orders?.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No production orders cached"
          description="Click 'Extract from D365' to pull production orders from F&SCM"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Prod Order ID</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Item</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Ordered Qty</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Remaining</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Unit</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sched. Start</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sched. End</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Warehouse</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders?.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-d365-600">{o.d365_prod_order_id}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{o.item_name || o.item_number}</p>
                      <p className="text-xs text-gray-400">{o.item_number}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={o.status?.toLowerCase() || 'created'} /></td>
                    <td className="px-5 py-3 text-gray-700">{o.order_quantity}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{o.remaining_quantity}</td>
                    <td className="px-5 py-3 text-gray-600">{o.unit || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{o.scheduled_start_date || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{o.scheduled_end_date || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{o.warehouse_id || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {o.last_synced_at ? new Date(o.last_synced_at).toLocaleString() : '—'}
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
