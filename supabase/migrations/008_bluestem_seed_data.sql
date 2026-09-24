-- ============================================================
-- Migration 008 — Bluestem Greens demo seed (greenhouse edition)
--
-- Source of truth for every demo figure in this app. Bluestem Fresh Produce is
-- RSM's fictional IFPA mock company (../Blustem-company-details). This seed
-- models its protected-culture division, "Bluestem Greens", on a greenhouse
-- campus next to the Holland, MI distribution center (site HOL): living
-- lettuce and herbs in NFT/DWC bays, microgreens on vertical racks, high-wire
-- mini cucumbers, and a propagation house feeding the bays. Every grower,
-- customer, and figure is synthetic.
--
-- It preserves the structure of the hydroponic dataset that was live before
-- the rebrand (backed up in ../backups/2026-09-24-farmbox-greens-live/) and
-- re-keys it to the Bluestem pack:
--   fields        = greenhouse bays / rooms. area_acres holds SQUARE FEET and
--                   target_yield_per_acre is per SQUARE FOOT (the UI labels
--                   them that way); the column names are unchanged.
--   crops         = crop x variety; lead time = hours cut-to-cooler.
--   team_members  = Bluestem staff (employees.csv) + greenhouse harvest crew.
--   yield_records = recorded in each crop's unit (heads / lbs / bunches); the
--                   UI totals per unit. Grade map: A = Premium retail,
--                   B = Foodservice, C = Processing (GRP fresh-cut), reject = compost.
--   d365_*        = PK-* living/baby/herb/micro items in the pack's numbering
--                   style, the pack's own PK-ROM-HRT, PK-CUC-MINI, FC-SAL-* items,
--                   sites.csv as warehouses, customers.csv accounts,
--                   PRD-9xxxx production orders.
--
-- Dates are relative to current_date so the demo never goes stale (greenhouse
-- production is year-round, so there is no seasonal story to keep).
-- Re-runnable: clears the demo tables first.
-- ============================================================

-- -----------------------------------------------
-- Clear existing demo data (order matters for FKs)
-- -----------------------------------------------
delete from d365_sync_queue;
delete from d365_entity_mappings;
delete from yield_records;
delete from harvest_schedule_members;
delete from harvest_schedules;
delete from grow_cycles;
delete from crops;
delete from fields;
delete from team_members;
delete from d365_sales_orders;
delete from d365_production_orders;
delete from d365_inventory_onhand;
delete from d365_customers;
delete from d365_warehouses;
delete from d365_products;

-- (The app has no login — the app_users table from migration 005 is unused.)

-- -----------------------------------------------
-- TEAM MEMBERS — staff + greenhouse harvest crew
-- -----------------------------------------------
insert into team_members (full_name, role, email, phone) values
  ('Ingrid Larsen',                     'field_manager',     'ingrid.larsen@bluestemfresh.com',    '(616) 555-0142'),
  ('Caleb Novak',                       'field_manager',     'caleb.novak@bluestemfresh.com',      '(616) 555-0147'),
  ('Ben Carter',                        'planner',           'ben.carter@bluestemfresh.com',       '(616) 555-0144'),
  ('Sofia Ruiz',                        'quality_inspector', 'sofia.ruiz@bluestemfresh.com',       '(616) 555-0145'),
  ('Yara Sato',                         'driver',            'yara.sato@bluestemfresh.com',        '(616) 555-0146'),
  ('Mateo Alvarez (Harvest lead)',      'harvester',         'mateo.alvarez@bluestemfresh.com',    '(616) 555-0151'),
  ('Josie Vanderberg (Harvest tech)',   'harvester',         'josie.vanderberg@bluestemfresh.com', '(616) 555-0152'),
  ('Luis Ortega (Micro room tech)',     'harvester',         'luis.ortega@bluestemfresh.com',      '(616) 555-0153'),
  ('Dale Brinks (High-wire crew lead)', 'harvester',         'dale.brinks@bluestemfresh.com',      '(616) 555-0154'),
  ('Priya Raman (Propagation tech)',    'harvester',         'priya.raman@bluestemfresh.com',      '(616) 555-0155');

-- -----------------------------------------------
-- FIELDS — greenhouse bays and rooms (area = sq ft, soil_type = growing system)
-- -----------------------------------------------
insert into fields (name, location, area_acres, soil_type, status) values
  ('GH-1 Bay A — Living Lettuce',      'Greenhouse 1 · NFT channels west',        14400, 'NFT Hydroponic',              'growing'),
  ('GH-1 Bay B — Living Lettuce',      'Greenhouse 1 · NFT channels east',        14400, 'NFT Hydroponic',              'harvest_ready'),
  ('GH-2 Bay A — Baby Greens',         'Greenhouse 2 · DWC rafts north',          11520, 'DWC Hydroponic',              'growing'),
  ('GH-2 Bay B — Baby Greens',         'Greenhouse 2 · DWC rafts south',          11520, 'DWC Hydroponic',              'harvest_ready'),
  ('GH-3 — Living Herbs',              'Greenhouse 3 · NFT drip system',           7680, 'NFT Hydroponic',              'growing'),
  ('GH-4 — Expansion Bay',             'Greenhouse 4 · new build',                14400, 'NFT Hydroponic',              'field_prep'),
  ('GH-5 — High-Wire Cucumbers',       'Greenhouse 5 · rockwool slabs, drip',     21600, 'Rockwool slabs · drip',       'harvesting'),
  ('Micro Room A — Vertical Racks',    'Indoor climate room A · racks 1-6',        3600, 'Vertical racks · coco coir',  'harvesting'),
  ('Micro Room B — Vertical Racks',    'Indoor climate room B · racks 1-6',        3600, 'Vertical racks · coco coir',  'growing'),
  ('Propagation House',                'Seedling nursery · germination chamber',   3840, 'Rockwool plugs',              'planted');

