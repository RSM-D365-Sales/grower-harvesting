# Grower Harvesting · bluestem

*From the field, in real time. No more waiting till the cows come home.*

The **Bluestem Fresh Produce** edition of the grower harvesting dashboard — a
React + Vite + Supabase app for tracking contracted grower blocks from bed prep
through the final pick, scheduling harvest crews, recording pick-by-pick yields,
and syncing **bidirectionally** with Dynamics 365 Finance & Supply Chain.

Bluestem is RSM's fictional grower-packer-shipper and fresh-cut processor out of
Grand Rapids, MI (IFPA show mock company). It contracts ~30 Michigan growers
(apples, blueberries, asparagus, cucumbers, squash, sweet corn, cherries,
peppers, zucchini, romaine), sources winter volume from partner growers in
California, Arizona and Mexico, and runs four sites: **GRP** (Grand Rapids
fresh-cut plant + HQ), **HRT** (Hart packing house), **HOL** (Holland DC) and
**SAL** (Salinas 3PL cross-dock). Every grower, customer and figure in this app
is fictional / synthetic.

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup

Run the migration files in your Supabase SQL editor, in order:

1. `supabase/migrations/001_initial_schema.sql` — Core tables (fields, crops, grow cycles, yields, etc.)
2. `supabase/migrations/002_d365_inbound_tables.sql` — D365 inbound cache tables (products, warehouses, customers, production orders, inventory, sales orders, sync log, entity mappings)
3. `003_add_buyer_group.sql`, `004_d365_rls_policies.sql`, `005_auth_roles.sql`, `007_add_ryan_user.sql`
4. **`supabase/migrations/008_bluestem_seed_data.sql`** — the Bluestem demo data.
   This is the single source of truth for everything the demo shows; it is
   re-runnable (clears the demo tables first) and every date is relative to
   `current_date`, so re-run it any time to refresh the demo. It finishes with a
   reconciliation result (row counts, yield totals by grade, unmapped entities).

## Brand & data kit

Source: `../Blustem-company-details/` — `BRAND_GUIDE.md`, `PUN_BANK.md`, and
`Bluestem_Brand_v2_and_Data.zip` (logos + `data/*.csv`).

