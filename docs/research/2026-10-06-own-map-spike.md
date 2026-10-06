# Our own map: groundwork

**Status:** spike done 2026-10-06; the owner decides whether to go ahead. Nothing in the app has changed.
**Why:** Esri's keyless tiles (today's maps) aren't licensed for a commercial app, and they stop at zoom 16. Mapbox charges per map load (about $5 per 1,000 after 50,000 free a month, at list price).

## What we tried
- **Source:** Protomaps publishes a daily build of the whole world's OpenStreetMap map as one PMTiles file (138.6 GB, vector tiles, zooms 0 to 15, ODbL). `pmtiles extract` copies out one region over HTTP range requests, without downloading the rest.
- **Tool:** `go-pmtiles` 1.31.2 (github.com/protomaps/go-pmtiles).
- **Drawing:** `protomaps-leaflet` 5.1.0 on Leaflet 1.9.4, the Leaflet the app already bundles. The look comes from our own palette through `paintRules(flavor)` and `labelRules(flavor, 'en')`. The trail, pins and avatar dot are ordinary Leaflet layers on top, as now.
- **Test page:** https://claude.ai/artifact/VUVBiGK6r21ZiBEKnCosLV (central London, dark and light looks, full and lighter detail, a sample Soho night).

## Measured (build of 2026-10-06)
| Extract | Size |
|---|---|
| Whole UK, zooms to 15 (full street detail) | 3.0 GB |
| Whole UK, zooms to 14 | 1.5 GB |
| Whole UK, zooms to 13 | 740 MB |
| Greater London, to 15 | 79 MB |
| Central London patch (2.4 by 2.1 km) | 3.5 MB |

UK extract time: about 9 seconds to plan; the transfer is 3.1 GB.

## Findings
- **GPS and tracking are unaffected.** The map is only the picture underneath; position comes from the phone.
- **Zoom:** the map stays sharp to zoom 18. At 19, street names grow too large in this style, so cap the map at 18 (today's Esri maps have real detail only to 16).
- **Share cards:** `protomapsL.Static` draws a map straight onto a canvas (`drawContext`), which is what the card renderer needs instead of pasting tile images.
- **Offline:** a city's file can be kept on the phone (Greater London is 79 MB), which the round 2 brief wanted.

## How it would ship
- **Hosting:** GitHub Pages can't hold it (1 GB site limit, 100 MB per file). Cloudflare R2 behind the owner's domain: storage about $0.015 per GB a month, no download charges, range requests supported. Optionally Protomaps' Cloudflare Worker, which serves ordinary z/x/y tiles so the CDN can cache them.
- **Refresh:** a monthly GitHub Actions job runs `pmtiles extract` for the UK and uploads it to R2. The owner creates the Cloudflare account and adds the upload key as a repo secret.
- **Cost at 1 million users (estimate):** about 300 million tile requests a month (10 map views of about 30 tiles each per user); R2 reads at about $0.36 per million, plus the Worker at a similar rate: roughly £100 to £250 a month.
- **Credit:** "© OpenStreetMap contributors · Protomaps" in place of the Esri credit.

## Open decisions
1. **Detail:** full (3.0 GB) or lighter (1.5 GB, stretched at street level).
2. **Go ahead:** after the domain exists, as its own milestone: a spec, then a plan.
