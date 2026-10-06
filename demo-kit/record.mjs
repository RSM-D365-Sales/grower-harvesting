/**
 * Records the Grower Harvesting booth video with Playwright.
 *
 *   node demo-kit/record.mjs                       # tour + interstitial
 *   node demo-kit/record.mjs --only tour           # just the app tour
 *   node demo-kit/record.mjs --only interstitial   # just the title card
 *   node demo-kit/record.mjs --base http://localhost:5199 --no-captions
 *
 * The app must be running at --base (default http://localhost:5199). A
 * production build served by `vite preview` is the reliable way to do that on
 * this OneDrive checkout — see demo-kit/README.md.
 *
 * Output (demo-kit/out/):
 *   grower-harvesting-tour.webm / .mp4   the tour (length = sum of scenes.mjs seconds), 1920×1080
 *   interstitial.webm / .mp4             the 12 s title card between clips
 *   tour-timings.json                    measured scene boundaries (for VO alignment)
 *
 * MP4 (H.264) needs an ffmpeg with libx264. The script looks for, in order:
 * $FFMPEG, `ffmpeg` on PATH, the one bundled with Python's imageio-ffmpeg.
 * Playwright's own ffmpeg is VP8/WebM-only, so without one of those you get WebM.
 *
 * Nothing here mutates demo data: the tour only navigates, filters, opens and
 * cancels forms, and hovers the Retry button. It never clicks Start Harvest,
 * Retry, Extract from D365 or Test Connection.
 */
