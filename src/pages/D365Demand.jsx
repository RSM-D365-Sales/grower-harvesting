import { useState } from 'react'
import { Download, RefreshCw, Search, ShoppingCart, Truck, Calendar } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import KpiCard from '../components/KpiCard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useD365SalesOrders, useD365Inventory, useExtractD365SalesOrders, useExtractD365Inventory } from '../hooks/useD365'

export default function D365Demand() {
  const [tab, setTab] = useState('orders')  // 'orders' | 'inventory'
  const [itemSearch, setItemSearch] = useState('')

  const { data: orders, isLoading: ordersLoading } = useD365SalesOrders(
    itemSearch ? { item_number: itemSearch } : {}
  )
  const { data: inventory, isLoading: invLoading } = useD365Inventory(
    itemSearch ? { item_number: itemSearch } : {}
  )
  const extractOrders = useExtractD365SalesOrders()
  const extractInventory = useExtractD365Inventory()

  const isLoading = tab === 'orders' ? ordersLoading : invLoading

  // KPIs
  const totalOpenOrders = orders?.filter(o => o.order_status !== 'Cancelled' && o.order_status !== 'Invoiced').length || 0
  const totalDemandQty = orders?.reduce((sum, o) => sum + Number(o.remaining_quantity || 0), 0) || 0
  const totalOnHand = inventory?.reduce((sum, r) => sum + Number(r.total_available || 0), 0) || 0
  const urgentOrders = orders?.filter(o => {
    if (!o.requested_ship_date) return false
    const diff = (new Date(o.requested_ship_date) - new Date()) / (1000 * 60 * 60)
    return diff <= 48 && diff > 0
  }).length || 0

  return (
    <div>
      <PageHeader
        title="D365 Demand & Inventory"
        description="Sales orders demand signal and on-hand inventory from D365 F&SCM"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => extractOrders.mutateAsync({ top: 200 })}
              disabled={extractOrders.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-d365-600 text-white text-sm rounded-lg hover:bg-d365-700 disabled:opacity-50"
            >
              {extractOrders.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Pull Orders
            </button>
            <button
              onClick={() => extractInventory.mutateAsync({})}
              disabled={extractInventory.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {extractInventory.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Pull Inventory
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Open Sales Orders" value={totalOpenOrders} icon={ShoppingCart} color="d365" />
        <KpiCard title="Total Demand (Remaining)" value={`${totalDemandQty.toLocaleString()}`} icon={Truck} color="harvest" />
        <KpiCard title="Total On-Hand" value={`${totalOnHand.toLocaleString()}`} icon={Package} color="primary" />
        <KpiCard title="Urgent (≤48hr ship)" value={urgentOrders} icon={Calendar} color="red" />
      </div>

      {/* Success feedback */}
      {extractOrders.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Extracted {extractOrders.data.count} sales order lines ({extractOrders.data.upserted} upserted)
        </div>
      )}
      {extractInventory.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Extracted {extractInventory.data.count} inventory records ({extractInventory.data.upserted} upserted)
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'orders' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sales Orders
        </button>
        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'inventory' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          On-Hand Inventory
        </button>
      </div>

      {/* Item Filter */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by item number..."
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-d365-500"
        />
      </div>

      {isLoading && <LoadingSpinner />}

      {/* Sales Orders Tab */}
      {tab === 'orders' && !ordersLoading && (
        <>
          {orders?.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No sales orders cached"
              description="Click 'Pull Orders' to extract demand data from D365"
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">SO #</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Line</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Customer</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Item</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Ordered</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Remaining</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Ship Date</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Warehouse</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders?.map((o) => {
                      const isUrgent = o.requested_ship_date &&
                        (new Date(o.requested_ship_date) - new Date()) / (1000 * 60 * 60) <= 48
                      return (
                        <tr key={o.id} className={`hover:bg-gray-50/50 ${isUrgent ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-3 font-mono text-xs font-medium text-d365-600">
                            {o.d365_sales_order_number}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{o.line_number}</td>
                          <td className="px-5 py-3 text-gray-700">{o.customer_name || o.customer_account}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800">{o.item_name || o.item_number}</p>
                            <p className="text-xs text-gray-400">{o.item_number}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{o.ordered_quantity} {o.unit}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{o.remaining_quantity} {o.unit}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs ${isUrgent ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              {o.requested_ship_date || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">{o.warehouse_id || '—'}</td>
                          <td className="px-5 py-3"><StatusBadge status={o.order_status?.toLowerCase() || 'open'} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && !invLoading && (
        <>
          {inventory?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No inventory data cached"
              description="Click 'Pull Inventory' to extract on-hand data from D365"
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Item Number</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Warehouse</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Site</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Physical Avail.</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Ordered Avail.</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Total Available</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Unit</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Batch</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Last Synced</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inventory?.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-d365-600">{r.item_number}</td>
                        <td className="px-5 py-3 text-gray-600">{r.warehouse_id || '—'}</td>
                        <td className="px-5 py-3 text-gray-600">{r.site_id || '—'}</td>
                        <td className="px-5 py-3 text-gray-700">{r.available_physical}</td>
                        <td className="px-5 py-3 text-gray-700">{r.available_ordered}</td>
                        <td className="px-5 py-3 font-medium text-gray-800">{r.total_available}</td>
                        <td className="px-5 py-3 text-gray-600">{r.unit || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{r.batch_number || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Need this import for the icon used inline
function Package(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>
    </svg>
  )
}