| App concept | Bluestem source | Notes |
|---|---|---|
| Grower blocks (`fields`) | `grower_blocks.csv`, `growers.csv` | BlockId + town in *location*. Two protected-culture houses (B0090/B0091) were added for the shoulder-season greenhouse story; the CA/MX winter-program blocks are flagged in *location*. |
| Crops & varieties (`crops`) | `grower_blocks.csv` | Target yield/acre = pack EstimatedYield ÷ Acres × pack unit weight, in lbs. Lead time = hours field-to-cooler. |
| Crews & team (`team_members`) | `employees.csv`, `harvest_events.csv` | Sam Fischer (Grower Relations), Ingrid Larsen (Field Agronomist), Rosa Delgado, Ben Carter, Sofia Ruiz (QA), Yara Sato (Dispatch) + Crew A/B/C and Mechanical leads. |
| Yields (`yield_records`) | `harvest_events.csv` | Stored in **lbs**; trade unit, grade (A = US Fancy, B = US #1, C = US #2/processing), crew and load ticket in notes. |
| D365 products | `items.csv` | RAW-* raw produce, PK-* packed fresh, FC-* fresh-cut. |
| D365 warehouses | `sites.csv` | HRT-PK (default receiving), GRP-RM, HOL-DC, SAL-XD. |
| D365 customers / orders | `customers.csv`, `production_orders.csv` | Pack IDs (C100xx, SO-50xxx, PRD-9xxxx). |

Demo logins (email only): `sam.fischer@bluestemfresh.com` (manager),
`ingrid.larsen@bluestemfresh.com` / `rosa.delgado@bluestemfresh.com` (operators).

Colors: RSM Blue `#009CDE` (accents, chart series 1), Midnight `#00153D`
(chrome, headings), RSM Green `#3F9C35` (good status), Harvest Amber `#F2A900`
(warning), Signal Red `#D0342C` (critical). Headings are Poppins SemiBold
(bundled via `@fontsource/poppins`), body Segoe UI. The RSM "Powered by" mark
sits at the right of the title ribbon per the brand guide.

## Features

- **KPI Dashboard** — Active blocks, harvest-ready blocks, yield totals, short lead-time crops, and D365 sync status
- **Grow Cycle Tracking** — Field prep → Planting → Growth → Harvest pipeline per grower block
- **Harvest Scheduling** — Calendar-based pick scheduling with crew assignments
- **Yield Management** — Pick-by-pick yields with produce grades and short lead-time alerts
- **D365 Integration (Outbound)** — Staging queue to push harvest and yield data to D365 F&SC
- **D365 Products (Inbound)** — Extract released products from D365 via OData
- **D365 Production Orders (Inbound)** — Pull production order status from D365
- **D365 Demand & Inventory (Inbound)** — Extract sales orders and on-hand inventory
- **D365 Mappings** — Map crops to D365 products and grower blocks to D365 warehouses

---

## D365 Finance & Supply Chain Integration

### Architecture Overview

```
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│   React App     │       │  Supabase Edge Fn     │       │  D365 F&SCM          │
│   (Browser)     │──────▶│  d365-proxy           │──────▶│  OData v4 Endpoints  │
│                 │       │  (OAuth + proxy)       │       │                      │
│                 │◀──────│                        │◀──────│                      │
└─────────────────┘       └──────────────────────┘       └──────────────────────┘
        │                          │
        │                          ▼
        │                 ┌──────────────────────┐
        └────────────────▶│  Supabase PostgreSQL  │
                          │  (cache + staging)    │
                          └──────────────────────┘
```

**Data flows in two directions:**

| Direction | What | Mechanism |
|-----------|------|-----------|
| **Inbound (D365 → App)** | Products, warehouses, customers, production orders, on-hand inventory, sales orders | OData GET → cache in Supabase |
| **Outbound (App → D365)** | Yield records, harvest completions | Staging queue → OData POST (inventory journals, RAF) |

### D365 OData Entities Used

| D365 OData Entity | Direction | Maps To |
|---|---|---|
| `ReleasedProductsV2` | Inbound | `d365_products` table — item master data, shelf life, tracking dimensions |
| `Warehouses` | Inbound | `d365_warehouses` table — sites and warehouses for block mapping |
| `CustomersV3` | Inbound | `d365_customers` table — customer accounts for sales order context |
| `ProductionOrderHeaders` | Inbound | `d365_production_orders` table — production scheduling and status |
| `InventOnHandEntities` | Inbound | `d365_inventory_onhand` table — available physical/ordered inventory |
| `SalesOrderHeadersV2` / `SalesOrderLinesV2` | Inbound | `d365_sales_orders` table — demand signal with ship dates |
| `InventoryJournalHeaders` / `InventoryJournalLines` | Outbound | Yield records pushed as inventory counting journals |
| `ProductionOrderHeaders (RAF action)` | Outbound | Harvest completions pushed as Report as Finished |

### How Extraction Works

1. User clicks **"Extract from D365"** on any D365 page (Products, Production Orders, Demand & Inventory)
2. The React app calls `src/lib/d365Api.js` which sends a POST to the Supabase Edge Function
3. The Edge Function (`supabase/functions/d365-proxy/index.ts`):
   - Acquires an OAuth 2.0 access token from Azure AD using client-credentials flow
   - Calls the D365 OData v4 endpoint with `$select`, `$filter`, `$top` parameters
   - Maps the OData response fields to Supabase table columns
   - Upserts the data into the appropriate Supabase table
4. The React app refreshes its TanStack Query cache, showing the extracted data

### How Outbound Push Works

1. When a yield record is created or a harvest is completed, a row is inserted into `d365_sync_queue`
2. The D365 Sync Queue page shows pending/processing/synced/failed items
3. The Edge Function can push:
   - **Yield data** → D365 Inventory Counting Journal (creates header + lines)
   - **Harvest completion** → D365 Production Order Report as Finished (RAF action)

### Entity Mappings

The **D365 Mappings** page lets you link local entities to D365:
- **Crop → D365 Product**: Map each crop × variety (e.g., "Apples · Honeycrisp") to its D365 raw item (e.g., `RAW-APL-HC`)
- **Block → D365 Warehouse**: Map each grower block to the D365 warehouse/site its picks are delivered to (Michigan blocks → `HRT-PK`, winter program → `SAL-XD`)

These mappings are stored in `d365_entity_mappings` and used when pushing outbound data to ensure the correct D365 item/warehouse references.

### Setting Up the D365 Connection

#### 1. Azure AD App Registration

Create an app registration in Azure AD for your D365 environment:

```
Azure Portal → Azure Active Directory → App Registrations → New Registration
```

- **Name**: Bluestem Grower Harvesting Integration
- **Supported account types**: Single tenant
- **API permissions**: Add `Dynamics ERP` → `CustomService.ReadWrite.All` (or `Odata.Read.All` + `Odata.Write.All`)
- **Certificates & secrets**: Create a client secret

#### 2. D365 F&SCM Configuration

In D365 Finance & Supply Chain:
- **System administration → Setup → Azure Active Directory applications**: Register the app's Client ID
- **Data management → Framework parameters → Entity settings**: Ensure the OData entities listed above are enabled
- Assign the app registration appropriate security roles (e.g., a custom "Integration User" role with read access to products, warehouses, production orders, sales orders, on-hand inventory)

#### 3. Supabase Edge Function Secrets

Set these secrets in your Supabase project dashboard under **Edge Functions → Secrets**:

```
D365_TENANT_ID=<your-azure-ad-tenant-id>
D365_CLIENT_ID=<your-app-registration-client-id>
D365_CLIENT_SECRET=<your-client-secret>
D365_ENVIRONMENT_URL=https://yourorg.operations.dynamics.com
```

#### 4. Deploy the Edge Function

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref <your-project-ref>

# Deploy the D365 proxy function
supabase functions deploy d365-proxy --no-verify-jwt
```

#### 5. Run the Database Migration

In the Supabase SQL editor, run `supabase/migrations/002_d365_inbound_tables.sql` to create all the inbound cache tables.

### D365 Data Flow Summary

```
INBOUND (Extract from D365):
  D365 ReleasedProductsV2    ──▶  d365_products         ──▶  D365 Products page
  D365 Warehouses            ──▶  d365_warehouses        ──▶  D365 Mappings page
  D365 CustomersV3           ──▶  d365_customers         ──▶  D365 Demand page context
  D365 ProductionOrderHeaders──▶  d365_production_orders ──▶  D365 Production Orders page
  D365 InventOnHandEntities  ──▶  d365_inventory_onhand  ──▶  D365 Demand page (Inventory tab)
  D365 SalesOrderHeaders/Lines──▶ d365_sales_orders      ──▶  D365 Demand page (Orders tab)

OUTBOUND (Push to D365):
  yield_records        ──▶  d365_sync_queue  ──▶  D365 InventoryJournalHeaders/Lines
  harvest_schedules    ──▶  d365_sync_queue  ──▶  D365 ProductionOrderHeaders (RAF)

MAPPINGS:
  crops  ←───mapping───▶  d365_products    (Crop × Variety → Item Number)
  fields ←───mapping───▶  d365_warehouses  (Grower Block → Warehouse ID)
```

### Source Files

| File | Purpose |
|------|---------|
| `src/lib/d365Api.js` | D365 API service — calls Edge Function, reads cached data from Supabase |
| `src/hooks/useD365.js` | React hooks — TanStack Query wrappers for all D365 data operations |
| `src/pages/D365Integration.jsx` | Outbound sync queue monitor (push to D365) |
| `src/pages/D365Products.jsx` | Browse/extract D365 released products |
| `src/pages/D365ProductionOrders.jsx` | Browse/extract D365 production orders |
| `src/pages/D365Demand.jsx` | Browse/extract sales orders and on-hand inventory |
| `src/pages/D365Mappings.jsx` | Map crops→products, blocks→warehouses, view sync history |
| `supabase/functions/d365-proxy/index.ts` | Edge Function — OAuth2 token acquisition + OData proxy |
| `supabase/migrations/002_d365_inbound_tables.sql` | Database tables for D365 cached data |
| `supabase/migrations/008_bluestem_seed_data.sql` | Bluestem demo seed — the single source of truth for demo data |
