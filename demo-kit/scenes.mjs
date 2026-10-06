/**
 * Single source of truth for the Grower Harvesting booth video.
 *
 * Every other file in demo-kit/ derives from this one:
 *   record.mjs        — drives the app and records the tour, scene by scene,
 *                       holding each scene for exactly `seconds`
 *   write-script.mjs  — regenerates voiceover-script.md (timecodes + VO text)
 *   scratch-vo.mjs    — builds a Windows text-to-speech scratch track so the
 *                       narration can be checked against the picture
 *
 * Edit the copy or the timings here, then re-run the scripts. Don't hand-edit
 * voiceover-script.md.
 *
 * Pacing: a relaxed read is ~150 words a minute (2.5 words a second). Each
 * scene's VO should sit just under `seconds * 2.5` words so the narrator is
 * never racing the cut.
 */

export const VIDEO = {
  title: 'Grower Harvesting',
  company: 'Bluestem Greens',
  tagline: 'Lettuce show you what D365 can do.',
  campus: 'Holland Greenhouse Campus · Site HOL',
  // What the title card between loop videos says this clip is
  interstitialSeconds: 12,
  frame: { width: 1920, height: 1080 },
}

export const SCENES = [
  {
    id: 'dashboard',
    seconds: 8,
    caption: 'Dashboard',
    sub: 'Every bay on the Holland campus, one screen',
    vo: 'Bluestem Greens runs every greenhouse bay from one screen: what’s growing, what’s ready to cut, and what’s in D365.',
    onScreen: 'KPI row (Active Bays, Harvest Ready, Total Yield per unit, Pending D365 Sync), then the phase chart and Upcoming Cuts.',
  },
  {
    id: 'grow-cycles',
    seconds: 8,
    caption: 'Grow Cycles',
    sub: 'Bay prep → planting → growth → harvest, per bay',
    vo: 'Grow Cycles follow each bay from prep to planting, growth and harvest. Filter to what’s ready and open the detail.',
    onScreen: 'Phase filter chips; "harvest ready" filter; open GH-1 Bay B for the cycle progress bar.',
  },
  {
    id: 'harvest-scheduling',
    seconds: 8,
    caption: 'Harvest Scheduling',
    sub: 'Crew, cut window and customer truck on one card',
    vo: 'Harvest Scheduling puts crew, cut window and customer truck on one card, and tracks every cut to completion.',
    onScreen: 'Schedule cards with crew chips; "in progress" filter shows the Micro Room A pea-shoot cut underway.',
  },
  {
    id: 'yield-management',
    seconds: 8,
    caption: 'Yield Management',
    sub: 'Cut by cut, in each crop’s unit, graded A / B / C',
    vo: 'Yields are recorded cut by cut, in each crop’s own unit, graded, and flagged when the cut-to-cooler window is short.',
    onScreen: 'Yield KPIs, yield-by-crop chart, the Record Yield form, and the graded table with short lead-time flags.',
  },
  {
    id: 'd365-sync',
    seconds: 10,
    caption: 'D365 Sync Queue',
    sub: 'Outbound: inventory journals and Report as Finished',
    vo: 'Every record queues to D365 automatically: inventory journals for yields, Report as Finished for harvests. Failures surface here, with a retry.',
    onScreen: 'Pending / Processing / Synced / Failed tiles; the "failed" filter reveals the cucumber batch error and its Retry button.',
  },
  {
    id: 'd365-inbound',
    seconds: 11,
    caption: 'D365 F&SC inbound',
    sub: 'Products · Production Orders · Demand & Inventory · Mappings',
    // Sub-captions shown as the scene steps through the four inbound pages
    steps: [
      { caption: 'D365 Products', sub: 'Released products, PK-* packed items from BFP-UAT' },
      { caption: 'D365 Production Orders', sub: 'PRD-9xxxx pack orders at HOL-GH' },
      { caption: 'Demand & Inventory', sub: 'Open sales orders and on-hand by warehouse' },
      { caption: 'Mappings & Log', sub: 'Crop → packed item · Bay → warehouse' },
    ],
    vo: 'D365 flows back too: products, production orders, demand and on-hand inventory, with each crop mapped to its packed item and each bay to its warehouse.',
    onScreen: 'Four quick pages: Products table, Production Orders tiles, Demand with the On-Hand Inventory tab, Mappings with the Bay → Warehouse tab.',
  },
  {
    id: 'end-card',
    seconds: 5.5,
    caption: 'Grower Harvesting',
    sub: 'Lettuce show you what D365 can do.',
    vo: 'Grower Harvesting, powered by RSM. Lettuce show you what D365 can do.',
    onScreen: 'Midnight end card: bluestem mark, Grower Harvesting, tagline, Powered by RSM bottom-right.',
  },
]

export const TOTAL_SECONDS = SCENES.reduce((t, s) => t + s.seconds, 0)

/** Alternate openers from PUN_BANK.md — swap into scene 1 if the room wants a hook. */
export const ALT_OPENERS = [
  'At bluestem, we’ve got a saying: if you can’t see it, you can’t ship it.',
  'Here’s a problem every produce company knows by heart: the cut happened, and the ERP finds out tomorrow.',
]

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
