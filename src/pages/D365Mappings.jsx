import { useState } from 'react'
import { ArrowRightLeft, Link2, Save, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useCrops, useFields } from '../hooks/useSupabase'
import { useD365Products, useD365Warehouses, useD365EntityMappings, useUpsertD365Mapping, useD365SyncLog } from '../hooks/useD365'

export default function D365Mappings() {
  const [tab, setTab] = useState('crops') // 'crops' | 'fields' | 'log'

  const { data: crops } = useCrops()
  const { data: fields } = useFields()
  const { data: d365Products } = useD365Products()
  const { data: d365Warehouses } = useD365Warehouses()
  const { data: cropMappings } = useD365EntityMappings('crop')
  const { data: fieldMappings } = useD365EntityMappings('field')
  const { data: syncLog, isLoading: logLoading } = useD365SyncLog()
  const upsertMapping = useUpsertD365Mapping()

  // Build lookup of existing mappings
  const cropMappingMap = {}
  cropMappings?.forEach((m) => {
    cropMappingMap[m.local_entity_id] = m.d365_entity_ref
  })
  const fieldMappingMap = {}
  fieldMappings?.forEach((m) => {
    fieldMappingMap[m.local_entity_id] = m.d365_entity_ref
  })

  const handleCropMapping = async (cropId, d365ItemNumber) => {
    if (!d365ItemNumber) return
    await upsertMapping.mutateAsync({
      local_entity_type: 'crop',
      local_entity_id: cropId,
      d365_entity_type: 'product',
      d365_entity_ref: d365ItemNumber,
    })
  }

  const handleFieldMapping = async (fieldId, d365WarehouseId) => {
    if (!d365WarehouseId) return
    await upsertMapping.mutateAsync({
      local_entity_type: 'field',
      local_entity_id: fieldId,
      d365_entity_type: 'warehouse',
      d365_entity_ref: d365WarehouseId,
    })
  }

  return (
    <div>
      <PageHeader
        title="D365 Entity Mappings & Sync Log"
        description="Map crops to D365 released products and greenhouse bays to warehouses (HOL-GH / HOL-DC / GRP), and view extraction history"
      />

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {[
          { key: 'crops', label: 'Crop → Product' },
          { key: 'fields', label: 'Bay → Warehouse' },
          { key: 'log', label: 'Sync History' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Crop → D365 Product Mapping */}
      {tab === 'crops' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Map Crops to D365 Released Products
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Link each local crop to its corresponding item number in D365 F&SCM.
            This mapping is used when pushing yield records and harvest data.
          </p>

          {!crops?.length ? (
            <p className="text-sm text-gray-400">No crops defined</p>
          ) : (
            <div className="space-y-3">
              {crops.map((crop) => (
                <div key={crop.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{crop.name}</p>
                    <p className="text-xs text-gray-400">{crop.variety} • {crop.avg_grow_days}d grow • {crop.lead_time_hours}h lead</p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div className="w-64">
                    <select
                      value={cropMappingMap[crop.id] || ''}
                      onChange={(e) => handleCropMapping(crop.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-d365-500"
                    >
                      <option value="">— Select D365 product —</option>
                      {d365Products?.map((p) => (
                        <option key={p.d365_item_number} value={p.d365_item_number}>
                          {p.d365_item_number} — {p.product_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {cropMappingMap[crop.id] && (
                    <span className="text-xs text-green-600 font-medium flex-shrink-0">Mapped</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Field → D365 Warehouse Mapping */}
      {tab === 'fields' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Map Growing Bays to D365 Warehouses
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Link each bay or room to the D365 warehouse/site its cuts are packed into (Holland greenhouse pack room,
            Holland DC, Grand Rapids fresh-cut) for inventory and production order context.
          </p>

          {!fields?.length ? (
            <p className="text-sm text-gray-400">No bays defined</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{field.name}</p>
                    <p className="text-xs text-gray-400">{field.location} • {Number(field.area_acres || 0).toLocaleString()} sq ft • {field.soil_type}</p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div className="w-64">
                    <select
                      value={fieldMappingMap[field.id] || ''}
                      onChange={(e) => handleFieldMapping(field.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-d365-500"
                    >
                      <option value="">— Select D365 warehouse —</option>
                      {d365Warehouses?.map((w) => (
                        <option key={w.d365_warehouse_id} value={w.d365_warehouse_id}>
                          {w.d365_warehouse_id} — {w.warehouse_name} ({w.site_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  {fieldMappingMap[field.id] && (
                    <span className="text-xs text-green-600 font-medium flex-shrink-0">Mapped</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sync History Log */}
      {tab === 'log' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">D365 Sync History</h3>
            <p className="text-xs text-gray-400">Record of all inbound/outbound sync operations</p>
          </div>
          {logLoading ? (
            <LoadingSpinner />
          ) : syncLog?.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No sync operations recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Entity</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Direction</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Fetched</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Upserted</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Started</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Duration</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {syncLog?.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-700 capitalize">{log.entity_name}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.direction === 'inbound'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {log.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{log.records_fetched}</td>
                      <td className="px-5 py-3 text-gray-600">{log.records_upserted}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                          log.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-red-400 max-w-xs truncate" title={log.error_message}>
                        {log.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
