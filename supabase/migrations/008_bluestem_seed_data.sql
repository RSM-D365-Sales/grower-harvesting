-- ============================================================
-- Migration 008 — Bluestem Fresh Produce demo seed
--
-- Source of truth for every demo figure in this app. Built from the Bluestem
-- data pack in ../Blustem-company-details (Bluestem_Brand_v2_and_Data.zip):
--   growers.csv, grower_blocks.csv, harvest_events.csv, items.csv, sites.csv,
--   customers.csv, employees.csv, production_orders.csv
-- Bluestem, its growers, and every customer below are fictional; every figure
-- is synthetic.
--
-- How the app's model maps to Bluestem's business:
--   fields        = contracted grower blocks (BlockId from grower_blocks.csv),
--                   the CA/AZ/MX winter-program partners, and two
--                   protected-culture houses (B0090/B0091, added for the
--                   shoulder-season greenhouse story — not in the pack).
--   crops         = the pack's 10 crops x variety. target_yield_per_acre is the
--                   pack's EstimatedYield / Acres ratio converted to lbs with the
--                   pack's unit weight (bushel 42/48/40/28 lb, flat 9 lb,
--                   bin 900 lb, crate 28/50 lb, lug 25 lb, carton 40 lb) —
--                   consistent with the pack, not an agronomic benchmark.
--   team_members  = Bluestem field staff (employees.csv) + the harvest crews
--                   named in harvest_events.csv (Crew A/B/C, Mechanical).
--   yield_records = lbs (the app's canonical unit). The pack's trade unit,
--                   grade, crew, and load ticket ride along in notes.
--                   Grade map: A = US Fancy, B = US #1, C = US #2 / Processing.
--   d365_*        = items.csv (RAW-*, PK-*, FC-*), sites.csv as warehouses,
--                   customers.csv, production_orders.csv (GRP fresh-cut lines).
--
-- Dates are relative to current_date so the demo never goes stale. The pack's
-- "today" was 2026-09-17 — late-season Michigan: apples, squash, peppers,
-- cucumbers, zucchini and the last sweet corn in harvest; berries, cherries and
-- asparagus complete; winter-program romaine and cucumbers being planted.
--
-- Replaces migration 006 (Farmbox). Re-runnable: clears the demo tables first.
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

-- -----------------------------------------------
-- APP USERS — demo personas (employees.csv)
-- -----------------------------------------------
update app_users set is_active = false
where email in ('admin@grower.local', 'operator@grower.local');

insert into app_users (email, full_name, role, is_active) values
  ('sam.fischer@bluestemfresh.com',   'Sam Fischer',   'manager',  true),   -- Grower Relations Mgr
  ('ingrid.larsen@bluestemfresh.com', 'Ingrid Larsen', 'operator', true),   -- Field Agronomist
  ('rosa.delgado@bluestemfresh.com',  'Rosa Delgado',  'operator', true)    -- Buyer - Produce
on conflict (email) do update
  set full_name = excluded.full_name, role = excluded.role, is_active = true;

-- -----------------------------------------------
-- TEAM MEMBERS — field staff + harvest crews
-- -----------------------------------------------
insert into team_members (full_name, role, email, phone) values
  ('Sam Fischer',                    'field_manager',     'sam.fischer@bluestemfresh.com',     '(616) 555-0141'),
  ('Ingrid Larsen',                  'field_manager',     'ingrid.larsen@bluestemfresh.com',   '(616) 555-0142'),
  ('Rosa Delgado',                   'planner',           'rosa.delgado@bluestemfresh.com',    '(616) 555-0143'),
  ('Ben Carter',                     'planner',           'ben.carter@bluestemfresh.com',      '(616) 555-0144'),
  ('Sofia Ruiz',                     'quality_inspector', 'sofia.ruiz@bluestemfresh.com',      '(616) 555-0145'),
  ('Yara Sato',                      'driver',            'yara.sato@bluestemfresh.com',       '(616) 555-0146'),
  ('Mateo Alvarez (Crew A lead)',    'harvester',         'mateo.alvarez@bluestemfresh.com',   '(616) 555-0151'),
  ('Josie Vanderberg (Crew B lead)', 'harvester',         'josie.vanderberg@bluestemfresh.com','(616) 555-0152'),
  ('Luis Ortega (Crew C lead)',      'harvester',         'luis.ortega@bluestemfresh.com',     '(616) 555-0153'),
  ('Dale Brinks (Mechanical)',       'harvester',         'dale.brinks@bluestemfresh.com',     '(616) 555-0154');

-- -----------------------------------------------
-- FIELDS — grower blocks (grower_blocks.csv) + winter program + protected culture
-- -----------------------------------------------
insert into fields (name, location, area_acres, soil_type, status) values
  -- Apples (Sep–Oct window)
  ('Vander Molen Farms · West Block 3',      'B0003 · Newaygo, MI',          18.9, 'Sandy loam',        'harvesting'),
  ('Van Dyke Vegetable Co. · North Block 2', 'B0043 · Sparta, MI',           20.2, 'Loam',              'harvest_ready'),
  ('Pine Grove Produce · Hill Block 1',      'B0053 · Suttons Bay, MI',      72.1, 'Sandy loam',        'harvesting'),
  ('North Branch Farms · East Block 2',      'B0057 · Hartford, MI',         27.7, 'Loam',              'harvest_ready'),
  ('North Branch Farms · Hill Block 1',      'B0056 · Hartford, MI',         15.2, 'Loam',              'growing'),
  -- Butternut squash (Sep–Oct window)
  ('Peterson Cherry Orchards · Home Block 1','B0045 · Fennville, MI',       140.0, 'Sandy loam',        'harvest_ready'),
  ('Hillcrest Family Farms · East Block 3',  'B0014 · South Haven, MI',      13.8, 'Clay loam',         'harvesting'),
  ('DeBoer Asparagus Co. · Creek Block 4',   'B0019 · Conklin, MI',          96.4, 'Loam',              'growing'),
  -- Bell peppers (Aug–Sep window)
  ('Copper Beech Orchards · North Block 1',  'B0060 · Shelby, MI',           88.1, 'Sandy loam',        'harvest_ready'),
  ('Kowalczyk Orchards · Road Block 3',      'B0007 · Fremont, MI',          18.5, 'Loam',              'harvesting'),
  ('Sandhill Farms · Creek Block 1',         'B0066 · Shelby, MI',           42.7, 'Sandy loam',        'growing'),
  -- Cucumbers, sweet corn, zucchini, romaine (Jul–Sep window)
  ('Lakeview Orchard LLC · Creek Block 3',   'B0027 · Traverse City, MI',    58.2, 'Sandy loam',        'harvesting'),
  ('Lakeview Orchard LLC · Creek Block 1',   'B0025 · Traverse City, MI',    41.5, 'Loam',              'harvest_ready'),
  ('Silver Lake Farms · Road Block 2',       'B0048 · South Haven, MI',      71.0, 'Sandy loam',        'harvesting'),
  ('Vander Molen Farms · Creek Block 2',     'B0002 · Newaygo, MI',          20.5, 'Muck',              'harvesting'),
  -- Protected culture — shoulder-season program (not in the pack; B0090/B0091)
  ('Heritage Row Growers · Hoop House 1',    'B0090 · Hartford, MI · protected culture',   1.2, 'Raised bed · drip', 'growing'),
  ('Evergreen Valley Growers · High Tunnel 2','B0091 · Belding, MI · protected culture',   0.8, 'Raised bed · drip', 'field_prep'),
  -- Winter program partners
  ('Salinas Valley Greens · West Block 2',   'B0081 · Salinas, CA · Winter Program',     267.0, 'Clay loam',         'planted'),
  ('Baja Fresca S.A. · North Block 2',       'B0085 · Ensenada, MX · Winter Program',    234.0, 'Sandy loam',        'growing'),
  -- Season complete
  ('Thornapple Acres · East Block 1',        'B0020 · Belding, MI',          82.2, 'Sandy loam',        'complete'),
  ('Ridgeline Berries · North Block 1',      'B0034 · Conklin, MI',          46.1, 'Loam',              'complete'),
  ('Bakker Blueberries · Creek Block 3',     'B0011 · Lawton, MI',           59.6, 'Sandy loam',        'idle');

-- -----------------------------------------------
-- CROPS — crop x variety from the pack; lead time = hours field-to-cooler
-- -----------------------------------------------
insert into crops (name, variety, avg_grow_days, lead_time_hours, unit_of_measure, target_yield_per_acre) values
  ('Apples',           'Honeycrisp',    140,  72, 'lbs',  4410),
  ('Apples',           'Gala',          125,  72, 'lbs',  4620),
  ('Apples',           'Fuji',          155,  72, 'lbs',  4620),
  ('Apples',           'Jonagold',      140,  72, 'lbs',  4660),
  ('Blueberries',      'Duke',           70,   8, 'lbs',  4600),
  ('Blueberries',      'Elliott',        90,   8, 'lbs',  3950),
  ('Asparagus',        'Jersey Giant',   45,   8, 'lbs',  7360),
  ('Cucumbers',        'Slicer',         55,  24, 'lbs',  1940),
  ('Cucumbers',        'Pickling',       50,  24, 'lbs',  1610),
  ('Zucchini',         'Dark Green',     45,  24, 'lbs',  1210),
  ('Sweet Corn',       'Bicolor',        75,   6, 'lbs',  1060),
  ('Sweet Corn',       'Yellow',         78,   6, 'lbs',   950),
  ('Tart Cherries',    'Montmorency',    70,  12, 'lbs', 13950),
  ('Butternut Squash', 'Waltham',       100, 120, 'lbs',   950),
  ('Bell Peppers',     'Green',          75,  36, 'lbs',  2120),
  ('Bell Peppers',     'Red',            90,  36, 'lbs',  1880),
  ('Romaine',          'Full Head',      70,  12, 'lbs',  3200),
  ('Romaine',          'Hearts',         65,  12, 'lbs',  2950);

-- -----------------------------------------------
-- GROW CYCLES — one per block
-- -----------------------------------------------
insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 160, current_date - 140, current_date - 6, current_date - 6,
  'Second pick underway — Crew B · bins to HRT cooler 2'
from fields f, crops c where f.name = 'Vander Molen Farms · West Block 3' and c.name = 'Apples' and c.variety = 'Honeycrisp';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvest_ready', current_date - 160, current_date - 140, current_date + 1, null,
  'Starch-iodine 4.5 · brix 13.8 — first pick this week'
from fields f, crops c where f.name = 'Van Dyke Vegetable Co. · North Block 2' and c.name = 'Apples' and c.variety = 'Honeycrisp';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 150, current_date - 135, current_date - 10, current_date - 10,
  'Daily picks · Crew A + grower crew · 72 ac, largest Gala block'
from fields f, crops c where f.name = 'Pine Grove Produce · Hill Block 1' and c.name = 'Apples' and c.variety = 'Gala';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvest_ready', current_date - 165, current_date - 150, current_date + 2, null,
  'Color check passed · ethylene / starch test scheduled'
from fields f, crops c where f.name = 'North Branch Farms · East Block 2' and c.name = 'Apples' and c.variety = 'Fuji';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'growing', current_date - 165, current_date - 150, current_date + 12, null,
  'Sizing well · target 110 bu/ac'
from fields f, crops c where f.name = 'North Branch Farms · Hill Block 1' and c.name = 'Apples' and c.variety = 'Jonagold';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvest_ready', current_date - 110, current_date - 100, current_date, null,
  'Vines dying back — 900 lb bins staged on Home Block'
from fields f, crops c where f.name = 'Peterson Cherry Orchards · Home Block 1' and c.name = 'Butternut Squash' and c.variety = 'Waltham';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 110, current_date - 100, current_date - 5, current_date - 5,
  'Bin harvest with grower crew · bins to HRT'
from fields f, crops c where f.name = 'Hillcrest Family Farms · East Block 3' and c.name = 'Butternut Squash' and c.variety = 'Waltham';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'growing', current_date - 100, current_date - 90, current_date + 14, null,
  'Late planting · field-cure 10 days before binning'
from fields f, crops c where f.name = 'DeBoer Asparagus Co. · Creek Block 4' and c.name = 'Butternut Squash' and c.variety = 'Waltham';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvest_ready', current_date - 90, current_date - 80, current_date + 1, null,
  'Green pick #3 ready · 88 ac · backing PK-PEP-GRN orders'
from fields f, crops c where f.name = 'Copper Beech Orchards · North Block 1' and c.name = 'Bell Peppers' and c.variety = 'Green';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 90, current_date - 80, current_date - 4, current_date - 4,
  'Mechanical harvest · picks to HRT'
from fields f, crops c where f.name = 'Kowalczyk Orchards · Road Block 3' and c.name = 'Bell Peppers' and c.variety = 'Green';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'growing', current_date - 95, current_date - 85, current_date + 9, null,
  'Holding for full red color · tri-color pack demand'
from fields f, crops c where f.name = 'Sandhill Farms · Creek Block 1' and c.name = 'Bell Peppers' and c.variety = 'Red';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 70, current_date - 60, current_date - 8, current_date - 8,
  'Every-other-day picks · quality holding at US Fancy'
from fields f, crops c where f.name = 'Lakeview Orchard LLC · Creek Block 3' and c.name = 'Cucumbers' and c.variety = 'Slicer';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvest_ready', current_date - 85, current_date - 78, current_date, null,
  'Last planting of the season — silk dry, kernels milky'
from fields f, crops c where f.name = 'Lakeview Orchard LLC · Creek Block 1' and c.name = 'Sweet Corn' and c.variety = 'Bicolor';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 60, current_date - 50, current_date - 12, current_date - 12,
  'Daily picks · 8-inch spec for PK-ZUC-CTN'
from fields f, crops c where f.name = 'Silver Lake Farms · Road Block 2' and c.name = 'Zucchini' and c.variety = 'Dark Green';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'harvesting', current_date - 95, current_date - 75, current_date - 3, current_date - 3,
  'Final fall cut before the winter program takes over romaine'
from fields f, crops c where f.name = 'Vander Molen Farms · Creek Block 2' and c.name = 'Romaine' and c.variety = 'Full Head';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'growing', current_date - 40, current_date - 30, current_date + 25, null,
  'Shoulder-season hearts under cover · drip · row cover staged for first frost'
from fields f, crops c where f.name = 'Heritage Row Growers · Hoop House 1' and c.name = 'Romaine' and c.variety = 'Hearts';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'field_prep', current_date - 2, null, null, null,
  'Bed prep and drip lines for fall tunnel cucumbers'
from fields f, crops c where f.name = 'Evergreen Valley Growers · High Tunnel 2' and c.name = 'Cucumbers' and c.variety = 'Slicer';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'planting', current_date - 12, current_date - 3, current_date + 67, null,
  'Winter program · Salinas · ships via SAL cross-dock'
from fields f, crops c where f.name = 'Salinas Valley Greens · West Block 2' and c.name = 'Romaine' and c.variety = 'Full Head';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'growing', current_date - 45, current_date - 35, current_date + 20, null,
  'Winter program · Ensenada · protected tunnels'
from fields f, crops c where f.name = 'Baja Fresca S.A. · North Block 2' and c.name = 'Cucumbers' and c.variety = 'Slicer';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'complete', current_date - 120, current_date - 100, current_date - 60, current_date - 58,
  'Season complete · 42,074 flats est. · settled'
from fields f, crops c where f.name = 'Thornapple Acres · East Block 1' and c.name = 'Blueberries' and c.variety = 'Duke';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'complete', current_date - 110, current_date - 95, current_date - 65, current_date - 63,
  'Montmorency shake complete · processing grade to Orchard Lane'
from fields f, crops c where f.name = 'Ridgeline Berries · North Block 1' and c.name = 'Tart Cherries' and c.variety = 'Montmorency';

insert into grow_cycles (field_id, crop_id, phase, field_prep_date, planting_date, expected_harvest_date, actual_harvest_date, notes)
select f.id, c.id, 'complete', current_date - 150, current_date - 140, current_date - 110, current_date - 108,
  'Spring season complete · fern stage · block idle until May'
from fields f, crops c where f.name = 'Bakker Blueberries · Creek Block 3' and c.name = 'Asparagus' and c.variety = 'Jersey Giant';

-- -----------------------------------------------
-- HARVEST SCHEDULES — one per active block (each block has one cycle)
-- -----------------------------------------------
insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + 1, '06:30'::time, '15:00'::time, 'scheduled', 'First pick · Crew A · bins to HRT cooler 2'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Van Dyke Vegetable Co. · North Block 2';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date, '07:00'::time, '16:00'::time, 'scheduled', 'Bin harvest · grower crew + Crew C · load tickets to HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Peterson Cherry Orchards · Home Block 1';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + 1, '06:00'::time, '13:00'::time, 'scheduled', 'Green pick #3 · mechanical · PK-PEP-GRN order backing'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Copper Beech Orchards · North Block 1';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date, '05:30'::time, '09:30'::time, 'scheduled', 'Dawn pick · hydrocool at HRT within 2 hrs'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Lakeview Orchard LLC · Creek Block 1';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + 2, '07:00'::time, '15:00'::time, 'scheduled', 'Color pick · Crew B'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'North Branch Farms · East Block 2';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + 1, '06:00'::time, '11:00'::time, 'scheduled', 'Daily pick · Crew B'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Silver Lake Farms · Road Block 2';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date + 1, '06:00'::time, '12:00'::time, 'scheduled', 'Mechanical pick · Dale · to HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Kowalczyk Orchards · Road Block 3';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date, '06:30'::time, '15:00'::time, 'in_progress', 'Second pick · Crew B · sorting US Fancy / US #1 at the bin'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Vander Molen Farms · West Block 3';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date, '06:00'::time, '15:30'::time, 'in_progress', 'Daily pick · Crew A + grower crew'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Pine Grove Produce · Hill Block 1';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date - 1, '05:00'::time, '11:00'::time, 'completed', 'Final cut complete · 894 cartons → HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Vander Molen Farms · Creek Block 2';

insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date - 2, '06:00'::time, '12:00'::time, 'completed', 'Pick #6 · 458 bu US Fancy · LT-373196'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Lakeview Orchard LLC · Creek Block 3';

-- A cancelled pick (shows the Reopen action)
insert into harvest_schedules (grow_cycle_id, scheduled_date, start_time, end_time, status, notes)
select gc.id, current_date - 1, '07:00'::time, '15:00'::time, 'cancelled', 'Rain — bin trailer could not get onto the block; reschedule'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Hillcrest Family Farms · East Block 3';

-- -----------------------------------------------
-- HARVEST SCHEDULE MEMBERS — crews and staff
-- -----------------------------------------------
insert into harvest_schedule_members (harvest_schedule_id, team_member_id, role_in_harvest)
select hs.id, tm.id, x.role_in_harvest
from (values
  ('Van Dyke Vegetable Co. · North Block 2',  'Sam Fischer',                    'lead'),
  ('Van Dyke Vegetable Co. · North Block 2',  'Mateo Alvarez (Crew A lead)',    'harvester'),
  ('Van Dyke Vegetable Co. · North Block 2',  'Sofia Ruiz',                     'quality_check'),
  ('Peterson Cherry Orchards · Home Block 1', 'Luis Ortega (Crew C lead)',      'harvester'),
  ('Peterson Cherry Orchards · Home Block 1', 'Yara Sato',                      'delivery'),
  ('Copper Beech Orchards · North Block 1',   'Ingrid Larsen',                  'lead'),
  ('Copper Beech Orchards · North Block 1',   'Dale Brinks (Mechanical)',       'harvester'),
  ('Lakeview Orchard LLC · Creek Block 1',    'Josie Vanderberg (Crew B lead)', 'harvester'),
  ('Lakeview Orchard LLC · Creek Block 1',    'Yara Sato',                      'delivery'),
  ('North Branch Farms · East Block 2',       'Josie Vanderberg (Crew B lead)', 'harvester'),
  ('Silver Lake Farms · Road Block 2',        'Josie Vanderberg (Crew B lead)', 'harvester'),
  ('Kowalczyk Orchards · Road Block 3',       'Dale Brinks (Mechanical)',       'harvester'),
  ('Vander Molen Farms · West Block 3',       'Josie Vanderberg (Crew B lead)', 'harvester'),
  ('Vander Molen Farms · West Block 3',       'Sofia Ruiz',                     'quality_check'),
  ('Pine Grove Produce · Hill Block 1',       'Sam Fischer',                    'lead'),
  ('Pine Grove Produce · Hill Block 1',       'Mateo Alvarez (Crew A lead)',    'harvester')
) as x(field_name, member_name, role_in_harvest)
join fields f on f.name = x.field_name
join grow_cycles gc on gc.field_id = f.id
join harvest_schedules hs on hs.grow_cycle_id = gc.id
join team_members tm on tm.full_name = x.member_name;

-- -----------------------------------------------
-- YIELD RECORDS — lbs; pack unit / grade / crew / load ticket in notes
-- (quantities are harvest_events.csv picks x pack unit weight)
-- -----------------------------------------------
-- Tied to completed / in-progress picks
insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, 35760, 'lbs', 'B', now() - interval '1 day', 'US #1 · 894 cartons (24 ct) · Mechanical · LT-420147 → HRT'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Vander Molen Farms · Creek Block 2';

insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, 21984, 'lbs', 'A', now() - interval '2 days', 'US Fancy · 458 bu (48 lb) · Crew B · LT-373196 → HRT'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Lakeview Orchard LLC · Creek Block 3';

insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, 11508, 'lbs', 'B', now() - interval '3 hours', 'US #1 · 274 bu (42 lb) · brix 11.3 · Crew B · LT-778828 → HRT'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Vander Molen Farms · West Block 3';

insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, 12558, 'lbs', 'C', now() - interval '2 hours', 'US #2 · 299 bu (42 lb) · brix 15.4 · Crew C · LT-125171 → HRT'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Vander Molen Farms · West Block 3';

insert into yield_records (grow_cycle_id, harvest_schedule_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, hs.id, 62580, 'lbs', 'A', now() - interval '1 hour', 'US Fancy · 1,490 bu (42 lb) · brix 15.9 · Crew A · LT-915265 → HRT'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Pine Grove Produce · Hill Block 1';

-- Standalone picks (no schedule row)
insert into yield_records (grow_cycle_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, 17400, 'lbs', 'A', now() - interval '3 days', 'US Fancy · 435 bu (40 lb) · Crew B · LT-993600 → HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Silver Lake Farms · Road Block 2';

insert into yield_records (grow_cycle_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, 7616, 'lbs', 'B', now() - interval '5 days', 'US #1 · 272 bu (28 lb) · Grower crew · LT-899020 → HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Kowalczyk Orchards · Road Block 3';

insert into yield_records (grow_cycle_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, 6300, 'lbs', 'B', now() - interval '6 days', 'US #1 · 7 bins (900 lb) · Crew B · LT-793843 → HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Hillcrest Family Farms · East Block 3';

insert into yield_records (grow_cycle_id, quantity, unit_of_measure, grade, recorded_at, notes)
select gc.id, 69732, 'lbs', 'B', now() - interval '60 days', 'US #1 · 7,748 flats (12 pt) · brix 13.0 · Crew B · LT-959285 → HRT'
from grow_cycles gc join fields f on gc.field_id = f.id where f.name = 'Thornapple Acres · East Block 1';

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
  jsonb_build_object('block', f.name, 'crop', 'Romaine · Full Head', 'action', 'ReportAsFinished', 'prodOrder', 'PRD-90509'),
  'synced', 1, now() - interval '20 hours'
from harvest_schedules hs join grow_cycles gc on hs.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Vander Molen Farms · Creek Block 2';

insert into d365_sync_queue (entity_type, entity_id, payload, status, attempts, last_error)
select 'yield', yr.id,
  jsonb_build_object('quantity', yr.quantity, 'grade', yr.grade, 'unit', yr.unit_of_measure, 'notes', yr.notes),
  'failed', 2, 'InventoryJournalLines: item RAW-CUC has no active cost at warehouse HRT-PK for batch LT-373196'
from yield_records yr join grow_cycles gc on yr.grow_cycle_id = gc.id join fields f on gc.field_id = f.id
where f.name = 'Lakeview Orchard LLC · Creek Block 3';

-- -----------------------------------------------
-- D365 PRODUCTS — items.csv (RAW-* raw produce, PK-* packed fresh, FC-* fresh-cut)
-- RAW-APL-FJ / RAW-APL-JG extend the pack so every apple variety has a raw item.
-- -----------------------------------------------
insert into d365_products (d365_item_number, product_name, product_type, item_group, inventory_unit, sales_unit, sales_price, standard_cost, tracking_dimension_group, shelf_life_days, buyer_group) values
  ('RAW-APL-HC', 'Apples, Honeycrisp, bulk bin',      'Item', 'Raw Produce · Apples',       'Bin',    'Bin',    null,  20.37, 'Batch', 120, 'Produce'),
  ('RAW-APL-GA', 'Apples, Gala, bulk bin',            'Item', 'Raw Produce · Apples',       'Bin',    'Bin',    null,   6.79, 'Batch', 120, 'Produce'),
  ('RAW-APL-FJ', 'Apples, Fuji, bulk bin',            'Item', 'Raw Produce · Apples',       'Bin',    'Bin',    null,  14.20, 'Batch', 120, 'Produce'),
  ('RAW-APL-JG', 'Apples, Jonagold, bulk bin',        'Item', 'Raw Produce · Apples',       'Bin',    'Bin',    null,   9.40, 'Batch', 120, 'Produce'),
  ('RAW-BLU',    'Blueberries, bulk flat',            'Item', 'Raw Produce · Berries',      'Flat',   'Flat',   null,   8.65, 'Batch',  14, 'Produce'),
  ('RAW-ASP',    'Asparagus, bulk crate',             'Item', 'Raw Produce · Vegetables',   'Crate',  'Crate',  null,  16.28, 'Batch',  14, 'Produce'),
  ('RAW-CUC',    'Cucumbers, bulk bushel',            'Item', 'Raw Produce · Vegetables',   'Bushel', 'Bushel', null,  18.11, 'Batch',  14, 'Produce'),
  ('RAW-ZUC',    'Zucchini, bulk bushel',             'Item', 'Raw Produce · Vegetables',   'Bushel', 'Bushel', null,   6.70, 'Batch',  10, 'Produce'),
  ('RAW-CRN',    'Sweet Corn, bulk crate',            'Item', 'Raw Produce · Vegetables',   'Crate',  'Crate',  null,   8.13, 'Batch',   5, 'Produce'),
  ('RAW-CHR',    'Tart Cherries, lug',                'Item', 'Raw Produce · Cherries',     'Lug',    'Lug',    null,  20.55, 'Batch',   7, 'Produce'),
  ('RAW-SQB',    'Butternut Squash, bulk bin',        'Item', 'Raw Produce · Vegetables',   'Bin',    'Bin',    null,  18.46, 'Batch',  90, 'Produce'),
  ('RAW-PEP',    'Bell Peppers, bulk bushel',         'Item', 'Raw Produce · Vegetables',   'Bushel', 'Bushel', null,  22.62, 'Batch',  14, 'Produce'),
  ('RAW-ROM',    'Romaine, bulk carton',              'Item', 'Raw Produce · Leafy Greens', 'Carton', 'Carton', null,  16.34, 'Batch',  14, 'Produce'),
  ('PK-APL-HC-3LB',   'Honeycrisp Apples 3 lb pouch',        'Item', 'Packed Fresh · Apples',     'Case', 'Case', 22.50, 15.80, 'Batch', 45, 'Produce'),
  ('PK-APL-GA-3LB',   'Gala Apples 3 lb pouch',              'Item', 'Packed Fresh · Apples',     'Case', 'Case', 18.75, 13.40, 'Batch', 45, 'Produce'),
  ('PK-APL-HC-TRAY',  'Honeycrisp Apples 88ct tray',         'Item', 'Packed Fresh · Apples',     'Case', 'Case', 42.00, 29.30, 'Batch', 60, 'Produce'),
  ('PK-BLU-PINT',     'Blueberries pint clamshell',          'Item', 'Packed Fresh · Berries',    'Case', 'Case', 30.00, 21.00, 'Batch', 12, 'Produce'),
  ('PK-CUC-SLC',      'Slicer Cucumbers 24 ct',              'Item', 'Packed Fresh · Vegetables', 'Case', 'Case', 16.80, 11.90, 'Batch', 12, 'Produce'),
  ('PK-ZUC-CTN',      'Zucchini 20 lb carton',               'Item', 'Packed Fresh · Vegetables', 'Case', 'Case', 19.00, 13.50, 'Batch', 10, 'Produce'),
  ('PK-CRN-4PK',      'Sweet Corn 4-pack tray',              'Item', 'Packed Fresh · Vegetables', 'Case', 'Case', 16.80, 12.00, 'Batch',  5, 'Produce'),
  ('PK-SQB-CTN',      'Butternut Squash 35 lb carton',       'Item', 'Packed Fresh · Vegetables', 'Case', 'Case', 21.00, 14.20, 'Batch', 60, 'Produce'),
  ('PK-PEP-GRN',      'Green Bell Peppers 1-1/9 bu',         'Item', 'Packed Fresh · Vegetables', 'Case', 'Case', 24.00, 17.00, 'Batch', 12, 'Produce'),
  ('PK-ROM-HRT',      'Romaine Hearts 3 ct',                 'Item', 'Packed Fresh · Leafy Greens','Case','Case', 22.80, 16.40, 'Batch', 14, 'Produce'),
  ('FC-APL-SLC-2OZ',  'Apple Slices 2 oz snack cup',         'Item', 'Fresh-Cut · Apples',        'Case', 'Case', 27.60, 17.00, 'Batch', 18, 'Produce'),
  ('FC-APL-DICE-5LB', 'Diced Apples 5 lb foodservice',       'Item', 'Fresh-Cut · Apples',        'Case', 'Case', 37.00, 22.90, 'Batch', 14, 'Produce'),
  ('FC-VEG-SQB-DICE', 'Diced Butternut Squash 12 oz',        'Item', 'Fresh-Cut · Vegetable Blends','Case','Case',24.00, 14.60, 'Batch', 12, 'Produce'),
  ('FC-CRN-KERNEL',   'Cut Sweet Corn Kernels 2 lb',         'Item', 'Fresh-Cut · Vegetable Blends','Case','Case',26.40, 15.90, 'Batch',  7, 'Produce'),
  ('FC-SAL-ROM-CHOP', 'Chopped Romaine 2 lb foodservice',    'Item', 'Fresh-Cut · Salads',        'Case', 'Case', 26.40, 16.50, 'Batch', 12, 'Produce');

-- -----------------------------------------------
-- D365 CUSTOMERS — customers.csv (segments, terms)
-- -----------------------------------------------
insert into d365_customers (d365_customer_account, customer_name, customer_group, currency_code, payment_terms, delivery_mode, primary_contact) values
  ('C10001', 'Great Lakes Grocers',         'Retail - Grocery',        'USD', 'Net 21',        'Reefer truck',    'Produce Buyer · Grand Rapids, MI'),
  ('C10002', 'Northwind Foods',             'Retail - Grocery',        'USD', 'Net 30',        'Reefer truck',    'Produce Category Mgr · Columbus, OH'),
  ('C10007', 'Summit Club Stores',          'Retail - Club',           'USD', 'Net 30',        'Reefer truck',    'Club Produce Buyer · Chicago, IL'),
  ('C10008', 'ValuePoint Mass Retail',      'Retail - Mass',           'USD', '2% 10 Net 30',  'Reefer truck',    'Replenishment Buyer · Minneapolis, MN'),
  ('C10011', 'Midwest Foodservice Supply',  'Foodservice Distributor', 'USD', 'Net 21',        'Reefer truck',    'Produce Procurement · Chicago, IL'),
  ('C10024', 'Orchard Lane Cider Co.',      'Processor',               'USD', 'Net 21',        'Customer pickup', 'Fruit Buyer · Traverse City, MI'),
  ('C10038', 'Windy City Salad Works',      'Processor',               'USD', '2% 10 Net 30',  'Reefer truck',    'Raw Materials Buyer · Chicago, IL');

-- -----------------------------------------------
-- D365 WAREHOUSES — sites.csv (HRT receives field picks; GRP is the fresh-cut plant)
-- -----------------------------------------------
insert into d365_warehouses (d365_warehouse_id, warehouse_name, site_id, is_default, address_city, address_state) values
  ('HRT-PK', 'Hart Packing House — Receiving',          'HRT', true,  'Hart',         'MI'),
  ('GRP-RM', 'Grand Rapids Fresh-Cut — Raw Materials',  'GRP', false, 'Grand Rapids', 'MI'),
  ('HOL-DC', 'Holland Distribution Center',             'HOL', false, 'Holland',      'MI'),
  ('SAL-XD', 'Salinas Consolidation Hub (3PL cross-dock)', 'SAL', false, 'Salinas',   'CA');

-- -----------------------------------------------
-- D365 SALES ORDERS — demand signal (pack SO-50xxx numbering)
-- -----------------------------------------------
insert into d365_sales_orders (d365_sales_order_number, line_number, customer_account, customer_name, item_number, item_name, ordered_quantity, delivered_quantity, remaining_quantity, unit, requested_ship_date, warehouse_id, order_status) values
  ('SO-50567', 1, 'C10001', 'Great Lakes Grocers',        'PK-APL-HC-3LB',   'Honeycrisp Apples 3 lb pouch',     1800, 0, 1800, 'Case',   current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50567', 2, 'C10001', 'Great Lakes Grocers',        'PK-CRN-4PK',      'Sweet Corn 4-pack tray',            400, 0,  400, 'Case',   current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50567', 3, 'C10001', 'Great Lakes Grocers',        'PK-ZUC-CTN',      'Zucchini 20 lb carton',             250, 0,  250, 'Case',   current_date + 2, 'HOL-DC', 'Open'),
  ('SO-50553', 1, 'C10011', 'Midwest Foodservice Supply', 'FC-SAL-ROM-CHOP', 'Chopped Romaine 2 lb foodservice',  600, 0,  600, 'Case',   current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50553', 2, 'C10011', 'Midwest Foodservice Supply', 'FC-APL-DICE-5LB', 'Diced Apples 5 lb foodservice',    2400, 0, 2400, 'Case',   current_date + 1, 'HOL-DC', 'Open'),
  ('SO-50553', 3, 'C10011', 'Midwest Foodservice Supply', 'FC-VEG-SQB-DICE', 'Diced Butternut Squash 12 oz',      300, 0,  300, 'Case',   current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50590', 1, 'C10007', 'Summit Club Stores',         'PK-APL-HC-TRAY',  'Honeycrisp Apples 88ct tray',       900, 0,  900, 'Case',   current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50590', 2, 'C10007', 'Summit Club Stores',         'PK-PEP-GRN',      'Green Bell Peppers 1-1/9 bu',       500, 0,  500, 'Case',   current_date + 3, 'HOL-DC', 'Open'),
  ('SO-50611', 1, 'C10008', 'ValuePoint Mass Retail',     'PK-APL-GA-3LB',   'Gala Apples 3 lb pouch',           1200, 0, 1200, 'Case',   current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50611', 2, 'C10008', 'ValuePoint Mass Retail',     'PK-CUC-SLC',      'Slicer Cucumbers 24 ct',            350, 0,  350, 'Case',   current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50611', 3, 'C10008', 'ValuePoint Mass Retail',     'PK-SQB-CTN',      'Butternut Squash 35 lb carton',     200, 0,  200, 'Case',   current_date + 4, 'HOL-DC', 'Open'),
  ('SO-50535', 1, 'C10024', 'Orchard Lane Cider Co.',     'RAW-APL-GA',      'Apples, Gala, bulk bin',             40, 0,   40, 'Bin',    current_date + 5, 'HRT-PK', 'Open'),
  ('SO-50509', 1, 'C10038', 'Windy City Salad Works',     'RAW-ROM',         'Romaine, bulk carton',              900, 0,  900, 'Carton', current_date + 2, 'HRT-PK', 'Open'),
  -- Delivered order for history
  ('SO-50450', 1, 'C10002', 'Northwind Foods',            'PK-APL-HC-3LB',   'Honeycrisp Apples 3 lb pouch',     2400, 2400, 0, 'Case',  current_date - 3, 'HOL-DC', 'Delivered'),
  ('SO-50450', 2, 'C10002', 'Northwind Foods',            'PK-ROM-HRT',      'Romaine Hearts 3 ct',               800,  800, 0, 'Case',  current_date - 3, 'HOL-DC', 'Delivered');

-- -----------------------------------------------
-- D365 PRODUCTION ORDERS — GRP fresh-cut lines (production_orders.csv)
-- -----------------------------------------------
insert into d365_production_orders (d365_prod_order_id, item_number, item_name, order_quantity, remaining_quantity, unit, status, scheduled_start_date, scheduled_end_date, warehouse_id, site_id) values
  ('PRD-90060', 'PK-APL-HC-3LB',   'Honeycrisp Apples 3 lb pouch',    900,  900, 'Case', 'Started',   current_date,     current_date,     'GRP-RM', 'GRP'),
  ('PRD-90061', 'PK-APL-HC-3LB',   'Honeycrisp Apples 3 lb pouch',   1800, 1800, 'Case', 'Released',  current_date,     current_date + 1, 'GRP-RM', 'GRP'),
  ('PRD-90062', 'FC-APL-DICE-5LB', 'Diced Apples 5 lb foodservice',  2400, 2400, 'Case', 'Released',  current_date,     current_date + 1, 'GRP-RM', 'GRP'),
  ('PRD-90137', 'FC-APL-SLC-2OZ',  'Apple Slices 2 oz snack cup',     600,  600, 'Case', 'Started',   current_date,     current_date,     'GRP-RM', 'GRP'),
  ('PRD-90214', 'FC-CRN-KERNEL',   'Cut Sweet Corn Kernels 2 lb',    2400, 2400, 'Case', 'Released',  current_date,     current_date,     'GRP-RM', 'GRP'),
  ('PRD-90203', 'FC-VEG-SQB-DICE', 'Diced Butternut Squash 12 oz',   1800, 1800, 'Case', 'Scheduled', current_date + 1, current_date + 1, 'GRP-RM', 'GRP'),
  ('PRD-90143', 'PK-APL-GA-3LB',   'Gala Apples 3 lb pouch',          900,  900, 'Case', 'Scheduled', current_date + 2, current_date + 2, 'GRP-RM', 'GRP'),
  ('PRD-90150', 'FC-APL-DICE-5LB', 'Diced Apples 5 lb foodservice',  1200, 1200, 'Case', 'Scheduled', current_date + 3, current_date + 3, 'GRP-RM', 'GRP'),
  ('PRD-90066', 'FC-APL-SLC-2OZ',  'Apple Slices 2 oz snack cup',    2400, 2400, 'Case', 'Scheduled', current_date + 4, current_date + 4, 'GRP-RM', 'GRP'),
  ('PRD-90509', 'FC-SAL-ROM-CHOP', 'Chopped Romaine 2 lb foodservice', 600,   0, 'Case', 'Ended',     current_date - 1, current_date - 1, 'GRP-RM', 'GRP');

-- -----------------------------------------------
-- D365 INVENTORY ON-HAND — raw at HRT/GRP (batch = load ticket), finished at HOL
-- -----------------------------------------------
insert into d365_inventory_onhand (item_number, warehouse_id, site_id, available_physical, available_ordered, total_available, unit, batch_number) values
  ('RAW-APL-HC',      'HRT-PK', 'HRT',   41,   12,   53, 'Bin',    'LT-778828'),
  ('RAW-APL-HC',      'GRP-RM', 'GRP',   18,    0,   18, 'Bin',    'LT-509470'),
  ('RAW-APL-GA',      'HRT-PK', 'HRT',   96,   40,  136, 'Bin',    'LT-915265'),
  ('RAW-ROM',         'HRT-PK', 'HRT',  894,  900, 1794, 'Carton', 'LT-420147'),
  ('RAW-CUC',         'HRT-PK', 'HRT',  458,  350,  808, 'Bushel', 'LT-373196'),
  ('RAW-ZUC',         'HRT-PK', 'HRT',  435,  250,  685, 'Bushel', 'LT-993600'),
  ('RAW-PEP',         'HRT-PK', 'HRT',  272,  500,  772, 'Bushel', 'LT-899020'),
  ('RAW-SQB',         'HRT-PK', 'HRT',    7,   20,   27, 'Bin',    'LT-793843'),
  ('RAW-CRN',         'HRT-PK', 'HRT',    0,  400,  400, 'Crate',  null),
  ('RAW-BLU',         'HOL-DC', 'HOL',    0,    0,    0, 'Flat',   null),
  ('PK-APL-HC-3LB',   'HOL-DC', 'HOL', 2120, 1800, 3920, 'Case',   'BT-' || to_char(current_date - 2, 'YYYYMMDD') || '-01'),
  ('PK-ROM-HRT',      'HOL-DC', 'HOL',  640,    0,  640, 'Case',   'BT-' || to_char(current_date - 3, 'YYYYMMDD') || '-02'),
  ('PK-CUC-SLC',      'HOL-DC', 'HOL',  210,  350,  560, 'Case',   'BT-' || to_char(current_date - 1, 'YYYYMMDD') || '-01'),
  ('FC-SAL-ROM-CHOP', 'HOL-DC', 'HOL',    0,  600,  600, 'Case',   null);

-- -----------------------------------------------
-- D365 ENTITY MAPPINGS — crop x variety → raw item; block → receiving warehouse
-- -----------------------------------------------
insert into d365_entity_mappings (local_entity_type, local_entity_id, d365_entity_type, d365_entity_ref)
select 'crop', c.id, 'product', m.item_number
from crops c
join (values
  ('Apples',           'Honeycrisp',   'RAW-APL-HC'),
  ('Apples',           'Gala',         'RAW-APL-GA'),
  ('Apples',           'Fuji',         'RAW-APL-FJ'),
  ('Apples',           'Jonagold',     'RAW-APL-JG'),
  ('Blueberries',      'Duke',         'RAW-BLU'),
  ('Blueberries',      'Elliott',      'RAW-BLU'),
  ('Asparagus',        'Jersey Giant', 'RAW-ASP'),
  ('Cucumbers',        'Slicer',       'RAW-CUC'),
  ('Cucumbers',        'Pickling',     'RAW-CUC'),
  ('Zucchini',         'Dark Green',   'RAW-ZUC'),
  ('Sweet Corn',       'Bicolor',      'RAW-CRN'),
  ('Sweet Corn',       'Yellow',       'RAW-CRN'),
  ('Tart Cherries',    'Montmorency',  'RAW-CHR'),
  ('Butternut Squash', 'Waltham',      'RAW-SQB'),
  ('Bell Peppers',     'Green',        'RAW-PEP'),
  ('Bell Peppers',     'Red',          'RAW-PEP'),
  ('Romaine',          'Full Head',    'RAW-ROM'),
  ('Romaine',          'Hearts',       'RAW-ROM')
) as m(crop_name, variety, item_number) on m.crop_name = c.name and m.variety = c.variety;

-- Michigan picks land at the Hart packing house; winter-program loads cross-dock at Salinas.
insert into d365_entity_mappings (local_entity_type, local_entity_id, d365_entity_type, d365_entity_ref)
select 'field', f.id, 'warehouse',
  case when f.location like '%Winter Program%' then 'SAL-XD' else 'HRT-PK' end
from fields f;

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
union all select 'yield lbs by grade',           string_agg(grade || '=' || q, ', ' order by grade) from (select grade, sum(quantity)::bigint q from yield_records group by grade) g
union all select 'yield lbs total',              sum(quantity)::bigint::text from yield_records
union all select 'd365_sync_queue by status',    string_agg(status || '=' || n, ', ' order by status) from (select status, count(*) n from d365_sync_queue group by status) q
union all select 'd365_products',                count(*)::text from d365_products
union all select 'd365_customers',               count(*)::text from d365_customers
union all select 'd365_warehouses',              count(*)::text from d365_warehouses
union all select 'd365_sales_orders lines (open remaining)', count(*) || ' (' || sum(remaining_quantity)::bigint || ')' from d365_sales_orders
union all select 'd365_production_orders',       count(*)::text from d365_production_orders
union all select 'd365_inventory_onhand rows',   count(*)::text from d365_inventory_onhand
union all select 'crop mappings (unmapped crops)', count(*) || ' (' || (select count(*) from crops c where not exists (select 1 from d365_entity_mappings m where m.local_entity_type = 'crop' and m.local_entity_id = c.id)) || ')' from d365_entity_mappings where local_entity_type = 'crop'
union all select 'field mappings (unmapped fields)', count(*) || ' (' || (select count(*) from fields f where not exists (select 1 from d365_entity_mappings m where m.local_entity_type = 'field' and m.local_entity_id = f.id)) || ')' from d365_entity_mappings where local_entity_type = 'field';
