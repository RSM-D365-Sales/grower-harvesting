# Grower Harvesting — booth video voice-over

*Generated from `demo-kit/scenes.mjs` by `write-script.mjs`. Edit the source, not this file.*

| | |
|---|---|
| Clip | Grower Harvesting (Bluestem Greens) |
| Running time | **0:58.5** (58.5 s) |
| Narration | 135 words · 138 wpm average |
| Picture | `demo-kit/out/grower-harvesting-tour.mp4` (1920×1080, 30 fps) |
| Title card between clips | `demo-kit/interstitial.html` → `demo-kit/out/interstitial.mp4` (12 s) |

Read it warm and unhurried. Each scene's narration is sized to finish about half a
second before the cut, so if you land early, hold the pause; don't fill it.
Say "D365" as *dee-three-sixty-five*, "HOL-GH" as *Holland greenhouse*, and
"Report as Finished" as the D365 term it is (no "the" in front of it).

## Timed script

| # | Time | Scene | Narration | Words |
|---|---|---|---|---|
| 1 | 0:00.0 – 0:08.0 | **Dashboard** | Bluestem Greens runs every greenhouse bay from one screen: what’s growing, what’s ready to cut, and what’s in D365. | 19 (143 wpm) |
| 2 | 0:08.0 – 0:16.0 | **Grow Cycles** | Grow Cycles follow each bay from prep to planting, growth and harvest. Filter to what’s ready and open the detail. | 20 (150 wpm) |
| 3 | 0:16.0 – 0:24.0 | **Harvest Scheduling** | Harvest Scheduling puts crew, cut window and customer truck on one card, and tracks every cut to completion. | 18 (135 wpm) |
| 4 | 0:24.0 – 0:32.0 | **Yield Management** | Yields are recorded cut by cut, in each crop’s own unit, graded, and flagged when the cut-to-cooler window is short. | 20 (150 wpm) |
| 5 | 0:32.0 – 0:42.0 | **D365 Sync Queue** | Every record queues to D365 automatically: inventory journals for yields, Report as Finished for harvests. Failures surface here, with a retry. | 21 (126 wpm) |
| 6 | 0:42.0 – 0:53.0 | **D365 F&SC inbound** | D365 flows back too: products, production orders, demand and on-hand inventory, with each crop mapped to its packed item and each bay to its warehouse. | 25 (136 wpm) |
| 7 | 0:53.0 – 0:58.5 | **Grower Harvesting** | Grower Harvesting, powered by RSM. Lettuce show you what D365 can do. | 12 (131 wpm) |

## Scene by scene

### 1. Dashboard · 0:00.0 – 0:08.0 (8 s)

**On screen:** KPI row (Active Bays, Harvest Ready, Total Yield per unit, Pending D365 Sync), then the phase chart and Upcoming Cuts.

**Lower-third caption:** Dashboard — *Every bay on the Holland campus, one screen*

**Narration:**

> Bluestem Greens runs every greenhouse bay from one screen: what’s growing, what’s ready to cut, and what’s in D365.

### 2. Grow Cycles · 0:08.0 – 0:16.0 (8 s)

**On screen:** Phase filter chips; "harvest ready" filter; open GH-1 Bay B for the cycle progress bar.

**Lower-third caption:** Grow Cycles — *Bay prep → planting → growth → harvest, per bay*

**Narration:**

> Grow Cycles follow each bay from prep to planting, growth and harvest. Filter to what’s ready and open the detail.

### 3. Harvest Scheduling · 0:16.0 – 0:24.0 (8 s)

**On screen:** Schedule cards with crew chips; "in progress" filter shows the Micro Room A pea-shoot cut underway.

**Lower-third caption:** Harvest Scheduling — *Crew, cut window and customer truck on one card*

**Narration:**

> Harvest Scheduling puts crew, cut window and customer truck on one card, and tracks every cut to completion.

### 4. Yield Management · 0:24.0 – 0:32.0 (8 s)

**On screen:** Yield KPIs, yield-by-crop chart, the Record Yield form, and the graded table with short lead-time flags.

**Lower-third caption:** Yield Management — *Cut by cut, in each crop’s unit, graded A / B / C*

**Narration:**

> Yields are recorded cut by cut, in each crop’s own unit, graded, and flagged when the cut-to-cooler window is short.

### 5. D365 Sync Queue · 0:32.0 – 0:42.0 (10 s)

**On screen:** Pending / Processing / Synced / Failed tiles; the "failed" filter reveals the cucumber batch error and its Retry button.

**Lower-third caption:** D365 Sync Queue — *Outbound: inventory journals and Report as Finished*

**Narration:**

> Every record queues to D365 automatically: inventory journals for yields, Report as Finished for harvests. Failures surface here, with a retry.

### 6. D365 F&SC inbound · 0:42.0 – 0:53.0 (11 s)

**On screen:** Four quick pages: Products table, Production Orders tiles, Demand with the On-Hand Inventory tab, Mappings with the Bay → Warehouse tab.

**Lower-third caption:** D365 F&SC inbound — *Products · Production Orders · Demand & Inventory · Mappings*

**Narration:**

> D365 flows back too: products, production orders, demand and on-hand inventory, with each crop mapped to its packed item and each bay to its warehouse.

### 7. Grower Harvesting · 0:53.0 – 0:58.5 (5.5 s)

**On screen:** Midnight end card: bluestem mark, Grower Harvesting, tagline, Powered by RSM bottom-right.

**Lower-third caption:** Grower Harvesting — *Lettuce show you what D365 can do.*

**Narration:**

> Grower Harvesting, powered by RSM. Lettuce show you what D365 can do.


## Alternate openers

If the room wants a hook before scene 1, swap one of these in and trim the
first sentence of scene 1 to fit (each adds ~5 s; keep the clip under 60 s):

- At bluestem, we’ve got a saying: if you can’t see it, you can’t ship it.
- Here’s a problem every produce company knows by heart: the cut happened, and the ERP finds out tomorrow.

## Recording notes

- The picture is recorded by `node demo-kit/record.mjs`; scene boundaries land on the
  timecodes above because the recorder holds each scene for exactly its budgeted seconds.
  `demo-kit/out/tour-timings.json` has the measured boundaries from the last run.
- `node demo-kit/scratch-vo.mjs` lays a Windows text-to-speech scratch read over the
  picture (`tour-scratch-vo.mp4`) so timing can be checked before a real voice is recorded.
- Record the real voice-over as one take against the picture, or scene by scene and align
  each clip to its start timecode. Leave the last 0.5 s of every scene silent.
- Captions are burned in (bottom-left lower-third). On a muted show floor they carry the
  story alone; the voice-over is for the recorded social cut and anyone wearing headphones.
