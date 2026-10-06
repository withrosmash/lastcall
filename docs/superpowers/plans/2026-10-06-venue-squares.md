# Venue squares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check-in suggests nearby food and drink places from Leit's own weekly-built venue squares, served as static files, with type-to-filter and Overpass only as a fallback.

**Architecture:** A weekly GitHub Actions job turns the Geofabrik UK extract into adaptive geohash square files on an orphan `venues-data` branch. The Pages deploy copies them to `/venues/`. On the phone, `js/venues.js` finds the squares the 150 m circle touches, fetches and caches them (Cache API), and the check-in sheet shows own places first, then the nearest venues, narrowed by what's typed.

**Tech Stack:** vanilla ES modules, Node 22 test runner, osmium-tool on ubuntu-latest, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-06-venue-squares-design.md`

## Global Constraints
- Copy: sentence case, no long dashes, "challenge" never "dare".
- Tracking code is not touched.
- New `js/` files go in `sw.js` SHELL; bump CACHE once to `lastcall-v40`.
- Venue base URL: `https://withrosmash.github.io/lastcall/venues/v1/` (one constant, `VENUES_BASE`).
- Radius 150 m; up to 6 chips; split squares above 300 places; precision 4 to 7; 5 decimal places; duplicates are the same name (case-insensitive) within 50 m.
- The "Places from OpenStreetMap" credit stays on the sheet.
- Work on branch `venue-squares`; commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Offline or no signal:** cached squares still give suggestions; with nothing cached, own places still show, the status says so, and Drop pin always works. (Task 4 test: fetch rejects, cached squares used.)
2. **Outside the UK (a holiday):** no square matches, so Overpass is used, with no error shown. (Task 4 test.)
3. **Awkward names:** quotes, accents, emoji and CJK (`米家 Mi Canteen`) render as chips, filter, and select. (Task 1 test for filter; Task 4 browser check.)
4. **Sheet closed before results:** nothing writes into a detached sheet and nothing rejects unhandled. (Task 4 browser check.)
5. **New weekly index:** squares from the old build are never mixed in, and the old ones are pruned. (Task 4 test: cache URLs carry the build stamp.)

---

### Task 1: Venue logic (`js/venues.js`, pure parts)

**Files:**
- Create: `js/venues.js`
- Test: `tests/venues.test.mjs`
- Modify: `sw.js` (SHELL gains `./js/venues.js`; CACHE `lastcall-v40`)

