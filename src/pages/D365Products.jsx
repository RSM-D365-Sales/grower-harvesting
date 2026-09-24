import { useState } from 'react'
import { Download, Search, Package, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useD365Products, useExtractD365Products } from '../hooks/useD365'

export default function D365Products() {
  const [search, setSearch] = useState('')
  const { data: products, isLoading, error, refetch } = useD365Products(search ? { search } : {})
  const extract = useExtractD365Products()

  const handleExtract = async () => {
    try {
      await extract.mutateAsync({ top: 500, buyerGroup: '3080' })
      refetch()
    } catch (e) {
      // error is available via extract.error
      console.error('Extract failed:', e)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="D365 Products"
        description="Released products extracted from D365 Finance & Supply Chain"
        actions={
          <button
            onClick={handleExtract}
            disabled={extract.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-d365-600 text-white text-sm font-medium rounded-lg hover:bg-d365-700 transition-colors disabled:opacity-50"
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
          Successfully extracted {extract.data.count} products ({extract.data.upserted} upserted)
        </div>
      )}

      {extract.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <strong>Extraction failed:</strong> {extract.error?.message}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-d365-500 focus:border-d365-500"
        />
      </div>

      {products?.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products cached"
          description="Click 'Extract from D365' to pull released products from Finance & Supply Chain"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Item Number</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Product Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Item Group</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Inventory Unit</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sales Price</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Shelf Life</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tracking</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products?.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-d365-600">{p.d365_item_number}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{p.product_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.product_type || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.item_group || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.inventory_unit || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.sales_price ? `$${p.sales_price}` : '—'}</td>
                    <td className="px-5 py-3">
                      {p.shelf_life_days ? (
                        <span className={`text-xs font-medium ${p.shelf_life_days <= 7 ? 'text-red-500' : 'text-gray-600'}`}>
                          {p.shelf_life_days}d
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{p.tracking_dimension_group || 'None'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString() : '—'}
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