-- -----------------------------------------------
-- CROPS — crop x variety; target yield is per sq ft per cycle
-- -----------------------------------------------
insert into crops (name, variety, avg_grow_days, lead_time_hours, unit_of_measure, target_yield_per_acre) values
  ('Living Butter Lettuce',     'Bibb / Boston',            35, 18, 'heads',   2.00),
  ('Living Green Leaf Lettuce', 'Green Star',               32, 18, 'heads',   1.80),
  ('Living Red Leaf Lettuce',   'Red Sails',                33, 18, 'heads',   1.80),
  ('Living Romaine Hearts',     'Coastal Star',             38, 24, 'heads',   1.50),
  ('Living Red Oakleaf',        'Super Red',                34, 18, 'heads',   1.80),
  ('Baby Arugula',              'Astro',                    18, 12, 'lbs',     0.30),
  ('Baby Spinach',              'Bloomsdale',               20, 12, 'lbs',     0.28),
  ('Spring Mix',                'Mesclun Blend',            21, 12, 'lbs',     0.25),
  ('Baby Kale Mix',             'Red Russian / Lacinato',   22, 14, 'lbs',     0.22),
  ('Living Basil',              'Genovese',                 28, 14, 'heads',   2.50),
  ('Living Cilantro',           'Santo',                    25, 12, 'bunches', 0.35),
  ('Living Mint',               'Spearmint',                30, 14, 'heads',   2.00),
  ('Living Dill',               'Bouquet',                  28, 14, 'bunches', 0.30),
  ('Microgreens — Pea Shoots',  'Speckled Pea',             10,  6, 'lbs',     0.35),
  ('Microgreens — Sunflower',   'Black Oil Sunflower',       9,  6, 'lbs',     0.30),
  ('Microgreens — Radish',      'China Rose',                8,  6, 'lbs',     0.28),
  ('Microgreens — Rainbow Mix', 'Bluestem Signature Blend', 10,  6, 'lbs',     0.30),
  ('Mini Cucumbers',            'High-wire seedless',       60, 24, 'lbs',     8.00);

-- -----------------------------------------------
-- GROW CYCLES
-- -----------------------------------------------
insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, x.phase,
  current_date + x.prep, case when x.plant is null then null else current_date + x.plant end,
  case when x.expected is null then null else current_date + x.expected end,
  case when x.actual is null then null else current_date + x.actual end,
  x.notes
