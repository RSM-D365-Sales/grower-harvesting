# Grower Harvesting (bluestem) — project notes

Bluestem Fresh Produce edition of the grower harvesting dashboard, one of the
IFPA show apps (Bluestem is RSM's fictional mock company). Read `README.md`
first. The brand and source data live in `../Blustem-company-details` (note the
folder spelling): `BRAND_GUIDE.md`, `PUN_BANK.md`, and
`Bluestem_Brand_v2_and_Data.zip` (CSV pack + logo files).

## Rules for this repo

- **Demo data lives in one place:** `supabase/migrations/008_bluestem_seed_data.sql`.
  It is built from the pack's `grower_blocks`, `harvest_events`, `items`,
  `sites`, `customers`, `employees` and `production_orders` CSVs and is
  re-runnable (it clears the demo tables first). Every date is relative to
  `current_date`; never hardcode one. It ends with a reconciliation `select`
  so the numbers can be defended. The app reads live from Supabase, so after
  editing the seed, paste it into the Supabase SQL editor to retarget the demo.
- App vocabulary is Bluestem's: DB `fields` = **grower blocks** (BlockId +
  town in `location`), `team_members` = field staff + **harvest crews**,
  `crops` = crop × variety. Yields are recorded in **lbs**; the pack's trade
  unit, grade (US Fancy / US #1 / US #2), crew and load ticket ride in notes.
  Column names are unchanged — only labels were renamed.
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
  come from `employees.csv`: Sam Fischer (manager), Ingrid Larsen / Rosa
  Delgado (operators). Don't add password fields.
- Deploys to GitHub Pages on push to `master` (`.github/workflows/deploy-pages.yml`),
  base path `/grower-harvesting/`. Brand PNGs in `public/brand/` are
  referenced with absolute `/brand/...` paths so Vite rewrites them with the base.
