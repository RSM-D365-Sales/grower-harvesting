import { useState } from 'react'
import { RefreshCw, ArrowRightLeft, AlertCircle, CheckCircle2, Clock, XCircle, Activity, Wifi, WifiOff, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import KpiCard from '../components/KpiCard'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/StatusMessages'
import { useD365SyncQueue, useRetryD365Sync } from '../hooks/useSupabase'
import { checkD365Health } from '../lib/d365Api'

export default function D365Integration() {
  const [statusFilter, setStatusFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [healthResult, setHealthResult] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

  async function runHealthCheck() {
    setHealthLoading(true)
    setHealthResult(null)
    try {
      const result = await checkD365Health()
      setHealthResult(result)
    } catch (err) {
      setHealthResult({ status: 'error', d365Connected: false, error: err.message })
    } finally {
      setHealthLoading(false)
    }
  }

  const { data: queue, isLoading, error, refetch } = useD365SyncQueue({
    ...(statusFilter && { status: statusFilter }),
    ...(entityFilter && { entity_type: entityFilter }),
  })
  const retrySync = useRetryD365Sync()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />

  // KPIs
  const pending = queue?.filter((q) => q.status === 'pending').length || 0
  const processing = queue?.filter((q) => q.status === 'processing').length || 0
  const synced = queue?.filter((q) => q.status === 'synced').length || 0
  const failed = queue?.filter((q) => q.status === 'failed').length || 0

  return (
    <div>
      <PageHeader
        title="D365 F&SC Integration"
        description="Monitor and manage data sync to Bluestem's Dynamics 365 Finance & Supply Chain environment (BFP-UAT)"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {/* Sync KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Pending" value={pending} icon={Clock} color="harvest" />
        <KpiCard title="Processing" value={processing} icon={ArrowRightLeft} color="d365" />
        <KpiCard title="Synced" value={synced} icon={CheckCircle2} color="primary" />
        <KpiCard title="Failed" value={failed} icon={XCircle} color="red" />
      </div>

      {/* D365 Connection Health Check */}
      <div className={`border rounded-xl p-5 mb-6 ${
        healthResult?.status === 'ok'
          ? 'bg-green-50 border-green-200'
          : healthResult?.status === 'error'
            ? 'bg-red-50 border-red-200'
            : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity className="w-4 h-4" /> D365 Connection Health
          </h3>
          <button
            onClick={runHealthCheck}
            disabled={healthLoading}
            className="flex items-center gap-2 px-4 py-2 bg-d365-600 text-white text-sm font-medium rounded-lg hover:bg-d365-700 transition-colors disabled:opacity-50"
          >
            {healthLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
            ) : (
              <><Wifi className="w-4 h-4" /> Test Connection</>
            )}
          </button>
        </div>

        {!healthResult && !healthLoading && (
          <p className="text-sm text-gray-500">
            Click <strong>Test Connection</strong> to verify your D365 credentials and connectivity.
            Secrets must be set in Supabase Dashboard → Edge Functions → Secrets.
          </p>
        )}

        {healthResult?.status === 'ok' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Connected to D365 successfully</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Tenant ID</p>
                <p className="text-xs font-mono text-gray-600 truncate">{healthResult.config?.tenantId}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Client ID</p>
                <p className="text-xs font-mono text-gray-600 truncate">{healthResult.config?.clientId}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Environment URL</p>
                <p className="text-xs font-mono text-gray-600 truncate">{healthResult.config?.environmentUrl}</p>
              </div>
            </div>
          </div>
        )}

        {healthResult?.status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-700">
              <WifiOff className="w-5 h-5" />
              <span className="text-sm font-medium">Connection failed</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-red-100 mt-2">
              <p className="text-xs text-red-600 font-mono whitespace-pre-wrap">{healthResult.error}</p>
            </div>
            {healthResult.config && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2">
                {['tenantId', 'clientId', 'environmentUrl', 'hasSecret'].map((k) => (
                  <div key={k} className="bg-white rounded-lg p-2 border border-red-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">{k}</p>
                    <p className={`text-xs font-mono mt-0.5 ${
                      String(healthResult.config[k]) === '(not set)' || healthResult.config[k] === false
                        ? 'text-red-500 font-semibold'
                        : 'text-gray-600'
                    }`}>
                      {String(healthResult.config[k])}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Integration Architecture Info */}
      <div className="bg-d365-50 border border-d365-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-d365-600 mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" /> D365 Integration Architecture
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Data flows from this dashboard to D365 Finance & Supply Chain via a staging queue. 
          Records are queued when yields are recorded or harvests complete, then pushed to D365 
          via OData / Data Entities.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded-lg p-3 border border-d365-100">
            <p className="font-semibold text-gray-700">Harvest Data</p>
            <p className="text-gray-500 mt-1">→ D365 Production Orders</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-d365-100">
            <p className="font-semibold text-gray-700">Yield Records</p>
            <p className="text-gray-500 mt-1">→ D365 Inventory Journals</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-d365-100">
            <p className="font-semibold text-gray-700">Product Data</p>
            <p className="text-gray-500 mt-1">→ D365 Released Products</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <span className="text-xs text-gray-400 self-center">Status:</span>
          {['', 'pending', 'processing', 'synced', 'failed'].map((s) => (
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
        <div className="flex gap-2">
          <span className="text-xs text-gray-400 self-center">Entity:</span>
          {['', 'harvest', 'yield', 'inventory'].map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                entityFilter === e ? 'bg-d365-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {e || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      {queue?.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No sync records"
          description="Records appear here when harvests or yields are recorded"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Entity Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Payload Preview</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Attempts</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Synced</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue?.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium capitalize">
                        {q.entity_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <pre className="text-xs text-gray-500 truncate">
                        {JSON.stringify(q.payload).slice(0, 80)}...
                      </pre>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{q.attempts}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {q.synced_at ? new Date(q.synced_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {q.status === 'failed' && (
                        <button
                          onClick={() => retrySync.mutate(q.id)}
                          disabled={retrySync.isPending}
                          className="px-3 py-1 text-xs bg-d365-50 text-d365-600 rounded-md hover:bg-d365-100 font-medium disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                      {q.last_error && (
                        <p className="text-[10px] text-red-400 mt-1 max-w-xs truncate" title={q.last_error}>
                          {q.last_error}
                        </p>
                      )}
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