**Interfaces:**
- Produces:
  - `VENUE_TAGS = { amenity: [...15], shop: ['bakery','deli','pastry'], leisure: ['bowling_alley'], club: ['social'] }` (the spec's list, in its order)
  - `kindOf(tags: object) -> string|null` (`club=social` → `'social_club'`; amenity wins over shop when both)
  - `geohash(lat, lng, precision) -> string`
  - `squaresFor(keys: Set<string>, lat, lng, radiusM) -> string[]`: samples a 7 by 7 grid over the circle's bounding box and returns, deduplicated, the longest key in `keys` that prefixes each sample's precision-7 hash. Empty when none match.
  - `nearbyFrom(venues: Array<[name,lat,lng,kind]>, lat, lng, radiusM) -> Array<{name, d, kind}>`: within radius, nearest first.
  - `ownPlaces(sessions, active, lat, lng, radiusM) -> Array<{name, d, own: true}>`: pins from past sessions and the active one, with a position, named (not `Unnamed stop` or `Stop`), unique by folded name (nearest kept), nearest first.
  - `mergeSuggestions(own, venues) -> Array<{name, d, own?}>`: own first, then venues; a folded name appearing twice shows once (the own copy).
  - `fold(str) -> string`: lower case, accents stripped (NFD, drop combining marks), trimmed.
  - `filterByText(list, text, max = 6) -> list`: empty text gives the first `max`; otherwise entries whose folded name contains the folded text, order kept, first `max`.
  - `overpassQuery(lat, lng, radiusM) -> string`: one `nwr(around:...)["name"][...]` clause per tag key from `VENUE_TAGS`, `out center 60;`.

- [ ] **Step 1: Write the failing tests** in `tests/venues.test.mjs`:
  - `geohash(57.64911, 10.40744, 11) === 'u4pruydqqvj'`; `geohash(51.5121, -0.1315, 7) === 'gcpvj12'`.
  - `kindOf({amenity:'pub'}) === 'pub'`, `kindOf({club:'social'}) === 'social_club'`, `kindOf({shop:'coffee'}) === null`, `kindOf({amenity:'parking'}) === null`.
  - `squaresFor(new Set(['gcpv']), 51.5121, -0.1315, 150)` deep-equals `['gcpv']`; with keys `new Set(['gcpvj12','gcpvj13','gcpvj'])` from a point 10 m inside the shared edge of `gcpvj12` and `gcpvj13`, the result includes both; a point in Madrid gives `[]`.
  - `nearbyFrom` drops a place 200 m away and sorts 20 m before 90 m.
  - `ownPlaces` ignores `Unnamed stop`, pins with `lat: null`, and pins 300 m away; two pins named `the grapes` and `The Grapes` give one entry.
  - `mergeSuggestions([{name:'The Grapes',d:40,own:true}], [{name:'the grapes',d:41},{name:'Kings Arms',d:60}])` gives names `['The Grapes','Kings Arms']`.
  - `filterByText([{name:'De Hems'},{name:'Café Nero'},{name:'米家 Mi Canteen'}], 'de h')` gives `['De Hems']`; `'cafe'` gives `['Café Nero']`; `'米家'` gives the canteen; `''` with 8 entries gives 6.
  - `overpassQuery(51.5, -0.1, 150)` contains `["shop"~"^(bakery|deli|pastry)$"]`, `["club"~"^(social)$"]` and `out center 60;`.
- [ ] **Step 2:** `node --test tests/venues.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the exports above in `js/venues.js`. Distances use `haversineM` from `js/state.js`. Add the file to `sw.js` SHELL and bump CACHE to `lastcall-v40`.
- [ ] **Step 4:** `npm test` and `node scripts/build.mjs`. Expected: all pass; the build reports no SHELL drift.
- [ ] **Step 5: Commit** `Venues: shared tag list, squares, nearby, own places and filter`.

### Task 2: Square builder (`scripts/venues/build.mjs`)

**Files:**
- Create: `scripts/venues/build.mjs`
- Test: `tests/venues-build.test.mjs`

**Interfaces:**
- Consumes: `VENUE_TAGS`, `kindOf`, `geohash` from `js/venues.js`; `haversineM` from `js/state.js`.
- Produces:
  - `venueFromFeature(feature) -> [name, lat, lng, kind] | null`: GeoJSON Point uses its coordinates; LineString, Polygon and MultiPolygon use the centre of their bounding box; no name or no kind gives null. Coordinates rounded to 5 decimals.
  - `dedupe(venues) -> venues`: same folded name within 50 m keeps the first.
  - `splitSquares(venues, { cap = 300, min = 4, max = 7 }) -> Map<string, venues[]>`: group by precision `min`, split a group into its 32 children while it holds more than `cap` and its key is shorter than `max`.
  - `main(argv)`: `node scripts/venues/build.mjs <in.geojsonseq> <outDir> [--source=<ISO date>]` reads the file line by line (stripping a leading `\x1e`), writes `<outDir>/v1/index.json` as `{ v: 1, built, source, count, squares: [sorted keys] }`, `<outDir>/v1/sq/<key>.json` as a plain array of records, and `<outDir>/LICENSE.md`, then prints the count, square count, total bytes and largest file. Runs only when the file is executed directly.

- [ ] **Step 1: Write the failing tests:**
  - A Point pub gives `['The Grapes', 51.51211, -0.13149, 'pub']` from coordinates `[-0.131487, 51.512113]`; a Polygon building gives its box centre; an unnamed cafe and a `shop=coffee` give null.
  - Two `Kings Arms` 30 m apart dedupe to one; 80 m apart stay two; `Kings Arms` and `Kings Head` 5 m apart stay two.
  - 301 places in one precision-4 square split, so no square holds more than 300; 10 places spread over the UK stay at precision 4; 400 places at one point stop at precision 7 with 400 in it.
  - `main` on a 3-line fixture in a temp dir writes an index whose `squares` match the `sq/` filenames and a LICENSE.md containing `© OpenStreetMap contributors`.
- [ ] **Step 2:** `node --test tests/venues-build.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `scripts/venues/build.mjs`.
- [ ] **Step 4:** `npm test`. Then a full-scale dry run: convert the survey file `scratchpad/venues/uk.tsv` to GeoJSON lines (a scratch script, not committed), run `main` into the scratchpad and check: about 160,000 places, 5,000 to 7,000 squares, largest square under 20 KB.
- [ ] **Step 5: Commit** `Venues: weekly square builder`.

### Task 3: Weekly workflow and Pages

**Files:**
- Create: `.github/workflows/venues.yml`
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: `venues.yml`**: triggers `schedule: '0 3 * * 1'`, `workflow_dispatch`, and `push` to main on paths `scripts/venues/**`, `js/venues.js`, `.github/workflows/venues.yml`. Permissions `contents: write`, `actions: write`. Concurrency group `venues`. Steps: checkout; setup Node 22; `sudo apt-get install -y osmium-tool`; download `https://download.geofabrik.de/europe/united-kingdom-latest.osm.pbf`; `osmium tags-filter` with `nwr/amenity=...`, `nwr/shop=bakery,deli,pastry`, `nwr/leisure=bowling_alley`, `nwr/club=social`; `osmium export -f geojsonseq`; source date from `osmium fileinfo -g header.option.osmosis_replication_timestamp`; `node scripts/venues/build.mjs`; in the output folder, `git init`, commit as `github-actions[bot]`, force-push to `venues-data`; then `gh workflow run pages.yml --ref main` with `GH_TOKEN: ${{ github.token }}`. Any failed step fails the job, so the last published data stays.
- [ ] **Step 2: `pages.yml`**: after `node scripts/build.mjs`, a step that clones the `venues-data` branch (`git clone --depth 1 --branch venues-data https://github.com/${{ github.repository }} venues-src || true`) and, if it exists, copies its contents to `www/venues/` without its `.git`. A missing branch only skips venues.
- [ ] **Step 3: Verify:** `ruby -ryaml -e 'ARGV.each { |f| YAML.load_file(f) }' .github/workflows/venues.yml .github/workflows/pages.yml` exits 0; `npm test` still passes.
- [ ] **Step 4: Commit** `Venues: weekly build to venues-data and Pages publishing`.

### Task 4: Check-in uses the squares

**Files:**
- Modify: `js/venues.js` (fetch layer), `js/map.js:198-303`, `sw.js` (activate and fetch)
- Test: `tests/venues.test.mjs`

**Interfaces:**
- Consumes: Task 1's exports.
- Produces:
  - `VENUES_BASE`, `INDEX_MAX_AGE = 7 days`.
  - `suggestVenues(ctx, here, { fetchImpl = fetch, cacheImpl = globalThis.caches, now = Date.now() } = {}) -> Promise<{ venues: Array<{name,d,kind}>, source: 'squares'|'overpass' }>`: index from cache when under 7 days old, else fetched (5 s timeout) and stored with an `x-leit-fetched` header; a failed refetch falls back to the stale cached index. Squares from `squaresFor(...)` are fetched in parallel at `${VENUES_BASE}sq/<key>.json?b=<built>` (5 s timeout), cache first. When a new index arrives, cache entries whose `b` differs are deleted. No matching square, no index, or a failed square fetch goes to `overpassVenues(here)`. Without `cacheImpl` it fetches every time.
  - `overpassVenues({lat,lng}, radiusM = 150, fetchImpl = fetch)`: today's `nearbyVenues`, moved here, using `overpassQuery` and reading `e.lat ?? e.center?.lat`.
  - The cache is named `leit-venues-v1`.

- [ ] **Step 1: Write the failing tests** with a stub `fetchImpl` (a map from URL to JSON or a rejection) and an in-memory `cacheImpl` (`open`, `match`, `put`, `keys`, `delete`):
  - Inside the index, venues come from squares, `source === 'squares'`, nearest first, nothing over 150 m.
  - Outside the index (Madrid), the stub's Overpass URL is called and `source === 'overpass'`.
  - Index fetched 2 days ago is not refetched; 8 days ago is; an 8-day-old index whose refetch rejects is still used.
  - Second call for the same square makes no square fetch.
  - A new `built` deletes the old `?b=` entries.
  - Square fetch rejects with the square cached gives cached venues; not cached gives Overpass.
- [ ] **Step 2:** `node --test tests/venues.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the fetch layer in `js/venues.js`.
- [ ] **Step 4: Check-in sheet** in `js/map.js`: delete `OVERPASS`, `VENUE_KINDS` and `nearbyVenues`. On open with a position: own places (`ownPlaces(ctx.state.sessions, s, ...)`) render as chips at once; when `suggestVenues` resolves, the list becomes `mergeSuggestions(own, venues)`. A `renderChips()` shows `filterByText(list, nameInput.value)` and runs on each input. Status copy:
  - while loading: `Looking for places nearby…` (unchanged);
  - with results: `Tap one, or type to search. Places from OpenStreetMap.`;
  - typed with no match: `No match nearby. Your own name is fine.`;
  - nothing found: unchanged; lookup failed with own places shown: `Couldn’t reach the venue list. Your places are above.`; failed with none: unchanged.
  The selected chip keeps `aria-pressed` when the list re-renders.
- [ ] **Step 5: `sw.js`**: `activate` keeps caches named `leit-venues-*`; `fetch` returns early for any path containing `/venues/`.
- [ ] **Step 6: Verify:** `npm test`; `node scripts/build.mjs`. In the browser at `http://localhost:8010` with seed data: copy Task 2's dry-run output to `venues-dev/` in the repo (not committed, deleted afterwards) and patch `window.fetch` in the page to rewrite `VENUES_BASE` to `/venues-dev/v1/`. Fake a position in Soho, open Check in, and check: own places show at once, venue chips follow, typing `de h` narrows to De Hems, `米家` names work, closing the sheet straight away leaves no console errors.
- [ ] **Step 7: Commit** `Check-in: own places, venue squares and type to filter`.

### Task 5: Ship
- [ ] Phone checklist (`docs/testers/phone-checklist.md` and the artifact): check-in in a town, in a busy street (type to filter), with flight mode on after one check-in, and abroad if possible.
- [ ] Fresh reviewer on the branch; fix Critical and Important test-first.
- [ ] Merge `--ff-only`, push main; watch "Build Android APK", "Deploy web preview to Pages" and the first "Venues" run; report the real counts and sizes; confirm `https://withrosmash.github.io/lastcall/venues/v1/index.json` loads.
- [ ] Update memory: the venue lookup is self-built squares; no Geoapify key needed.
