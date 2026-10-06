# demo-kit — booth video and presenter kit

Everything needed to put Grower Harvesting into the IFPA looping reel and to
walk someone through the live demo.

| File | What it is |
|---|---|
| `scenes.mjs` | **Source of truth** for the video: scene order, seconds per scene, captions, voice-over lines. Edit this, then re-run the scripts below. |
| `record.mjs` | Drives the running app with Playwright and records the tour (1920×1080) plus the title card. Writes WebM and, when an H.264 ffmpeg is available, MP4. |
| `write-script.mjs` | Regenerates `voiceover-script.md` (timecodes, words-per-minute check). |
| `scratch-vo.mjs` | Lays a Windows text-to-speech read over the tour so pacing can be checked before a real voice is recorded. |
| `voiceover-script.md` | Generated. The narrator's copy with timecodes. |
| `interstitial.html` | The 12 s "Up next" title card shown between clips. Open in a browser (`?loop=1` to loop) or let `record.mjs` render it. |
| `cheat-sheet.html` | Presenter cheat sheet: click path, what to say, cast, Q&A, resets. Prints to two pages. |
| `assets/` | Poppins woff2 and the RSM marks so the HTML pages work offline. |
| `out/` | Rendered videos and timing JSON (git-ignored). |

## Render the video

The seed must be current first (dates on the Dashboard's Upcoming Cuts should be
today). If not, run `supabase/migrations/008_bluestem_seed_data.sql` in the
Supabase SQL editor.

```powershell
# 1. build and serve the app (vite dev hangs on this OneDrive checkout; preview is reliable)
$env:BASE_PATH = '/'; npm run build
npx vite preview --port 5199 --strictPort      # leave running

# 2. record (new terminal)
node demo-kit/record.mjs                        # tour + title card → demo-kit/out/
node demo-kit/record.mjs --only tour --no-captions
node demo-kit/scratch-vo.mjs                    # optional: TTS pacing check
```

`record.mjs` uses Playwright's full Chromium (`channel: 'chromium'`) so the
recording matches a real browser. For MP4 it needs an ffmpeg with libx264: set
`$env:FFMPEG`, put `ffmpeg` on PATH, or `pip install imageio-ffmpeg`. Without
one you still get WebM.

Nothing the recorder does mutates demo data; it never clicks Start Harvest,
Retry, Extract or Test Connection.

## Change the script

Edit `scenes.mjs`, then:

```powershell
node demo-kit/write-script.mjs    # refresh voiceover-script.md and see the wpm check
node demo-kit/record.mjs          # re-record so the cuts land on the new timecodes
```

Keep each scene's narration under `seconds × 2.5` words; the generator flags any
line that is over.
