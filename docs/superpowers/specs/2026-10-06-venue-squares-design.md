# Venue squares: our own nearby-venue lookup

**Status:** draft for the owner's review, 2026-10-06.

## Why
Check-in suggests nearby venues from OpenStreetMap through the free public Overpass servers. They're slow (often 5 to 10 seconds) and sometimes don't answer. The owner rejected paid services:
- **Mapbox:** its results can't be stored.
- **Geoapify:** an outside dependency.

Instead, Leit serves its own venue lookup from static files on its own domain. That's fast, nearly free and more private.

## What the owner agreed (2026-10-06)
- **Build:** a weekly job builds the venue data from OpenStreetMap and publishes it as small files.
- **Squares adapt to density:** a square splits into four while it holds more than about 300 venues. Central London ends up as squares a few hundred metres across; quiet areas stay around 5 km or larger.
- **Coverage:** the UK first.
- **Hosting:** GitHub Pages now, the owner's domain later (through Cloudflare when it exists).

## How it works

### 1. The build (weekly, GitHub Actions)
- **Source:** download the United Kingdom extract from Geofabrik (OpenStreetMap, ODbL).
- **Filter:** keep named venues where `amenity` is pub, bar, cafe, restaurant, nightclub, fast_food, biergarten or casino. These are today's `VENUE_KINDS`. Ways and areas count as their centre point.
- **Record:** each venue is `[name, lat, lng, kind]`, with lat and lng at 5 decimal places (about 1 m).
- **Square:** adaptive squares use geohash prefixes, from precision 4 (about 39 km) down to 7 (about 150 m). A square splits while it holds more than 300 venues; precision 7 never splits.
- **Output:**
  - `venues/v1/index.json`: the build date, the source date, and the list of square keys;
  - `venues/v1/sq/<geohash>.json`: one file per square, holding its venues;
  - `venues/LICENSE.md`: ODbL, "© OpenStreetMap contributors".
- **Rough size, unmeasured:** around 200,000 UK venues, a few MB of squares in total, and an index of tens of KB. Every square file is a few KB.
- **Publishing:** the weekly job force-pushes the output to an orphan `venues-data` branch, so the branch never builds up history. The Pages workflow copies that branch into the published site at `/venues/`, and runs when the branch updates as well as on every push.

### 2. In the app (check-in sheet)
- **Your own places first:** names of stops you've pinned before, within 150 m of where you are, from your own history. These are on the phone, so they're instant and work offline.
- **Venue squares:**
  - **Index:** fetch `index.json` once per week (cached), find the square containing your position, and fetch it. Add the neighbouring squares when you're within 150 m of an edge.
  - **Results:** filter to 150 m (today's radius) and sort nearest first.
  - **Cache:** squares are cached on the phone until the next weekly index, so a place you check in at again is instant.
- **Fallback:** today's Overpass lookup, used only when the position is outside the covered area or a square can't be fetched.
- **Chips:** up to 6 suggestions, the same as today. Own places come first, and a place that appears in both lists shows once.
- **Credit:** the "Places from OpenStreetMap" credit stays.

### 3. Privacy
- The server only ever sees which square was asked for: a neighbourhood in a city, or a wider area elsewhere. Never the exact position.
- Overpass, as a fallback, still receives the exact position. That's no worse than today.
- The privacy wording on the check-in sheet stays accurate: places come from OpenStreetMap.

### 4. Later (not in this build)
- **City pack:** keep a whole city's squares on the phone for offline check-ins.
- **More countries:** a setting in the build. Very large regions need a bigger build machine than GitHub's free one, about £5 a month.
- **Moving to the domain:** change one base URL in the app when the domain exists.

## Interfaces (for the plan)
- `scripts/venues/build.mjs` reads newline-delimited GeoJSON (what `osmium export` produces) and writes the output folder. It's pure enough to test on a small fixture.
- `js/venues.js` is a pure module except for `fetch`:
  - `geohash(lat, lng, precision)`;
  - `squareFor(index, lat, lng)` returns the longest matching key;
  - `neighbours(key)`;
  - `nearbyFrom(list, lat, lng, radiusM)`;
  - `ownPlaces(sessions, lat, lng, radiusM)`;
  - `mergeSuggestions(own, venues, max)`.
- `js/map.js`: the check-in sheet calls `suggestVenues(ctx, here)` in place of `nearbyVenues(here)`.

## Tests
- **Geohash:** matches known values.
- **Squares:** the longest-prefix lookup works, and positions on square edges fetch their neighbours.
- **Build:** splits a dense fixture into precision-6 or precision-7 squares, keeps a sparse one at precision 4, and never writes a square over 300 unless it's already precision 7.
- **Suggestions:** own places come first, duplicates are dropped case-insensitively, and the limit is 6.
- **Fallback:** a position outside the index uses Overpass.

## Risks
- **Geofabrik changes its file names:** the build fails loudly, and the app keeps the last published data.
- **The Pages deploy publishes the venue data too:** one Pages site serves both the web preview and the venues.
- **ODbL:** the published squares are a derived database. They're open by being public files, and the licence file sits beside them.