import { chromium } from 'playwright'
import { mkdirSync, renameSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { SCENES, VIDEO, TOTAL_SECONDS } from './scenes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = parseArgs(process.argv.slice(2))
const BASE = (args.base ?? 'http://localhost:5199').replace(/\/$/, '')
const OUT = resolve(args.out ?? join(here, 'out'))
const CAPTIONS = !args['no-captions']
const ONLY = args.only ?? 'all'
const { width: W, height: H } = VIDEO.frame

mkdirSync(OUT, { recursive: true })

const rsmWhite = 'data:image/png;base64,' + readFileSync(join(here, 'assets', 'rsm-logo-white.png')).toString('base64')

// ---------------------------------------------------------------------------
// Overlay injected into the app: a visible cursor, the lower-third caption and
// the closing card. Everything lives under window.__demo so scenes can call it.
// ---------------------------------------------------------------------------
const OVERLAY = String.raw`
(() => {
  if (window.__demo) return;
  const Z = 2147483000;
  const css = document.createElement('style');
  css.textContent = ${JSON.stringify(`
    #__demo-cursor{position:fixed;left:0;top:0;width:28px;height:28px;z-index:${2147483600};pointer-events:none;
      transform:translate(-9999px,-9999px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));will-change:transform}
    .__demo-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;z-index:${2147483500};
      pointer-events:none;border:3px solid #009CDE;opacity:.9;animation:__demo-rip .55s ease-out forwards}
    @keyframes __demo-rip{from{transform:scale(.25);opacity:.9}to{transform:scale(1.15);opacity:0}}
    #__demo-caption{position:fixed;left:288px;bottom:40px;z-index:${2147483400};display:flex;align-items:stretch;
      opacity:0;transform:translateY(14px);transition:opacity .35s ease,transform .35s ease;pointer-events:none;
      font-family:'Segoe UI',system-ui,sans-serif;max-width:900px}
    #__demo-caption.on{opacity:1;transform:translateY(0)}
    #__demo-caption .bar{width:6px;background:#009CDE;border-radius:3px 0 0 3px;flex:none}
    #__demo-caption .box{background:rgba(0,21,61,.94);color:#fff;padding:12px 22px 13px 18px;border-radius:0 8px 8px 0;
      box-shadow:0 12px 32px rgba(0,21,61,.35)}
    #__demo-caption .t{font-family:Poppins,'Segoe UI',sans-serif;font-weight:600;font-size:22px;line-height:1.2;letter-spacing:-.005em}
    #__demo-caption .s{font-size:14.5px;color:#C9D1DB;margin-top:3px;line-height:1.35}
    #__demo-end{position:fixed;inset:0;z-index:${2147483450};background:#00153D;color:#fff;opacity:0;transition:opacity .5s ease;
      font-family:'Segoe UI',system-ui,sans-serif;display:grid;place-items:center}
    #__demo-end.on{opacity:1}
    #__demo-end .inner{display:flex;flex-direction:column;align-items:center;gap:18px;transform:translateY(-20px)}
    #__demo-end .wm{font-family:Poppins,'Segoe UI',sans-serif;font-weight:600;font-size:58px;letter-spacing:-.01em;line-height:1;display:flex;align-items:center;gap:16px}
    #__demo-end .wm .stem{color:#3F9C35}
    #__demo-end .title{font-family:Poppins,'Segoe UI',sans-serif;font-weight:600;font-size:92px;letter-spacing:-.015em;line-height:1.05;margin-top:12px}
    #__demo-end .tag{font-family:Poppins,'Segoe UI',sans-serif;font-weight:500;font-size:34px;color:#009CDE;margin-top:4px}
    #__demo-end .campus{font-size:17px;color:#9FB0CC;letter-spacing:.08em;text-transform:uppercase;margin-top:26px}
    #__demo-end .rsm{position:absolute;right:72px;bottom:56px;display:flex;align-items:center;gap:12px;color:#C9D1DB;font-size:15px}
    #__demo-end .rsm img{height:30px;width:auto;display:block}
    #__demo-end .inner > *{opacity:0;transform:translateY(10px);transition:opacity .5s ease,transform .5s ease}
    #__demo-end.on .inner > *{opacity:1;transform:none}
    #__demo-end.on .inner > :nth-child(2){transition-delay:.15s}
    #__demo-end.on .inner > :nth-child(3){transition-delay:.3s}
    #__demo-end.on .inner > :nth-child(4){transition-delay:.45s}
    #__demo-end.on .rsm{transition-delay:.6s}
  `)};
  const mark = (size) => '<svg viewBox="40 30 200 220" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<path d="M62 232 Q75 150 150 130" stroke="#009CDE" stroke-width="26" stroke-linecap="round" fill="none"/>' +
    '<g transform="translate(155 108) rotate(-45)"><path d="M-72 0 C-40 -50 40 -50 72 0 C40 50 -40 50 -72 0 Z" fill="#3F9C35"/>' +
    '<path d="M-45 0 L45 0" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/></g></svg>';
  const mount = () => {
    document.head.appendChild(css);
    const cur = document.createElement('div');
    cur.id = '__demo-cursor';
    cur.innerHTML = '<svg viewBox="0 0 28 28" width="28" height="28"><path d="M4 2.5 L4 22.5 L9.3 17.6 L13 26 L16.6 24.4 L12.9 16.2 L20.5 16.2 Z" fill="#fff" stroke="#00153D" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cur);
    const cap = document.createElement('div');
    cap.id = '__demo-caption';
    cap.innerHTML = '<div class="bar"></div><div class="box"><div class="t"></div><div class="s"></div></div>';
    document.body.appendChild(cap);
    window.addEventListener('mousemove', (e) => { cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div'); r.className = '__demo-ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.__demo = {
    caption(title, sub) {
      const el = document.getElementById('__demo-caption'); if (!el) return;
      const swap = () => { el.querySelector('.t').textContent = title; el.querySelector('.s').textContent = sub || ''; el.classList.add('on'); };
      if (el.classList.contains('on')) { el.classList.remove('on'); setTimeout(swap, 260); } else swap();
    },
    hideCaption() { const el = document.getElementById('__demo-caption'); if (el) el.classList.remove('on'); },
    hideCursor() { const el = document.getElementById('__demo-cursor'); if (el) el.style.display = 'none'; },
    endCard(opts) {
      const el = document.createElement('div'); el.id = '__demo-end';
      el.innerHTML = '<div class="inner">' +
        '<div class="wm">' + mark(66) + '<span>blue<span class="stem">stem</span></span></div>' +
        '<div class="title">' + opts.title + '</div>' +
        '<div class="tag">' + opts.tagline + '</div>' +
        '<div class="campus">' + opts.campus + '</div>' +
        '</div><div class="rsm"><span>Powered by</span><img alt="RSM" src="' + opts.rsm + '"></div>';
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    },
  };
})();`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function moveTo(page, locator, steps = 18) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('moveTo: element not visible: ' + locator)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps })
}

async function click(page, locator, { settle = 250 } = {}) {
  await locator.waitFor({ state: 'visible', timeout: 15000 })
  await locator.scrollIntoViewIfNeeded()
  await moveTo(page, locator)
  await sleep(140)
  await page.mouse.down()
  await sleep(70)
  await page.mouse.up()
  await sleep(settle)
}

async function hover(page, locator) {
  await locator.waitFor({ state: 'visible', timeout: 15000 })
  await locator.scrollIntoViewIfNeeded()
  await moveTo(page, locator, 30)
}

/** Smooth-ish wheel scroll in small steps so the recording shows motion. */
async function wheel(page, dy, steps = 14) {
  const step = dy / steps
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step)
    await sleep(28)
  }
}

async function scrollTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await sleep(450)
}