from (values
  ('GH-1 Bay A — Living Lettuce',   'Living Butter Lettuce',     'growing',       -22, -20,  15, null, 'NFT channels — pH 5.8, EC 1.2 mS/cm — healthy root development'),
  ('GH-1 Bay A — Living Lettuce',   'Living Green Leaf Lettuce', 'growing',       -18, -16,  16, null, 'Transplanted from propagation house — spacing 8 in'),
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',     'harvest_ready', -37, -35,   0, null, 'Full heads formed — roots healthy — ready for live pack'),
  ('GH-1 Bay B — Living Lettuce',   'Living Red Oakleaf',        'harvest_ready', -35, -33,   1, null, 'Red oakleaf at ideal size — vibrant color'),
  ('GH-2 Bay A — Baby Greens',      'Baby Arugula',              'growing',       -12, -10,   8, null, 'DWC rafts — dense seeding — first true leaves emerging'),
  ('GH-2 Bay A — Baby Greens',      'Baby Spinach',              'growing',       -10,  -8,  12, null, 'DWC rafts — good germination rate, thinning not needed'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',                'harvest_ready', -24, -21,   0, null, 'Spring mix at target 3-inch height — cut today'),
  ('GH-2 Bay B — Baby Greens',      'Baby Kale Mix',             'harvest_ready', -25, -22,   1, null, 'Baby kale tender and ready — second cut possible in 10 days'),
  ('GH-3 — Living Herbs',           'Living Basil',              'growing',       -18, -15,  13, null, 'Living basil — pinch-pruned last week, branching well'),
  ('GH-3 — Living Herbs',           'Living Cilantro',           'growing',       -14, -12,  13, null, 'Cilantro — steady growth, no bolting detected'),
  ('GH-4 — Expansion Bay',          'Living Mint',               'field_prep',     -3, null, null, null, 'Installing NFT channels and plumbing for mint production'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',            'harvesting',    -75, -60, -20,  -20, 'High-wire crop, week 6 of picking — 3 picks/week, lowering and leaning weekly'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Pea Shoots',  'harvesting',    -12, -10,  -1,   -1, 'Pea shoots at 4-inch height — daily cutting in progress'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Sunflower',   'harvesting',    -11,  -9,   0,    0, 'Sunflower micros — cotyledon stage, shells dropped — harvest now'),
  ('Micro Room B — Vertical Racks', 'Microgreens — Radish',      'growing',        -5,  -3,   5, null, 'Radish micros — germination complete, blackout phase ending'),
  ('Micro Room B — Vertical Racks', 'Microgreens — Rainbow Mix', 'growing',        -4,  -2,   8, null, 'Rainbow mix — staggered tray seeding for continuous supply'),
  ('Propagation House',             'Living Romaine Hearts',     'planting',       -5,  -3, null, null, 'Romaine plugs in rockwool — transplant to GH-1 in 10 days'),
  ('Propagation House',             'Living Red Leaf Lettuce',   'planting',       -4,  -2, null, null, 'Red leaf plugs — germination at 95% — healthy seedlings')
) as x(field_name, crop_name, phase, prep, plant, expected, actual, notes)
join fields f on f.name = x.field_name
join crops c on c.name = x.crop_name;

-- -----------------------------------------------
-- HARVEST SCHEDULES (matched on bay + crop)
-- -----------------------------------------------
insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + x.day_offset, x.start_time::time, x.end_time::time, x.status, x.notes
from (values
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',    0, '05:00', '09:00', 'scheduled',   'Pull living heads with roots — clamshell — Great Lakes Grocers morning truck'),
  ('GH-1 Bay B — Living Lettuce',   'Living Red Oakleaf',       1, '05:00', '08:00', 'scheduled',   'Lakeside Natural Foods weekly order'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',               0, '06:00', '10:00', 'scheduled',   'Cut at 3-inch — wash and spin dry — pack 1-lb clamshells'),
  ('GH-2 Bay B — Baby Greens',      'Baby Kale Mix',            1, '06:00', '09:00', 'scheduled',   'First cut — leave crowns for regrowth'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Pea Shoots', 0, '04:30', '07:00', 'in_progress', 'Daily harvest — racks 1-3 complete, racks 4-6 underway'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Sunflower',  0, '07:00', '09:00', 'scheduled',   'Harvest after pea shoots — pack in 4 oz and 1 lb containers'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',           1, '06:00', '11:00', 'scheduled',   'Pick #13 — high-wire crew — 1 lb bags for Summit Club'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',              -7, '05:30', '10:00', 'completed',   'Full cut — 240 lbs packed and shipped to HOL-DC'),
  ('GH-1 Bay A — Living Lettuce',   'Living Butter Lettuce',   -2, '05:00', '09:00', 'cancelled',   'Power outage at the campus — EC level adjustment, rescheduled')
) as x(field_name, crop_name, day_offset, start_time, end_time, status, notes)
join fields f on f.name = x.field_name
join crops c on c.name = x.crop_name
join grow_cycles gc on gc.field_id = f.id and gc.crop_id = c.id;

-- -----------------------------------------------
-- HARVEST SCHEDULE MEMBERS
-- -----------------------------------------------
insert into harvest_schedule_members (harvest_schedule_id, team_member_id, role_in_harvest)
select hs.id, tm.id, x.role_in_harvest
from (values
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',    'scheduled',   'Ingrid Larsen',                     'lead'),
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',    'scheduled',   'Mateo Alvarez (Harvest lead)',      'harvester'),
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',    'scheduled',   'Josie Vanderberg (Harvest tech)',   'harvester'),
  ('GH-1 Bay B — Living Lettuce',   'Living Butter Lettuce',    'scheduled',   'Yara Sato',                         'delivery'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',               'scheduled',   'Sofia Ruiz',                        'quality_check'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',               'scheduled',   'Josie Vanderberg (Harvest tech)',   'harvester'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Pea Shoots', 'in_progress', 'Luis Ortega (Micro room tech)',     'lead'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Pea Shoots', 'in_progress', 'Mateo Alvarez (Harvest lead)',      'harvester'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',           'scheduled',   'Caleb Novak',                       'lead'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',           'scheduled',   'Dale Brinks (High-wire crew lead)', 'harvester')
) as x(field_name, crop_name, status, member_name, role_in_harvest)
join fields f on f.name = x.field_name
join crops c on c.name = x.crop_name
join grow_cycles gc on gc.field_id = f.id and gc.crop_id = c.id
join harvest_schedules hs on hs.grow_cycle_id = gc.id and hs.status = x.status
join team_members tm on tm.full_name = x.member_name;

-- -----------------------------------------------
-- YIELD RECORDS — in each crop's unit
-- -----------------------------------------------
-- Tied to the completed spring-mix cut and the in-progress pea-shoot harvest
insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, x.qty, x.uom, x.grade, now() - (x.hours_ago || ' hours')::interval, x.notes
from (values
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',               'completed',   240, 'lbs', 'A', 168, 'Premium spring mix — consistent leaf size, no yellowing'),
  ('GH-2 Bay B — Baby Greens',      'Spring Mix',               'completed',    18, 'lbs', 'C', 168, 'Slightly oversized leaves — sent to GRP fresh-cut salad line'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Pea Shoots', 'in_progress',  42, 'lbs', 'A',   2, 'Morning cut — racks 1-3, crisp tendrils')
) as x(field_name, crop_name, status, qty, uom, grade, hours_ago, notes)
join fields f on f.name = x.field_name
join crops c on c.name = x.crop_name
join grow_cycles gc on gc.field_id = f.id and gc.crop_id = c.id
join harvest_schedules hs on hs.grow_cycle_id = gc.id and hs.status = x.status;

-- Standalone picks (no schedule row)
insert into yield_records (grow_cycle_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, x.qty, x.uom, x.grade, now() - (x.hours_ago || ' hours')::interval, x.notes
from (values
  ('GH-1 Bay A — Living Lettuce',   'Living Butter Lettuce',   2400, 'heads', 'A', 240, 'Previous turn — full bay harvest, excellent root mass'),
  ('GH-2 Bay A — Baby Greens',      'Baby Arugula',             280, 'lbs',   'A', 120, 'Previous turn — peppery flavor, ideal leaf size'),
  ('Micro Room A — Vertical Racks', 'Microgreens — Sunflower',   55, 'lbs',   'A',  72, 'Racks 4-6 — nutty crunch, bright green'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',          1860, 'lbs',   'A',  26, 'Pick #12 — straight, 4-5 in, 1 lb bag spec'),
  ('GH-5 — High-Wire Cucumbers',    'Mini Cucumbers',           140, 'lbs',   'C',  26, 'Pick #12 crooks and oversize — to GRP veggie tray line')
) as x(field_name, crop_name, qty, uom, grade, hours_ago, notes)
join fields f on f.name = x.field_name
join crops c on c.name = x.crop_name
join grow_cycles gc on gc.field_id = f.id and gc.crop_id = c.id;

-- -----------------------------------------------
-- D365 SYNC QUEUE — pending, synced, and one failed (shows Retry)
-- -----------------------------------------------
insert into d365_sync_queue (entity_type, entity_id, payload, status)
select 'yield', yr.id,
  jsonb_build_object('quantity', yr.quantity, 'grade', yr.grade, 'unit', yr.unit_of_measure, 'notes', yr.notes),
  'pending'
from yield_records yr
order by yr.recorded_at desc
limit 3;

insert into d365_sync_queue (entity_type, entity_id, payload, status, attempts, synced_at)
select 'harvest', hs.id,
  jsonb_build_object('bay', f.name, 'crop', c.name, 'action', 'ReportAsFinished', 'prodOrder', 'PRD-91003'),
  'synced', 1, now() - interval '6 days'
from harvest_schedules hs
join grow_cycles gc on hs.grow_cycle_id = gc.id
join fields f on gc.field_id = f.id
join crops c on gc.crop_id = c.id
where hs.status = 'completed';

insert into d365_sync_queue (entity_type, entity_id, payload, status, attempts, last_error)
select 'yield', yr.id,
  jsonb_build_object('quantity', yr.quantity, 'grade', yr.grade, 'unit', yr.unit_of_measure, 'notes', yr.notes),
  'failed', 2, 'InventoryJournalLines: batch BT-' || to_char(current_date - 1, 'YYYYMMDD') || '-03 is not registered for PK-CUC-MINI at warehouse HOL-GH'
from yield_records yr
join grow_cycles gc on yr.grow_cycle_id = gc.id
join crops c on gc.crop_id = c.id
where c.name = 'Mini Cucumbers' and yr.grade = 'A';

-- -----------------------------------------------
-- D365 PRODUCTS — greenhouse packed items (PK-*) + the pack's own items they feed
-- -----------------------------------------------
insert into d365_products (d365_item_number, product_name, product_type, item_group, inventory_unit, sales_unit, sales_price, standard_cost, tracking_dimension_group, shelf_life_days, buyer_group) values
  ('PK-LIV-BUT',    'Living Butter Lettuce, rooted clamshell',    'Item', 'Greenhouse · Living Lettuce', 'heads',   'heads',   2.50,  1.45, 'Batch', 14, 'Greenhouse'),
  ('PK-LIV-GRN',    'Living Green Leaf Lettuce, rooted clamshell','Item', 'Greenhouse · Living Lettuce', 'heads',   'heads',   2.25,  1.30, 'Batch', 14, 'Greenhouse'),
  ('PK-LIV-RED',    'Living Red Leaf Lettuce, rooted clamshell',  'Item', 'Greenhouse · Living Lettuce', 'heads',   'heads',   2.50,  1.45, 'Batch', 14, 'Greenhouse'),
  ('PK-LIV-OAK',    'Living Red Oakleaf, rooted clamshell',       'Item', 'Greenhouse · Living Lettuce', 'heads',   'heads',   2.50,  1.45, 'Batch', 14, 'Greenhouse'),
  ('PK-ROM-HRT',    'Romaine Hearts 3 ct',                        'Item', 'Packed Fresh · Leafy Greens', 'Case',    'Case',   22.80, 16.40, 'Batch', 14, 'Produce'),
  ('PK-BBY-ARUG',   'Baby Arugula 1 lb clamshell',                'Item', 'Greenhouse · Baby Greens',    'lbs',     'lbs',     5.50,  3.10, 'Batch',  7, 'Greenhouse'),
  ('PK-BBY-SPIN',   'Baby Spinach 1 lb clamshell',                'Item', 'Greenhouse · Baby Greens',    'lbs',     'lbs',     5.00,  2.90, 'Batch',  7, 'Greenhouse'),
  ('PK-BBY-SPRM',   'Spring Mix 1 lb clamshell',                  'Item', 'Greenhouse · Baby Greens',    'lbs',     'lbs',     6.00,  3.40, 'Batch',  7, 'Greenhouse'),
  ('PK-BBY-KALE',   'Baby Kale Mix 1 lb clamshell',               'Item', 'Greenhouse · Baby Greens',    'lbs',     'lbs',     5.50,  3.20, 'Batch',  7, 'Greenhouse'),
  ('PK-HRB-BAS',    'Living Basil, potted sleeve',                'Item', 'Greenhouse · Living Herbs',   'heads',   'heads',   3.00,  1.60, 'Batch', 10, 'Greenhouse'),
  ('PK-HRB-CIL',    'Living Cilantro, bunch',                     'Item', 'Greenhouse · Living Herbs',   'bunches', 'bunches', 2.75,  1.40, 'Batch', 10, 'Greenhouse'),
  ('PK-HRB-MNT',    'Living Mint, potted sleeve',                 'Item', 'Greenhouse · Living Herbs',   'heads',   'heads',   3.25,  1.70, 'Batch', 10, 'Greenhouse'),
  ('PK-HRB-DIL',    'Living Dill, bunch',                         'Item', 'Greenhouse · Living Herbs',   'bunches', 'bunches', 2.75,  1.40, 'Batch', 10, 'Greenhouse'),
  ('PK-MIC-PEA',    'Microgreens Pea Shoots 4 oz / 1 lb',         'Item', 'Greenhouse · Microgreens',    'lbs',     'lbs',    14.00,  7.20, 'Batch',  5, 'Greenhouse'),
  ('PK-MIC-SUN',    'Microgreens Sunflower 4 oz / 1 lb',          'Item', 'Greenhouse · Microgreens',    'lbs',     'lbs',    16.00,  8.10, 'Batch',  5, 'Greenhouse'),
  ('PK-MIC-RAD',    'Microgreens Radish 4 oz / 1 lb',             'Item', 'Greenhouse · Microgreens',    'lbs',     'lbs',    15.00,  7.60, 'Batch',  5, 'Greenhouse'),
  ('PK-MIC-MIX',    'Microgreens Bluestem Rainbow Mix 4 oz',      'Item', 'Greenhouse · Microgreens',    'lbs',     'lbs',    16.00,  8.30, 'Batch',  5, 'Greenhouse'),
  ('PK-CUC-MINI',   'Mini Cucumbers 1 lb bag',                    'Item', 'Packed Fresh · Vegetables',   'Case',    'Case',   19.20, 13.40, 'Batch', 12, 'Produce'),
  ('FC-SAL-GARDEN', 'Garden Salad Kit 10 oz',                     'Item', 'Fresh-Cut · Salads',          'Case',    'Case',   29.60, 17.50, 'Batch', 12, 'Produce'),
  ('FC-SAL-CAESAR', 'Caesar Salad Kit 10 oz',                     'Item', 'Fresh-Cut · Salads',          'Case',    'Case',   31.20, 18.60, 'Batch', 12, 'Produce'),
  ('FC-VEG-TRAY',   'Veggie Tray w/ dip 24 oz',                   'Item', 'Fresh-Cut · Trays',           'Case',    'Case',   36.00, 21.70, 'Batch',  9, 'Produce');

-- -----------------------------------------------
-- D365 CUSTOMERS — customers.csv accounts that buy greenhouse product
-- -----------------------------------------------
insert into d365_customers (d365_customer_account, customer_name, customer_group, currency_code, payment_terms, delivery_mode, primary_contact) values
  ('C10001', 'Great Lakes Grocers',       'Retail - Grocery',              'USD', 'Net 21',       'Reefer truck',   'Produce Buyer · Grand Rapids, MI'),
  ('C10002', 'Northwind Foods',           'Retail - Grocery',              'USD', 'Net 30',       'Reefer truck',   'Produce Category Mgr · Columbus, OH'),
  ('C10007', 'Summit Club Stores',        'Retail - Club',                 'USD', 'Net 30',       'Reefer truck',   'Club Produce Buyer · Chicago, IL'),
  ('C10009', 'Lakeside Natural Foods',    'Retail - Natural',              'USD', 'Net 30',       'Reefer truck',   'Local Buyer · Ann Arbor, MI'),
  ('C10010', 'Green Cart Co-op',          'Retail - Natural',              'USD', 'Net 30',       'Reefer truck',   'Produce Coordinator · Detroit, MI'),
  ('C10019', 'Campus Dining Partners',    'Foodservice - Institutional',   'USD', 'Net 21',       'Scheduled delivery', 'Dining Procurement · East Lansing, MI'),
  ('C10021', 'Fresh Bowl Kitchens',       'Foodservice - Restaurant Chain','USD', 'Net 30',       'Direct delivery','Culinary Director · Chicago, IL'),
  ('C10026', 'Pantry Prime Meal Kits',    'E-commerce',                    'USD', 'Net 30',       'Carrier pickup', 'Vendor Relations · Indianapolis, IN'),
  ('C10038', 'Windy City Salad Works',    'Processor',                     'USD', '2% 10 Net 30', 'Reefer truck',   'Raw Materials Buyer · Chicago, IL');

-- -----------------------------------------------
-- D365 WAREHOUSES — sites.csv (+ the greenhouse campus at Holland)
-- -----------------------------------------------
insert into d365_warehouses (d365_warehouse_id, warehouse_name, site_id, is_default, address_city, address_state) values
  ('HOL-GH', 'Holland Greenhouse Campus — Pack Room',   'HOL', true,  'Holland',      'MI'),
  ('HOL-DC', 'Holland Distribution Center',             'HOL', false, 'Holland',      'MI'),
  ('GRP-RM', 'Grand Rapids Fresh-Cut — Raw Materials',  'GRP', false, 'Grand Rapids', 'MI'),
  ('HRT-PK', 'Hart Packing House',                      'HRT', false, 'Hart',         'MI');

-- -----------------------------------------------
-- D365 SALES ORDERS — demand signal (pack SO-50xxx numbering)
-- -----------------------------------------------
insert into d365_sales_orders (d365_sales_order_number, line_number, customer_account, customer_name, item_number, item_name, ordered_quantity, delivered_quantity, remaining_quantity, unit, requested_ship_date, warehouse_id, order_status) values
  ('SO-50571', 1, 'C10001', 'Great Lakes Grocers',     'PK-LIV-BUT',  'Living Butter Lettuce, rooted clamshell',     1200, 0, 1200, 'heads', current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50571', 2, 'C10001', 'Great Lakes Grocers',     'PK-BBY-SPRM', 'Spring Mix 1 lb clamshell',                    100, 0,  100, 'lbs',   current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50571', 3, 'C10001', 'Great Lakes Grocers',     'PK-HRB-BAS',  'Living Basil, potted sleeve',                  300, 0,  300, 'heads', current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50574', 1, 'C10009', 'Lakeside Natural Foods',  'PK-LIV-GRN',  'Living Green Leaf Lettuce, rooted clamshell',  600, 0,  600, 'heads', current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50574', 2, 'C10009', 'Lakeside Natural Foods',  'PK-LIV-OAK',  'Living Red Oakleaf, rooted clamshell',         400, 0,  400, 'heads', current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50574', 3, 'C10009', 'Lakeside Natural Foods',  'PK-MIC-PEA',  'Microgreens Pea Shoots 4 oz / 1 lb',            15, 0,   15, 'lbs',   current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50579', 1, 'C10021', 'Fresh Bowl Kitchens',     'PK-MIC-MIX',  'Microgreens Bluestem Rainbow Mix 4 oz',          8, 0,    8, 'lbs',   current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50579', 2, 'C10021', 'Fresh Bowl Kitchens',     'PK-LIV-BUT',  'Living Butter Lettuce, rooted clamshell',       48, 0,   48, 'heads', current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50579', 3, 'C10021', 'Fresh Bowl Kitchens',     'PK-HRB-BAS',  'Living Basil, potted sleeve',                   36, 0,   36, 'heads', current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50582', 1, 'C10026', 'Pantry Prime Meal Kits',  'PK-LIV-BUT',  'Living Butter Lettuce, rooted clamshell',      800, 0,  800, 'heads', current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50582', 2, 'C10026', 'Pantry Prime Meal Kits',  'PK-BBY-ARUG', 'Baby Arugula 1 lb clamshell',                   60, 0,   60, 'lbs',   current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50582', 3, 'C10026', 'Pantry Prime Meal Kits',  'PK-BBY-KALE', 'Baby Kale Mix 1 lb clamshell',                  50, 0,   50, 'lbs',   current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50588', 1, 'C10007', 'Summit Club Stores',      'PK-LIV-BUT',  'Living Butter Lettuce, rooted clamshell',     1500, 0, 1500, 'heads', current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50588', 2, 'C10007', 'Summit Club Stores',      'PK-LIV-GRN',  'Living Green Leaf Lettuce, rooted clamshell', 1000, 0, 1000, 'heads', current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50588', 3, 'C10007', 'Summit Club Stores',      'PK-CUC-MINI', 'Mini Cucumbers 1 lb bag',                      400, 0,  400, 'Case',  current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50593', 1, 'C10019', 'Campus Dining Partners',  'PK-BBY-SPIN', 'Baby Spinach 1 lb clamshell',                  150, 0,  150, 'lbs',   current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50593', 2, 'C10019', 'Campus Dining Partners',  'PK-ROM-HRT',  'Romaine Hearts 3 ct',                          120, 0,  120, 'Case',  current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50596', 1, 'C10038', 'Windy City Salad Works',  'PK-BBY-SPRM', 'Spring Mix 1 lb clamshell',                    600, 0,  600, 'lbs',   current_date + 2, 'HOL-DC', 'Open'),
  -- Delivered order for history
  ('SO-50462', 1, 'C10002', 'Northwind Foods',         'PK-LIV-BUT',  'Living Butter Lettuce, rooted clamshell',     2400, 2400, 0, 'heads', current_date - 3, 'HOL-DC', 'Delivered'),
  ('SO-50462', 2, 'C10002', 'Northwind Foods',         'PK-BBY-SPRM', 'Spring Mix 1 lb clamshell',                    240,  240, 0, 'lbs',   current_date - 3, 'HOL-DC', 'Delivered'),
  ('SO-50462', 3, 'C10002', 'Northwind Foods',         'PK-MIC-PEA',  'Microgreens Pea Shoots 4 oz / 1 lb',            40,   40, 0, 'lbs',   current_date - 3, 'HOL-DC', 'Delivered');

-- -----------------------------------------------
-- D365 PRODUCTION ORDERS — greenhouse pack orders at HOL-GH; salad kits at GRP
-- -----------------------------------------------
insert into d365_production_orders (d365_prod_order_id, item_number, item_name, order_quantity, remaining_quantity, unit, status, scheduled_start_date, scheduled_end_date, warehouse_id, site_id) values
  ('PRD-91001', 'PK-LIV-BUT',    'Living Butter Lettuce, rooted clamshell',     2400, 2400, 'heads', 'Released',  current_date,      current_date + 1,  'HOL-GH', 'HOL'),
  ('PRD-91002', 'PK-LIV-GRN',    'Living Green Leaf Lettuce, rooted clamshell', 1800, 1800, 'heads', 'Released',  current_date,      current_date + 1,  'HOL-GH', 'HOL'),
  ('PRD-91003', 'PK-BBY-SPRM',   'Spring Mix 1 lb clamshell',                    240,  240, 'lbs',   'Released',  current_date,      current_date + 1,  'HOL-GH', 'HOL'),
  ('PRD-91004', 'PK-MIC-PEA',    'Microgreens Pea Shoots 4 oz / 1 lb',            60,   18, 'lbs',   'Started',   current_date - 1,  current_date,      'HOL-GH', 'HOL'),
  ('PRD-91005', 'PK-MIC-SUN',    'Microgreens Sunflower 4 oz / 1 lb',             45,   45, 'lbs',   'Scheduled', current_date,      current_date + 1,  'HOL-GH', 'HOL'),
  ('PRD-91006', 'PK-HRB-BAS',    'Living Basil, potted sleeve',                  400,  400, 'heads', 'Scheduled', current_date + 10, current_date + 12, 'HOL-GH', 'HOL'),
  ('PRD-91007', 'PK-BBY-ARUG',   'Baby Arugula 1 lb clamshell',                  180,  180, 'lbs',   'Scheduled', current_date + 5,  current_date + 6,  'HOL-GH', 'HOL'),
  ('PRD-91008', 'PK-CUC-MINI',   'Mini Cucumbers 1 lb bag',                      600,  600, 'Case',  'Released',  current_date + 1,  current_date + 1,  'HOL-GH', 'HOL'),
  ('PRD-90627', 'FC-SAL-GARDEN', 'Garden Salad Kit 10 oz',                      1200, 1200, 'Case',  'Scheduled', current_date + 2,  current_date + 2,  'GRP-RM', 'GRP'),
  ('PRD-90580', 'FC-SAL-CAESAR', 'Caesar Salad Kit 10 oz',                       900,    0, 'Case',  'Ended',     current_date - 1,  current_date - 1,  'GRP-RM', 'GRP');

-- -----------------------------------------------
-- D365 INVENTORY ON-HAND
-- -----------------------------------------------
insert into d365_inventory_onhand (item_number, warehouse_id, site_id, available_physical, available_ordered, total_available, unit, batch_number) values
  ('PK-LIV-BUT',  'HOL-DC', 'HOL', 2400, 1200, 3600, 'heads', 'BT-' || to_char(current_date - 10, 'YYYYMMDD') || '-01'),
  ('PK-LIV-GRN',  'HOL-DC', 'HOL',  400,  600, 1000, 'heads', 'BT-' || to_char(current_date - 8,  'YYYYMMDD') || '-01'),
  ('PK-LIV-OAK',  'HOL-DC', 'HOL',    0,  400,  400, 'heads', null),
  ('PK-LIV-RED',  'HOL-DC', 'HOL',    0,    0,    0, 'heads', null),
  ('PK-BBY-SPRM', 'HOL-DC', 'HOL',  240,  100,  340, 'lbs',   'BT-' || to_char(current_date - 7,  'YYYYMMDD') || '-02'),
  ('PK-BBY-ARUG', 'HOL-GH', 'HOL',  280,   60,  340, 'lbs',   'BT-' || to_char(current_date - 5,  'YYYYMMDD') || '-01'),
  ('PK-BBY-SPIN', 'HOL-GH', 'HOL',    0,  150,  150, 'lbs',   null),
  ('PK-BBY-KALE', 'HOL-GH', 'HOL',    0,   50,   50, 'lbs',   null),
  ('PK-HRB-BAS',  'HOL-GH', 'HOL',  120,  336,  456, 'heads', 'BT-' || to_char(current_date - 6,  'YYYYMMDD') || '-01'),
  ('PK-MIC-PEA',  'HOL-DC', 'HOL',   42,   15,   57, 'lbs',   'BT-' || to_char(current_date,      'YYYYMMDD') || '-01'),
  ('PK-MIC-SUN',  'HOL-DC', 'HOL',   55,    0,   55, 'lbs',   'BT-' || to_char(current_date - 3,  'YYYYMMDD') || '-01'),
  ('PK-MIC-RAD',  'HOL-GH', 'HOL',    0,    0,    0, 'lbs',   null),
  ('PK-MIC-MIX',  'HOL-DC', 'HOL',   12,    8,   20, 'lbs',   'BT-' || to_char(current_date - 4,  'YYYYMMDD') || '-01'),
  ('PK-CUC-MINI', 'HOL-DC', 'HOL', 1860,  400, 2260, 'Case',  'BT-' || to_char(current_date - 1,  'YYYYMMDD') || '-03'),
  ('PK-ROM-HRT',  'HOL-DC', 'HOL',  640,  120,  760, 'Case',  'BT-' || to_char(current_date - 3,  'YYYYMMDD') || '-02'),
  ('PK-BBY-SPRM', 'GRP-RM', 'GRP',   18,    0,   18, 'lbs',   'BT-' || to_char(current_date - 7,  'YYYYMMDD') || '-02');

-- -----------------------------------------------
-- D365 ENTITY MAPPINGS — crop → packed item; bay → HOL-GH
-- -----------------------------------------------
insert into d365_entity_mappings (local_entity_type, local_entity_id, d365_entity_type, d365_entity_ref)
select 'crop', c.id, 'product', m.item_number
from crops c
join (values
  ('Living Butter Lettuce',     'PK-LIV-BUT'),
  ('Living Green Leaf Lettuce', 'PK-LIV-GRN'),
  ('Living Red Leaf Lettuce',   'PK-LIV-RED'),
  ('Living Romaine Hearts',     'PK-ROM-HRT'),
  ('Living Red Oakleaf',        'PK-LIV-OAK'),
  ('Baby Arugula',              'PK-BBY-ARUG'),
  ('Baby Spinach',              'PK-BBY-SPIN'),
  ('Spring Mix',                'PK-BBY-SPRM'),
  ('Baby Kale Mix',             'PK-BBY-KALE'),
  ('Living Basil',              'PK-HRB-BAS'),
  ('Living Cilantro',           'PK-HRB-CIL'),
  ('Living Mint',               'PK-HRB-MNT'),
  ('Living Dill',               'PK-HRB-DIL'),
  ('Microgreens — Pea Shoots',  'PK-MIC-PEA'),
  ('Microgreens — Sunflower',   'PK-MIC-SUN'),
  ('Microgreens — Radish',      'PK-MIC-RAD'),
  ('Microgreens — Rainbow Mix', 'PK-MIC-MIX'),
  ('Mini Cucumbers',            'PK-CUC-MINI')
) as m(crop_name, item_number) on m.crop_name = c.name;

insert into d365_entity_mappings (local_entity_type, local_entity_id, d365_entity_type, d365_entity_ref)
select 'field', f.id, 'warehouse', 'HOL-GH' from fields f;

-- -----------------------------------------------
-- RECONCILIATION — row counts and tie-outs (the SQL editor shows this result)
-- -----------------------------------------------
select 'fields (active / total)'        as metric, count(*) filter (where status <> 'idle') || ' / ' || count(*) as value from fields
union all select 'crops',                        count(*)::text from crops
union all select 'crops short lead-time (≤48h)', count(*)::text from crops where is_short_lead_time
union all select 'team_members',                 count(*)::text from team_members
union all select 'grow_cycles by phase',         string_agg(phase || '=' || n, ', ' order by phase) from (select phase, count(*) n from grow_cycles group by phase) p
union all select 'harvest_schedules by status',  string_agg(status || '=' || n, ', ' order by status) from (select status, count(*) n from harvest_schedules group by status) s
union all select 'schedule members',             count(*)::text from harvest_schedule_members
union all select 'yield by unit',                string_agg(unit_of_measure || '=' || q, ', ' order by unit_of_measure) from (select unit_of_measure, sum(quantity)::bigint q from yield_records group by unit_of_measure) u
union all select 'yield lbs by grade',           string_agg(grade || '=' || q, ', ' order by grade) from (select grade, sum(quantity)::bigint q from yield_records where unit_of_measure = 'lbs' group by grade) g
union all select 'd365_sync_queue by status',    string_agg(status || '=' || n, ', ' order by status) from (select status, count(*) n from d365_sync_queue group by status) q
union all select 'd365_products',                count(*)::text from d365_products
union all select 'd365_customers',               count(*)::text from d365_customers
union all select 'd365_warehouses',              count(*)::text from d365_warehouses
union all select 'd365_sales_orders lines (open remaining)', count(*) || ' (' || sum(remaining_quantity)::bigint || ')' from d365_sales_orders
union all select 'd365_production_orders',       count(*)::text from d365_production_orders
union all select 'd365_inventory_onhand rows',   count(*)::text from d365_inventory_onhand
union all select 'crop mappings (unmapped crops)', count(*) || ' (' || (select count(*) from crops c where not exists (select 1 from d365_entity_mappings m where m.local_entity_type = 'crop' and m.local_entity_id = c.id)) || ')' from d365_entity_mappings where local_entity_type = 'crop'
union all select 'field mappings (unmapped fields)', count(*) || ' (' || (select count(*) from fields f where not exists (select 1 from d365_entity_mappings m where m.local_entity_type = 'field' and m.local_entity_id = f.id)) || ')' from d365_entity_mappings where local_entity_type = 'field';
