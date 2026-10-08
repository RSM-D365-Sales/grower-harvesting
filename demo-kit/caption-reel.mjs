/**
 * Builds the booth loop reel with the voice-over burned in as subtitles, so the
 * clip reads on a muted screen.
 *
 *   node demo-kit/caption-reel.mjs
 *
 * Inputs (all in demo-kit/out/, written by record.mjs):
 *   interstitial.mp4, grower-harvesting-tour.mp4, tour-timings.json
 * Text comes from scenes.mjs (`vo`), so edit the copy there, not the .ass file.
 *
 * Output: out/grower-harvesting-reel.mp4 (the previous one is copied to
 * out/backup/ first) and out/grower-harvesting-reel.ass (the subtitle track).
 *
 * Timing: the recorder logs scene boundaries in wall-clock seconds, and the
 * encoded tour runs slightly shorter (dropped frames), so boundaries are scaled
 * to the real tour length. Each scene's line is split into short phrases timed
 * by character count, so no single subtitle is on screen for too little time to read.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCENES, VIDEO } from './scenes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'out')
const INTER = join(OUT, 'interstitial.mp4')
const TOUR = join(OUT, 'grower-harvesting-tour.mp4')
const REEL = join(OUT, 'grower-harvesting-reel.mp4')
const ASS = join(OUT, 'grower-harvesting-reel.ass')
const { width: W, height: H } = VIDEO.frame

const MAX_CHARS = 90 // one phrase on screen: at most two lines (~60 chars each at 46px)
const TAIL = 0.25 // clear the last phrase just before the cut

const ff = findFfmpeg()
if (!ff) { console.error('No H.264 ffmpeg found (set $FFMPEG or pip install imageio-ffmpeg).'); process.exit(1) }
for (const f of [INTER, TOUR, join(OUT, 'tour-timings.json')]) {
  if (!existsSync(f)) { console.error(`Missing ${f} — run record.mjs first.`); process.exit(1) }
}

const timings = JSON.parse(readFileSync(join(OUT, 'tour-timings.json'), 'utf8'))
const interDur = probeDuration(INTER)
const tourDur = probeDuration(TOUR)
const scale = tourDur / timings.durationSeconds

// --- build subtitle events -------------------------------------------------
const events = []
for (const scene of SCENES) {
  const t = timings.scenes.find((s) => s.id === scene.id)
  if (!t) { console.warn(`  no timing for scene ${scene.id}, skipped`); continue }
  const start = interDur + t.start * scale
  const end = interDur + t.end * scale - TAIL
  const phrases = splitPhrases(scene.vo)
  const total = phrases.reduce((n, p) => n + p.length, 0)
  let cur = start
  for (const p of phrases) {
    const dur = (end - start) * (p.length / total)
    events.push({ start: cur, end: cur + dur, text: p })
    cur += dur
  }
}

// Subtitles sit centred over the app's content area (right of the 256px
// sidebar) and above the lower-third scene caption at bottom-left.
const marginL = 256 + 140
const marginR = 140
const marginV = 150
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: VO,Segoe UI Semibold,46,&H00FFFFFF,&H00FFFFFF,&H1A3D1500,&H1A3D1500,0,0,0,0,100,100,0,0,3,16,0,2,${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.map((e) => `Dialogue: 0,${assTime(e.start)},${assTime(e.end)},VO,,0,0,0,,{\\fad(150,120)}${e.text}`).join('\n')}
`
writeFileSync(ASS, ass, 'utf8')

// --- back up and render ----------------------------------------------------
if (existsSync(REEL)) {
  const dir = join(OUT, 'backup')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)
  copyFileSync(REEL, join(dir, `grower-harvesting-reel-${stamp}.mp4`))
}

// ffmpeg filter paths: forward slashes, drive colon escaped
const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:')
const fontsDir = process.platform === 'win32' ? `:fontsdir='${esc('C:/Windows/Fonts')}'` : ''
const argv = [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', INTER, '-i', TOUR,
  '-filter_complex', `[0:v][1:v]concat=n=2:v=1:a=0,subtitles=filename='${esc(ASS)}'${fontsDir}[v]`,
  '-map', '[v]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an', REEL,
]
console.log(`Captioning reel: ${events.length} subtitles over ${(interDur + tourDur).toFixed(1)}s (title card ${interDur.toFixed(2)}s + tour ${tourDur.toFixed(2)}s, timing scale ${scale.toFixed(4)})`)
const r = spawnSync(ff, argv, { encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] })
if (r.status !== 0) { console.error('ffmpeg failed with status', r.status); process.exit(1) }
console.log(`  → ${REEL}`)
for (const e of events) console.log(`  ${e.start.toFixed(2).padStart(6)}–${e.end.toFixed(2).padStart(6)}  ${(e.text.length / (e.end - e.start)).toFixed(0).padStart(2)} cps  ${e.text}`)

// ---------------------------------------------------------------------------
/** Split narration into readable phrases: sentences first, then at a comma/colon near the middle. */
function splitPhrases(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map((s) => s.trim())
  const out = []
  const split = (s) => {
    if (s.length <= MAX_CHARS) { out.push(s); return }
    const cuts = [...s.matchAll(/[,:;]\s/g)].map((m) => m.index + 1)
    if (!cuts.length) { out.push(s); return }
    const mid = s.length / 2
    const at = cuts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))
    split(s.slice(0, at).trim())
    split(s.slice(at).trim())
  }
  sentences.forEach(split)
  return out
}

function assTime(sec) {
  const cs = Math.round(sec * 100)
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
}

function probeDuration(file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr)
  if (!m) throw new Error(`could not read duration of ${file}`)
  return +m[1] * 3600 + +m[2] * 60 + +m[3]
}

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
