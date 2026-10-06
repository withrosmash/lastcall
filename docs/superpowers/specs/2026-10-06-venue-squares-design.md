# Venue squares: our own nearby-venue lookup

**Status:** approved by the owner, 2026-10-06 (scope and density settled after a measured survey).

## Why
Check-in suggests nearby venues from OpenStreetMap through the free public Overpass servers. They're slow (often 5 to 10 seconds) and sometimes don't answer. The owner rejected paid services:
- **Mapbox:** its results can't be stored.
- **Geoapify:** an outside dependency.

Instead, Leit serves its own venue lookup from static files on its own domain. That's fast, nearly free and more private.

## What the owner agreed (2026-10-06)
- **Build:** a weekly job builds the venue data from OpenStreetMap and publishes it as small files.
- **Squares adapt to density:** a square splits into four while it holds more than about 300 venues. Central London ends up as squares a few hundred metres across; quiet areas stay around 5 km or larger.
- **Coverage:** the UK first.
- **Scope:** anywhere that serves food or drink, fast food included (see the list below).
- **What you see:** the 6 nearest places within 150 m, from your own square plus any neighbouring square the 150 m circle reaches, with type-to-filter over the same set.
- **Hosting:** GitHub Pages now, the owner's domain later (through Cloudflare when it exists).

## How it works

### 1. The build (weekly, GitHub Actions)
- **Source:** download the United Kingdom extract from Geofabrik (OpenStreetMap, ODbL).
- **Filter:** keep named places with any of these tags. Ways and areas count as the centre of their bounding box.
  - `amenity`: pub, bar, cafe, restaurant, nightclub, fast_food, biergarten, casino, food_court, ice_cream, social_club, events_venue, music_venue, hookah_lounge, karaoke_box;
  - `shop`: bakery, deli, pastry;
  - `leisure`: bowling_alley;
  - `club`: social.
- **Left out on purpose:** shops that sell for taking away (`shop=coffee`, `shop=tea`, `shop=alcohol`). Breweries and distilleries are left out too; most taprooms are already mapped as pubs or bars.
- **Duplicates:** the same name (ignoring case) within 50 m is one place. A pub mapped both as a point and as a building is common.
- **Record:** each venue is `[name, lat, lng, kind]`, with lat and lng at 5 decimal places (about 1 m). `kind` is the tag value (for example `pub`, `bakery`, `bowling_alley`); `club=social` is recorded as `social_club`.
- **Square:** adaptive squares use geohash prefixes, from precision 4 (about 39 km) down to 7 (about 150 m). A square splits while it holds more than 300 venues; precision 7 never splits.
- **Output:**
  - `venues/v1/index.json`: the build date, the source date, and the list of square keys;
  - `venues/v1/sq/<geohash>.json`: one file per square, holding its venues;
  - `venues/LICENSE.md`: ODbL, "© OpenStreetMap contributors".
- **Measured size (survey of 2026-10-06, from Overpass):**
  - 164,691 places with the original eight kinds, about 175,000 with the full list;
  - 5,759 squares, 7.5 MB in total, the largest 13.6 KB, the median 0.4 KB; the index's keys are 53 KB;
  - Soho's squares are 95 by 152 m (precision 7, 42 places in the one at Old Compton Street); Manchester's Northern Quarter and Shoreditch are about 700 m squares; a market town is one 25 km square;
  - no precision-7 square goes over 300;
  - the most any check-in downloads is 37 KB.
- **Density, for reference:** a typical UK spot has 7 places within 150 m; the busiest 1% have 73 or more; the busiest spot in Soho has 204 within 150 m and 22 within 25 m. That's why the square is only the download unit, and the phone picks what to show.
- **Publishing:** the weekly job force-pushes the output to an orphan `venues-data` branch, so the branch never builds up history. The Pages workflow copies that branch into the published site at `/venues/`, and runs when the branch updates as well as on every push.

### 2. In the app (check-in sheet)
- **Your own places first:** names of stops you've pinned before, within 150 m of where you are, from your own history. These are on the phone, so they're instant and work offline.
- **Venue squares:**
  - **Index:** fetch `index.json` at most once a week (cached), then find every square the 150 m circle around you touches. Usually that's one; in central London it can be a dozen tiny ones.
  - **Results:** everything within 150 m (today's radius), nearest first.
  - **Cache:** squares are cached on the phone until the next weekly index, so a place you check in at again is instant. The cache survives app updates (the service worker leaves it alone).
- **Type to filter:** typing in the name box narrows the chips to nearby places whose names contain what you typed (ignoring case and accents), nearest first. With nothing typed, the chips are the 6 nearest. Typing never blocks a custom name.
- **Fallback:** today's Overpass lookup, with the same list of kinds, used only when the position is outside the covered area or the index or a square can't be fetched within 5 seconds.
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
  - `VENUE_TAGS` and `kindOf(tags)`, shared with the build so both use one list;
  - `squaresFor(keys, lat, lng, radiusM)` returns the squares the circle touches (longest matching prefix at each sample point);
  - `nearbyFrom(list, lat, lng, radiusM)`;
  - `ownPlaces(sessions, lat, lng, radiusM)`;
  - `mergeSuggestions(own, venues, max)`.
- `js/map.js`: the check-in sheet calls `suggestVenues(ctx, here)` in place of `nearbyVenues(here)`.

## Tests
- **Geohash:** matches known values.
- **Squares:** the longest-prefix lookup works; a position mid-square needs one square; one near an edge also gets its neighbour.
- **Type to filter:** "de h" finds "De Hems"; "cafe" finds "Café Nero".
- **Build:** splits a dense fixture into precision-6 or precision-7 squares, keeps a sparse one at precision 4, and never writes a square over 300 unless it's already precision 7.
- **Suggestions:** own places come first, duplicates are dropped case-insensitively, and the limit is 6.
- **Fallback:** a position outside the index uses Overpass.

## Risks
- **Geofabrik changes its file names:** the build fails loudly, and the app keeps the last published data.
- **The Pages deploy publishes the venue data too:** one Pages site serves both the web preview and the venues.
- **ODbL:** the published squares are a derived database. They're open by being public files, and the licence file sits beside them.
