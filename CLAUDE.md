# Grower Harvesting (bluestem) — project notes

Bluestem Fresh Produce edition of the grower harvesting dashboard, one of the
IFPA show apps (Bluestem is RSM's fictional mock company). Read `README.md`
first. The brand and source data live in `../Blustem-company-details` (note the
folder spelling): `BRAND_GUIDE.md`, `PUN_BANK.md`, and
`Bluestem_Brand_v2_and_Data.zip` (CSV pack + logo files).

## Rules for this repo

- **This is the greenhouse edition** ("Bluestem Greens", a protected-culture
  division on a campus next to the Holland DC). The user asked for Bluestem's
  version of *greenhouse* growing; the pack itself is open-field, so the
  greenhouse structure comes from the hydroponic dataset that was live before
  the rebrand (backed up in `supabase/backups/2026-09-24-farmbox-greens-live/`)
  and the people, customers, sites and item numbering come from the pack.
- **Demo data lives in one place:** `supabase/migrations/008_bluestem_seed_data.sql`.
  It is re-runnable (clears the demo tables first). Every date is relative to
  `current_date`; never hardcode one. It ends with a reconciliation `select`
  so the numbers can be defended. The app reads live from Supabase, so after
  editing the seed, paste it into the Supabase SQL editor to retarget the demo —
  nothing in the repo runs it.
- Vocabulary: DB `fields` = **bays / rooms** (`area_acres` holds **sq ft**,
  `soil_type` the growing system), `crops.target_yield_per_acre` is **per sq ft**,
  `team_members` = staff + **harvest crew**. Yields are recorded in each crop's
  unit (heads / lbs / bunches) and the UI totals per unit — never sum across
  units. Grades: A = Premium retail, B = Foodservice, C = Processing (GRP),
  reject = compost. Column names are unchanged — only labels were renamed.
- Anything shown as failed, cancelled, or at risk uses Bluestem's fictional
  growers and customers only.
- Brand: Midnight `#00153D` sidebar chrome, RSM Blue `#009CDE` for accents,
  active nav and chart series 1; buttons and links use the deeper `#00739F`
  (AA on white). RSM Green is reserved for "good" status. D365 pages use
  Lifted Midnight `#3A4FA8` so the integration UI stays distinct. Tokens are
  in `src/index.css` (Tailwind v4 `@theme`); headings use Poppins 600 via
  `@fontsource/poppins` (no font CDN); body is Segoe UI.
- The Bluestem mark/wordmark is `src/components/BluestemMark.jsx`. The
  "Powered by RSM" mark is required on the title ribbon (`Layout.jsx`) and the
  login page — right end, left of the avatar, never beside the bluestem logo.
- Login is an email lookup against `app_users` (no password) — demo personas
  come from `employees.csv`: Ingrid Larsen / Sam Fischer (managers), Ben Carter /
  Rosa Delgado (operators). Until 008 is run, `admin@grower.local` is the only
  manager login in the database. Don't add password fields.
- Deploys on push to `master`: Cloudflare Pages via its Git integration (the live
  demo, https://grower-harvesting.rsmd365.com, built with `BASE_PATH=/`) and
  Azure Static Web Apps (`.github/workflows/azure-static-web-apps-*.yml`).
  GitHub Pages is disabled on the repo — don't re-add a `deploy-pages` workflow
  or a `public/404.html` (a 404.html turns off Cloudflare's SPA fallback).
  The router basename follows `import.meta.env.BASE_URL`; brand PNGs in
  `public/brand/` use absolute `/brand/...` paths so Vite rewrites them with the base.
