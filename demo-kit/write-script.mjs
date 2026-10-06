/**
 * Regenerates demo-kit/voiceover-script.md from scenes.mjs.
 *   node demo-kit/write-script.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SCENES, VIDEO, TOTAL_SECONDS, ALT_OPENERS, wordCount, fmtTime } from './scenes.mjs'

const here = dirname(fileURLToPath(import.meta.url))

let t = 0
const rows = SCENES.map((s) => {
  const start = t
  t += s.seconds
  const words = wordCount(s.vo)
  const wpm = Math.round((words / s.seconds) * 60)
  return { ...s, start, end: t, words, wpm }
})

const totalWords = rows.reduce((n, r) => n + r.words, 0)

const md = `# Grower Harvesting — booth video voice-over

*Generated from \`demo-kit/scenes.mjs\` by \`write-script.mjs\`. Edit the source, not this file.*

| | |
|---|---|
| Clip | ${VIDEO.title} (${VIDEO.company}) |
| Running time | **${fmtTime(TOTAL_SECONDS)}** (${TOTAL_SECONDS} s) |
| Narration | ${totalWords} words · ${Math.round((totalWords / TOTAL_SECONDS) * 60)} wpm average |
| Picture | \`demo-kit/out/grower-harvesting-tour.mp4\` (1920×1080, 30 fps) |
| Title card between clips | \`demo-kit/interstitial.html\` → \`demo-kit/out/interstitial.mp4\` (${VIDEO.interstitialSeconds} s) |

Read it warm and unhurried. Each scene's narration is sized to finish about half a
second before the cut, so if you land early, hold the pause; don't fill it.
Say "D365" as *dee-three-sixty-five*, "HOL-GH" as *Holland greenhouse*, and
"Report as Finished" as the D365 term it is (no "the" in front of it).

## Timed script

| # | Time | Scene | Narration | Words |
|---|---|---|---|---|
${rows
  .map(
    (r, i) =>
      `| ${i + 1} | ${fmtTime(r.start)} – ${fmtTime(r.end)} | **${r.caption}** | ${r.vo} | ${r.words} (${r.wpm} wpm) |`,
  )
  .join('\n')}

## Scene by scene

${rows
  .map(
    (r, i) => `### ${i + 1}. ${r.caption} · ${fmtTime(r.start)} – ${fmtTime(r.end)} (${r.seconds} s)

**On screen:** ${r.onScreen}

**Lower-third caption:** ${r.caption} — *${r.sub}*

**Narration:**

> ${r.vo}
`,
  )
  .join('\n')}

## Alternate openers

If the room wants a hook before scene 1, swap one of these in and trim the
first sentence of scene 1 to fit (each adds ~5 s; keep the clip under 60 s):

${ALT_OPENERS.map((o) => `- ${o}`).join('\n')}

## Recording notes

- The picture is recorded by \`node demo-kit/record.mjs\`; scene boundaries land on the
  timecodes above because the recorder holds each scene for exactly its budgeted seconds.
  \`demo-kit/out/tour-timings.json\` has the measured boundaries from the last run.
- \`node demo-kit/scratch-vo.mjs\` lays a Windows text-to-speech scratch read over the
  picture (\`tour-scratch-vo.mp4\`) so timing can be checked before a real voice is recorded.
- Record the real voice-over as one take against the picture, or scene by scene and align
  each clip to its start timecode. Leave the last 0.5 s of every scene silent.
- Captions are burned in (bottom-left lower-third). On a muted show floor they carry the
  story alone; the voice-over is for the recorded social cut and anyone wearing headphones.
`

writeFileSync(join(here, 'voiceover-script.md'), md)
console.log(`voiceover-script.md written — ${rows.length} scenes, ${TOTAL_SECONDS}s, ${totalWords} words`)
for (const r of rows) {
  const budget = Math.floor(r.seconds * 2.5)
  const flag = r.words > budget ? '  <-- over budget' : ''
  console.log(`  ${fmtTime(r.start)}  ${r.caption.padEnd(22)} ${String(r.words).padStart(3)} words / ${budget} budget${flag}`)
}