const nav = (page, name) => page.locator('aside').getByRole('link', { name, exact: true })
const chip = (page, name) => page.getByRole('button', { name, exact: true })

async function goTo(page, linkName, h1Text) {
  await click(page, nav(page, linkName), { settle: 100 })
  await page.getByRole('heading', { level: 1, name: h1Text }).waitFor({ timeout: 20000 })
  // give TanStack Query a beat to paint real rows
  await sleep(300)
}

async function caption(page, scene, step) {
  if (!CAPTIONS) return
  const c = step ?? scene
  await page.evaluate(([t, s]) => window.__demo?.caption(t, s), [c.caption, c.sub])
}

// ---------------------------------------------------------------------------
// Scene choreography. Each must finish inside its scenes.mjs budget; the runner
// pads to the budget so the cut lands on the scripted timecode.
// ---------------------------------------------------------------------------
const actions = {
  async dashboard(page) {
    await page.mouse.move(W * 0.55, H * 0.45, { steps: 20 })
    await sleep(2300)
    await wheel(page, 520)
    await sleep(1700)
    await wheel(page, 420)
    await sleep(1300)
    await scrollTop(page)
  },

  async 'grow-cycles'(page) {
    await goTo(page, 'Grow Cycles', 'Grow Cycles')
    await sleep(1300)
    await click(page, chip(page, 'harvest ready'))
    await sleep(1400)
    await click(page, page.getByTitle('View details').first(), { settle: 100 })
    await page.getByText('Cycle Progress').waitFor({ timeout: 15000 })
    await page.mouse.move(W * 0.5, H * 0.5, { steps: 18 })
  },

  async 'harvest-scheduling'(page) {
    await goTo(page, 'Harvest Scheduling', 'Harvest Scheduling')
    await sleep(1300)
    await click(page, chip(page, 'in progress'))
    await sleep(1600)
    await click(page, chip(page, 'All').first())
    await page.mouse.move(W * 0.62, H * 0.55, { steps: 14 })
  },

  async 'yield-management'(page) {
    await goTo(page, 'Yield Management', 'Yield Management')
    await sleep(1000)
    await wheel(page, 640, 10)
    await sleep(1300)
    await scrollTop(page)
    await click(page, page.getByRole('button', { name: 'Record Yield' }))
    await sleep(1200)
    await click(page, page.getByRole('button', { name: 'Cancel' }).first(), { settle: 200 })
  },

  async 'd365-sync'(page) {
    await goTo(page, 'D365 Sync Queue', 'D365 F&SC Integration')
    await sleep(1500)
    await page.mouse.move(W * 0.45, H * 0.5, { steps: 12 })
    await sleep(700)
    await click(page, chip(page, 'failed'))
    await sleep(500)
    const retry = page.getByRole('button', { name: 'Retry' }).first()
    await hover(page, retry)
    await sleep(1400)
    await click(page, chip(page, 'All').first(), { settle: 300 })
    await page.mouse.move(W * 0.6, H * 0.6, { steps: 14 })
  },

  async 'd365-inbound'(page, scene) {
    const [products, prod, demand, mappings] = scene.steps
    await goTo(page, 'D365 Products', 'D365 Products')
    await caption(page, scene, products)
    await page.mouse.move(W * 0.5, H * 0.55, { steps: 12 })
    await sleep(1200)

    await goTo(page, 'Production Orders', 'D365 Production Orders')
    await caption(page, scene, prod)
    await sleep(1300)

    await goTo(page, 'Demand & Inventory', 'D365 Demand & Inventory')
    await caption(page, scene, demand)
    await sleep(600)
    await click(page, page.getByRole('button', { name: 'On-Hand Inventory' }))
    await sleep(900)

    await goTo(page, 'Mappings & Log', 'D365 Entity Mappings & Sync Log')
    await caption(page, scene, mappings)
    await sleep(500)
    await click(page, page.getByRole('button', { name: 'Bay → Warehouse' }), { settle: 200 })
  },

  async 'end-card'(page) {
    await page.evaluate(() => { window.__demo?.hideCaption(); window.__demo?.hideCursor() })
    await sleep(250)
    await page.evaluate(
      (o) => window.__demo?.endCard(o),
      { title: VIDEO.title, tagline: VIDEO.tagline, campus: VIDEO.campus, rsm: rsmWhite },
    )
  },
}

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------
async function recordTour(browser) {
  console.log(`\nRecording tour from ${BASE} (${TOTAL_SECONDS}s, captions ${CAPTIONS ? 'on' : 'off'})`)
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'America/Detroit',
  })
  await context.addInitScript(OVERLAY)
  const videoStart = Date.now()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE + '/', { waitUntil: 'load' })
  await page.getByRole('heading', { level: 1, name: 'Dashboard' }).waitFor({ timeout: 30000 })
  // wait for the first KPI value to render (data arrived), then let fonts settle
  await page.getByText('Active Bays').waitFor({ timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
  await sleep(600)
  await page.mouse.move(W * 0.5, H * 0.5)

  const t0 = Date.now()
  const timings = []
  for (const scene of SCENES) {
    const start = Date.now()
    process.stdout.write(`  ${scene.caption.padEnd(20)} ${scene.seconds}s … `)
    await caption(page, scene)
    try {
      await actions[scene.id](page, scene)
    } catch (e) {
      console.log(`\n  ! ${scene.id}: ${e.message.split('\n')[0]}`)
    }
    const used = (Date.now() - start) / 1000
    const pad = scene.seconds * 1000 - (Date.now() - start)
    if (pad < 0) console.log(`ran long by ${(-pad / 1000).toFixed(1)}s`)
    else { await sleep(pad); console.log(`ok (${used.toFixed(1)}s of action)`) }
    timings.push({ id: scene.id, caption: scene.caption, start: +((start - t0) / 1000).toFixed(2), end: +((Date.now() - t0) / 1000).toFixed(2) })
  }

  const video = page.video()
  await context.close()
  const raw = await video.path()
  const webm = join(OUT, 'grower-harvesting-tour.webm')
  if (existsSync(webm)) unlinkSync(webm)
  renameSync(raw, webm)

  const leadIn = (t0 - videoStart) / 1000
  const duration = timings.at(-1).end
  writeFileSync(join(OUT, 'tour-timings.json'), JSON.stringify({ base: BASE, leadInSeconds: +leadIn.toFixed(2), durationSeconds: duration, scenes: timings }, null, 2))
  if (errors.length) console.log('  page errors:', errors)
  console.log(`  → ${webm}`)
  toMp4(webm, join(OUT, 'grower-harvesting-tour.mp4'), leadIn, duration)
}

async function recordInterstitial(browser) {
  const secs = VIDEO.interstitialSeconds
  console.log(`\nRecording interstitial (${secs}s)`)
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  })
  const videoStart = Date.now()
  const page = await context.newPage()
  const url = pathToFileURL(join(here, 'interstitial.html')).href + `?dur=${secs}&manual=1&next=${encodeURIComponent(VIDEO.title)}`
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await sleep(300)
  const t0 = Date.now()
  await page.evaluate(() => window.__startTimeline())
  await sleep(secs * 1000 + 300)
  const video = page.video()
  await context.close()
  const webm = join(OUT, 'interstitial.webm')
  if (existsSync(webm)) unlinkSync(webm)
  renameSync(await video.path(), webm)
  console.log(`  → ${webm}`)
  toMp4(webm, join(OUT, 'interstitial.mp4'), (t0 - videoStart) / 1000, secs)
}

