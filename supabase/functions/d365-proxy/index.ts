// deno-lint-ignore-file no-explicit-any
/// <reference path="./deno.d.ts" />

/**
 * Supabase Edge Function: d365-proxy
 *
 * Proxies requests from the browser to D365 F&SCM OData endpoints.
 * Handles OAuth 2.0 client-credentials token acquisition against Azure AD.
 *
 * ─────────────────────────────────────────────────────────────────
 * ENVIRONMENT VARIABLES (set in Supabase Dashboard → Edge Functions → Secrets):
 *
 *   D365_TENANT_ID       — Your Azure AD tenant ID
 *                           (Azure Portal → Azure AD → Overview → Tenant ID)
 *                           Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *
 *   D365_CLIENT_ID       — App registration Client (Application) ID
 *                           (Azure Portal → App Registrations → your app → Application ID)
 *                           Example: "12345678-abcd-efgh-ijkl-9876543210ab"
 *
 *   D365_CLIENT_SECRET   — App registration client secret value
 *                           (Azure Portal → App Registrations → Certificates & secrets)
 *                           Example: "xYz~AbCdEfGhIjKlMnOpQrStUvWx.12345"
 *
 *   D365_ENVIRONMENT_URL — Your D365 F&SCM environment base URL (no trailing slash)
 *                           Example: "https://yourorg.operations.dynamics.com"
 *                           Or sandbox: "https://yourorg-sandbox.operations.dynamics.com"
 *
 *   D365_LEGAL_ENTITY    — The D365 legal entity / company code (dataAreaId)
 *                           Default: "USMF" if not set
 *                           Example: "USMF", "DAT", "USRT"
 *
 *   SUPABASE_URL              — Auto-provided by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Auto-provided by Supabase
 *
 * ─────────────────────────────────────────────────────────────────
 * SETUP STEPS:
 *
 *   1. Register an app in Azure AD
 *      Azure Portal → Azure Active Directory → App Registrations → New Registration
 *      - Name: "Bluestem Grower Harvesting D365 Integration"
 *      - Supported account types: Single tenant
 *      - No redirect URI needed
 *
 *   2. Create a client secret
 *      App Registration → Certificates & secrets → New client secret
 *      - Copy the "Value" (NOT the Secret ID) — this is D365_CLIENT_SECRET
 *
 *   3. Grant API permissions
 *      App Registration → API permissions → Add a permission → Dynamics ERP
 *      - Add: Odata.ReadWrite.All  (or CustomService.ReadWrite.All)
 *      - Click "Grant admin consent"
 *
 *   4. Register the app in D365 F&SCM
 *      D365 → System administration → Setup → Azure Active Directory applications
 *      - Add a row with the Client ID from step 1
 *      - Assign a User ID that has the correct security roles
 *
 *   5. Set secrets in Supabase
 *      supabase secrets set \
 *        D365_TENANT_ID=<from step 1> \
 *        D365_CLIENT_ID=<from step 1> \
 *        D365_CLIENT_SECRET=<from step 2> \
 *        D365_ENVIRONMENT_URL=<your D365 URL>
 *
 *      Or via Dashboard: Edge Functions → Secrets
 *
 *   6. Deploy this function
 *      supabase functions deploy d365-proxy --no-verify-jwt
 *
 * ─────────────────────────────────────────────────────────────────
 * D365 OData REFERENCE:
 *   Base URL:  {D365_ENVIRONMENT_URL}/data/{EntityName}
 *   Auth:      POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
 *              grant_type=client_credentials
 *              scope={D365_ENVIRONMENT_URL}/.default
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// ─── Types ─────────────────────────────────────────────────

interface ODataParams {
  $top?: number | string
  $filter?: string
  $select?: string
  $orderby?: string
  [key: string]: any
}

interface ExtractResult {
  count: number
  upserted: number
}

interface D365Config {
  tenantId: string
  clientId: string
  clientSecret: string
  environmentUrl: string
  legalEntity: string
}

// ─── Environment Validation ────────────────────────────────

function getD365Config(): D365Config {
  const tenantId = Deno.env.get('D365_TENANT_ID') ?? ''
  const clientId = Deno.env.get('D365_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('D365_CLIENT_SECRET') ?? ''
  const environmentUrl = Deno.env.get('D365_ENVIRONMENT_URL') ?? ''
  const legalEntity = Deno.env.get('D365_LEGAL_ENTITY') || 'USMF'

  const missing: string[] = []
  if (!tenantId) missing.push('D365_TENANT_ID')
  if (!clientId) missing.push('D365_CLIENT_ID')
  if (!clientSecret) missing.push('D365_CLIENT_SECRET')
  if (!environmentUrl) missing.push('D365_ENVIRONMENT_URL')

  if (missing.length > 0) {
    throw new Error(
      `Missing required D365 environment variables: ${missing.join(', ')}. ` +
      `Set them in Supabase Dashboard → Edge Functions → Secrets. ` +
      `See the SETUP STEPS in this file's header comments for instructions.`
    )
  }

  return { tenantId, clientId, clientSecret, environmentUrl, legalEntity }
}

// ─── Token Cache ───────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiry = 0

async function getD365Token(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken
  }

  const { tenantId, clientId, clientSecret, environmentUrl } = getD365Config()

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: `${environmentUrl}/.default`,
  })

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(
      `Azure AD token error (HTTP ${resp.status}): ${errText}. ` +
      `Verify D365_TENANT_ID, D365_CLIENT_ID, and D365_CLIENT_SECRET are correct. ` +
      `Ensure the app registration has the Dynamics ERP API permission granted.`
    )
  }

  const data: any = await resp.json()
  cachedToken = data.access_token as string
  tokenExpiry = Date.now() + (data.expires_in as number) * 1000
  return cachedToken!
}

// ─── D365 OData Fetch ──────────────────────────────────────

async function fetchD365(entityPath: string, params: ODataParams = {}): Promise<any[]> {
  const { environmentUrl, legalEntity } = getD365Config()
  const token = await getD365Token()

  const url = new URL(`${environmentUrl}/data/${entityPath}`)

  // Scope to the configured legal entity (dataAreaId)
  const legalEntityFilter = `dataAreaId eq '${legalEntity}'`
  if (params.$filter) {
    params.$filter = `${legalEntityFilter} and (${params.$filter})`
  } else {
    params.$filter = legalEntityFilter
  }

  if (params.$top) url.searchParams.set('$top', String(params.$top))
  if (params.$filter) url.searchParams.set('$filter', params.$filter)
  if (params.$select) url.searchParams.set('$select', params.$select)
  if (params.$orderby) url.searchParams.set('$orderby', params.$orderby)
  url.searchParams.set('cross-company', 'true')

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(
      `D365 OData error (HTTP ${resp.status}) on entity "${entityPath}": ${errText.slice(0, 500)}. ` +
      `Check that the entity is enabled in D365 Data Management and the integration user has access.`
    )
  }

  const data: any = await resp.json()
  return data.value || []
}

// ─── Supabase Client (service role for upserts) ────────────

function getSupabase(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These should be auto-provided by Supabase for Edge Functions.'
    )
  }

  return createClient(url, key)
}

// ─── Entity Extractors ─────────────────────────────────────

async function extractProducts({ top = 100, filter, buyerGroup }: { top?: number; filter?: string; buyerGroup?: string }): Promise<ExtractResult> {
  const sb = getSupabase()
  const params: ODataParams = {
    $top: top,
    $select: 'ItemNumber,SearchName,ProductType,ProductGroupId,BuyerGroupId,InventoryUnitSymbol,PurchaseUnitSymbol,SalesUnitSymbol,SalesPrice,TrackingDimensionGroupName,IsCatchWeightProduct,ShelfLifePeriodDays',
  }

  // Build filter — buyer group is optional, defaults to no group filter
  const filters: string[] = []
  if (buyerGroup) filters.push(`BuyerGroupId eq '${buyerGroup}'`)
  if (filter) filters.push(filter)
  if (filters.length > 0) params.$filter = filters.join(' and ')

  const records = await fetchD365('ReleasedProductsV2', params)

  const rows = records.map((r: any) => ({
    d365_item_number: r.ItemNumber,
    product_name: r.SearchName,
    product_type: r.ProductType,
    item_group: r.ItemGroupId,
    buyer_group: r.BuyerGroupId,
    product_category: null,
    inventory_unit: r.InventoryUnitSymbol,
    purchase_unit: r.PurchaseUnitSymbol,
    sales_unit: r.SalesUnitSymbol,
    sales_price: r.SalesPrice,
    standard_cost: null,
    tracking_dimension_group: r.TrackingDimensionGroupName,
    is_catch_weight: r.IsCatchWeightProduct === 'Yes',
    shelf_life_days: r.ShelfLifePeriodInDays,
    raw_payload: r,
    last_synced_at: new Date().toISOString(),
  }))

  let upserted = 0
  if (rows.length > 0) {
    let { error } = await sb.from('d365_products').upsert(rows, { onConflict: 'd365_item_number' })

    // If buyer_group column doesn't exist yet, retry without it
    if (error && error.message?.includes('buyer_group')) {
      const fallbackRows = rows.map(({ buyer_group, ...rest }: any) => rest)
      const result = await sb.from('d365_products').upsert(fallbackRows, { onConflict: 'd365_item_number' })
      error = result.error
    }

    if (error) throw new Error(`Supabase upsert failed: ${error.message}`)
    upserted = rows.length
  }

  return { count: records.length, upserted }
}

async function extractWarehouses(): Promise<ExtractResult> {
  const sb = getSupabase()
  const records = await fetchD365('Warehouses', {
    $select: 'WarehouseId,WarehouseName,SiteId,IsDefaultReceiptWarehouse,AddressCity,AddressState',
  })

  const rows = records.map((r: any) => ({
    d365_warehouse_id: r.WarehouseId,
    warehouse_name: r.WarehouseName,
    site_id: r.SiteId,
    is_default: r.IsDefaultReceiptWarehouse === 'Yes',
    address_city: r.AddressCity,
    address_state: r.AddressState,
    raw_payload: r,
    last_synced_at: new Date().toISOString(),
  }))

  let upserted = 0
  if (rows.length > 0) {
    const { error } = await sb.from('d365_warehouses').upsert(rows, { onConflict: 'd365_warehouse_id' })
    if (error) throw error
    upserted = rows.length
  }

  return { count: records.length, upserted }
}

async function extractCustomers({ top = 200 }: { top?: number }): Promise<ExtractResult> {
  const sb = getSupabase()
  const records = await fetchD365('CustomersV3', {
    $top: top,
    $select: 'CustomerAccount,OrganizationName,CustomerGroupId,CurrencyCode,PaymentTermsName,ModeOfDeliveryId,PrimaryContactEmail',
  })

  const rows = records.map((r: any) => ({
    d365_customer_account: r.CustomerAccount,
    customer_name: r.OrganizationName,
    customer_group: r.CustomerGroupId,
    currency_code: r.CurrencyCode,
    payment_terms: r.PaymentTermsName,
    delivery_mode: r.ModeOfDeliveryId,
    primary_contact: r.PrimaryContactEmail,
    raw_payload: r,
    last_synced_at: new Date().toISOString(),
  }))

  let upserted = 0
  if (rows.length > 0) {
    const { error } = await sb.from('d365_customers').upsert(rows, { onConflict: 'd365_customer_account' })
    if (error) throw error
    upserted = rows.length
  }

  return { count: records.length, upserted }
}

async function extractProductionOrders({ top = 100, filter }: { top?: number; filter?: string }): Promise<ExtractResult> {
  const sb = getSupabase()
  const params: ODataParams = {
    $top: top,
    $select: 'ProdId,ItemNumber,ItemName,OrderQuantity,RemainingQuantity,InventoryUnitSymbol,ProductionOrderStatus,ScheduledStartDate,ScheduledEndDate,WarehouseId,SiteId',
    $orderby: 'ScheduledStartDate desc',
  }
  if (filter) params.$filter = filter

  const records = await fetchD365('ProductionOrderHeaders', params)

  const rows = records.map((r: any) => ({
    d365_prod_order_id: r.ProdId,
    item_number: r.ItemNumber,
    item_name: r.ItemName,
    order_quantity: r.OrderQuantity,
    remaining_quantity: r.RemainingQuantity,
    unit: r.InventoryUnitSymbol,
    status: r.ProductionOrderStatus,
    scheduled_start_date: r.ScheduledStartDate?.split('T')[0],
    scheduled_end_date: r.ScheduledEndDate?.split('T')[0],
    warehouse_id: r.WarehouseId,
    site_id: r.SiteId,
    raw_payload: r,
    last_synced_at: new Date().toISOString(),
  }))

  let upserted = 0
  if (rows.length > 0) {
    const { error } = await sb.from('d365_production_orders').upsert(rows, { onConflict: 'd365_prod_order_id' })
    if (error) throw error
    upserted = rows.length
  }

  return { count: records.length, upserted }
}

async function extractInventory({ itemNumbers = [], warehouseId }: { itemNumbers?: string[]; warehouseId?: string }): Promise<ExtractResult> {
  const sb = getSupabase()
  const filters: string[] = []
  if (itemNumbers.length > 0) {
    const itemFilter = itemNumbers.map((i: string) => `ItemNumber eq '${i}'`).join(' or ')
    filters.push(`(${itemFilter})`)
  }
  if (warehouseId) filters.push(`WarehouseId eq '${warehouseId}'`)

  const params: ODataParams = {
    $select: 'ItemNumber,WarehouseId,SiteId,AvailablePhysical,AvailableOrdered,TotalAvailable,UnitSymbol,BatchNumber',
  }
  if (filters.length > 0) params.$filter = filters.join(' and ')

  const records = await fetchD365('InventOnHandEntities', params)

  const rows = records.map((r: any) => ({
    item_number: r.ItemNumber,
    warehouse_id: r.WarehouseId,
    site_id: r.SiteId,
    available_physical: r.AvailablePhysical,
    available_ordered: r.AvailableOrdered,
    total_available: r.TotalAvailable,
    unit: r.UnitSymbol,
    batch_number: r.BatchNumber || '',
    last_synced_at: new Date().toISOString(),
  }))

  let upserted = 0
  if (rows.length > 0) {
    const { error } = await sb.from('d365_inventory_onhand').upsert(rows, { onConflict: 'item_number,warehouse_id,batch_number' })
    if (error) throw error
    upserted = rows.length
  }

  return { count: records.length, upserted }
}

async function extractSalesOrders({ top = 200, filter }: { top?: number; filter?: string }): Promise<ExtractResult> {
  const sb = getSupabase()

  // Fetch headers
  const headerParams: ODataParams = { $top: top, $select: 'SalesOrderNumber,OrderingCustomerAccountNumber,SalesOrderStatus' }
  if (filter) headerParams.$filter = filter
  const headers = await fetchD365('SalesOrderHeadersV2', headerParams)

  // Fetch lines for those orders
  const orderNumbers = headers.map((h: any) => h.SalesOrderNumber)
  if (orderNumbers.length === 0) return { count: 0, upserted: 0 }

  const lineFilter = orderNumbers.map((n: string) => `SalesOrderNumber eq '${n}'`).join(' or ')
  const lines = await fetchD365('SalesOrderLinesV2', {
    $filter: lineFilter,
    $select: 'SalesOrderNumber,LineNumber,OrderedInventoryQuantity,DeliveredQuantity,RemainingInventoryQuantity,ItemNumber,ProductName,SalesUnitSymbol,RequestedShipDate,ConfirmedShipDate,DeliveryModeId,InventoryWarehouseId',
  })

  const headerMap: Record<string, any> = Object.fromEntries(headers.map((h: any) => [h.SalesOrderNumber, h]))

  const rows = lines.map((l: any) => {
    const h: any = headerMap[l.SalesOrderNumber] || {}
    return {
      d365_sales_order_number: l.SalesOrderNumber,
      line_number: l.LineNumber,
      customer_account: h.OrderingCustomerAccountNumber,
      item_number: l.ItemNumber,
      item_name: l.ProductName,
      ordered_quantity: l.OrderedInventoryQuantity,
      delivered_quantity: l.DeliveredQuantity,
      remaining_quantity: l.RemainingInventoryQuantity,
      unit: l.SalesUnitSymbol,
      requested_ship_date: l.RequestedShipDate?.split('T')[0],
      confirmed_ship_date: l.ConfirmedShipDate?.split('T')[0],
      delivery_mode: l.DeliveryModeId,
      warehouse_id: l.InventoryWarehouseId,
      order_status: h.SalesOrderStatus,
      raw_payload: { header: h, line: l },
      last_synced_at: new Date().toISOString(),
    }
  })

  let upserted = 0
  if (rows.length > 0) {
    const { error } = await sb.from('d365_sales_orders').upsert(rows, { onConflict: 'd365_sales_order_number,line_number' })
    if (error) throw error
    upserted = rows.length
  }

  return { count: lines.length, upserted }
}

// ─── Outbound Push Operations ──────────────────────────────

async function pushInventoryJournal({ yieldRecord }: { yieldRecord: any }): Promise<{ success: boolean; journalNumber: string }> {
  const { environmentUrl } = getD365Config()
  const token = await getD365Token()

  // Create journal header
  const journalHeader = {
    JournalNameId: 'YIELD',
    Description: `Grower yield: ${yieldRecord.quantity} ${yieldRecord.unit_of_measure}`,
  }

  const headerResp = await fetch(`${environmentUrl}/data/InventoryJournalHeaders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
    },
    body: JSON.stringify(journalHeader),
  })

  if (!headerResp.ok) throw new Error(`Failed to create journal header: ${await headerResp.text()}`)
  const header: any = await headerResp.json()

  return { success: true, journalNumber: header.JournalBatchNumber }
}

async function pushProductionRaf({ harvestData }: { harvestData: any }): Promise<{ success: boolean }> {
  // Report as Finished on an existing production order
  const { environmentUrl } = getD365Config()
  const token = await getD365Token()

  const payload = {
    ProdId: harvestData.d365_prod_order_id,
    GoodQuantity: harvestData.quantity,
    ReportAsFinishedDate: harvestData.harvest_date,
  }

  const resp = await fetch(`${environmentUrl}/data/ProductionOrderHeaders('${harvestData.d365_prod_order_id}')/Microsoft.Dynamics.DataEntities.ReportAsFinished`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) throw new Error(`RAF failed: ${await resp.text()}`)
  return { success: true }
}

// ─── Health Check ──────────────────────────────────────────

interface HealthResult {
  status: string
  d365Connected: boolean
  config: { tenantId: string; clientId: string; environmentUrl: string; legalEntity: string; hasSecret: boolean }
  error?: string
}

async function healthCheck(): Promise<HealthResult> {
  try {
    const config = getD365Config()
    // Try to acquire a token to verify credentials
    await getD365Token()
    return {
      status: 'ok',
      d365Connected: true,
      config: {
        tenantId: config.tenantId,
        clientId: config.clientId,
        environmentUrl: config.environmentUrl,
        legalEntity: config.legalEntity,
        hasSecret: !!config.clientSecret,
      },
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      status: 'error',
      d365Connected: false,
      config: {
        tenantId: Deno.env.get('D365_TENANT_ID') ?? '(not set)',
        clientId: Deno.env.get('D365_CLIENT_ID') ?? '(not set)',
        environmentUrl: Deno.env.get('D365_ENVIRONMENT_URL') ?? '(not set)',
        legalEntity: Deno.env.get('D365_LEGAL_ENTITY') || 'USMF',
        hasSecret: !!(Deno.env.get('D365_CLIENT_SECRET')),
      },
      error: message,
    }
  }
}

// ─── Main Handler ──────────────────────────────────────────

type ActionHandler = (params: any) => Promise<any>

const ACTION_MAP: Record<string, ActionHandler> = {
  health_check: healthCheck,
  extract_products: extractProducts,
  extract_warehouses: extractWarehouses,
  extract_customers: extractCustomers,
  extract_production_orders: extractProductionOrders,
  extract_inventory: extractInventory,
  extract_sales_orders: extractSalesOrders,
  push_inventory_journal: pushInventoryJournal,
  push_production_raf: pushProductionRaf,
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { action, ...params } = await req.json()

    const handler = ACTION_MAP[action as string]
    if (!handler) {
      return new Response(
        JSON.stringify({
          error: `Unknown action: "${action}".`,
          available_actions: Object.keys(ACTION_MAP),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const result = await handler(params)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('D365 proxy error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