// ---------------------------------------------------------------------------
// MP4 conversion
// ---------------------------------------------------------------------------
function findFfmpeg() {
  const candidates = []
  if (process.env.FFMPEG) candidates.push(process.env.FFMPEG)
  candidates.push('ffmpeg')
  try {
    const py = spawnSync('python', ['-c', 'import imageio_ffmpeg,sys;sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' })
    if (py.status === 0 && py.stdout.trim()) candidates.push(py.stdout.trim())
  } catch { /* no python */ }
  for (const c of candidates) {
    const r = spawnSync(c, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
    if (r.status === 0 && /libx264/.test(r.stdout)) return c
  }
  return null
}

function toMp4(webm, mp4, leadIn, duration) {
  const ff = findFfmpeg()
  if (!ff) {
    console.log('  (no H.264 ffmpeg found — keeping WebM. Install imageio-ffmpeg via pip, or set $FFMPEG.)')
    return
  }
  const argv = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', leadIn.toFixed(3), '-i', webm, '-t', duration.toFixed(3),
    '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-vf', `scale=${W}:${H}:flags=lanczos`, '-movflags', '+faststart', '-an', mp4,
  ]
  const r = spawnSync(ff, argv, { encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status === 0) console.log(`  → ${mp4}  (trimmed ${leadIn.toFixed(2)}s lead-in, ${duration}s)`)
  else console.log('  ffmpeg failed with status', r.status)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const k = a.slice(2)
    const v = argv[i + 1]
    if (v && !v.startsWith('--')) { out[k] = v; i++ } else out[k] = true
  }
  return out
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ channel: 'chromium' })
try {
  if (ONLY === 'all' || ONLY === 'tour') await recordTour(browser)
  if (ONLY === 'all' || ONLY === 'interstitial') await recordInterstitial(browser)
} finally {
  await browser.close()
}
console.log('\nDone.')
