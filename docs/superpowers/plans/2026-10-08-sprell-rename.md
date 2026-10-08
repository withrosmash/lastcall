# Sprell rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leit becomes Sprell everywhere: name, tagline, wordmark, icons, store graphics, app ID and internal names, with nothing called Leit or Last Call left in what ships.

**Architecture:** The delivered round 5 outlines (design/round5) are the source for every wordmark and icon. js/wordmark.js holds the wordmark path; scripts/icons.mjs learns to fill curved paths so it can keep drawing every launcher, splash and web icon itself. The app ID changes to `app.sprell`, so this is a fresh install, which also lets internal names and storage keys change cleanly.

**Tech Stack:** vanilla ES modules, Capacitor 8 Android (Java), node --test, macOS `sips` for one JPEG conversion.

**Spec:** the owner's decisions of 2026-10-07 and 2026-10-08 (docs/ROADMAP.md, design/BRIEF-ROUND-5.md, design/round5/README.md):
- name Sprell; tagline "Track the adventure. Relive it later.";
- wordmark: the delivered Comfortaa outlines, white on dark, dark green (#114530) on light;
- launcher icon: the full word on forest green #114530;
- app ID `app.sprell`;
- "no remaining Leits or Last Calls".

## Global Constraints
- Copy: sentence case, no long dashes, "challenge" never "dare". The name is "Sprell" in copy and "sprell" in the wordmark.
- Tracking behaviour isn't changed: the native rename moves code without editing logic.
- Historical documents (docs/superpowers plans and specs, docs/audit, design briefs and earlier design rounds) keep their old names; they're records.
- Allowed leftovers, each commented where it lives:
  - `VENUES_BASE` keeps `withrosmash.github.io/lastcall/` (the GitHub repo name; it moves to sprell.app later);
  - `lastcall_v1` is read once as a fallback so the web preview keeps its data.
- Bump CACHE to `sprell-v43`.

## Review Focus
1. **Native rename:**
   - manifest components resolve under the new namespace;
   - the plugin is registered and called by the same name;
   - the quick-log PendingIntent action matches its receiver;
   - the boot receiver and both notification channels work.
   CI compiles it, but runtime mismatches only show on a phone.
2. **Wordmark sizes:** start screen, walkthrough, route card and photo card (Dark, Light and Halo text themes, with the photo card's shadow) look as large and sit as level as before, now that the box includes the "p" descender.
3. **Icons:**
   - the adaptive foreground stays inside the 66dp safe zone;
   - the themed (monochrome) icon draws;
   - the status bar icon is a clean white silhouette at 24dp.
4. **Storage fallback:** the web preview reads `lastcall_v1` when `sprell_v1` is absent and then saves under `sprell_v1`.
5. **No leftovers:** nothing user-visible says Leit or Last Call: notifications, toasts, saved file and folder names, GPX, settings, the app name, the web title.

---

### Task 1: The wordmark

**Files:**
- Modify: `js/wordmark.js`, `js/session.js:64,169`, `js/card.js:879,989`
- Test: `tests/wordmark.test.mjs`

**Interfaces — produces:**
- `WORDMARK = { x, y, w, h, paths }`: the single path from `design/round5/sprell-white.svg` with its viewBox (`5.67 -78.1 311.63 101.5`), unchanged.
- `wordmarkWidth(height)`: `w/h × max(height, MIN_HEIGHT)`.
- `wordmarkSvg(height)`: uses the delivered viewBox, `fill="currentColor"`, `aria-label="Sprell"`.
- `drawWordmark(g, x, y, height, opts)`: translates by `-WORDMARK.x, -WORDMARK.y` after scaling, so (x, y) is still the top of the box.
- `rects()` is removed; icons.mjs no longer uses it.

- [ ] **Step 1: tests first.**
  - The paths equal the delivered SVG's path once its `<metadata>` is stripped.
  - The viewBox numbers match.
  - `wordmarkWidth(101.5)` equals 311.63.
  - The aria-label is "Sprell".
  - Keep the halo test.
- [ ] **Step 2:** watch them fail; implement; `npm test` green.
- [ ] **Step 3: sizes in the browser.** Set heights at the call sites so the word looks the same size as before on the start screen, the walkthrough and both cards. As a starting point, 15 → 22 in session.js and 30 → 44 in card.js, moving `y` up by the extra descender so the baseline holds. Check light and dark, and export a card.
- [ ] **Step 4:** commit `Sprell wordmark`.

### Task 2: Icons and store graphics

**Files:**
- Modify: `scripts/icons.mjs`
- Generated: `android/app/src/main/res/**` icons, `icons/*.png`, `design/round5/play-icon-512.png`, `design/round5/feature-graphic-1024x500.jpg`
- Test: `tests/icons.test.mjs` (new)

**Interfaces — produces (in icons.mjs, exported for the test):**
- `pathToPolygons(d) -> number[][][]`: flattens SVG path commands (M, L, H, V, Q, C, Z, absolute and relative) into closed polygons. Curves are split into at least 8 segments.
- `fillCoverage(polys, P, box) -> Float32Array`: nonzero-winding scanline fill of the polygons (in `box` units) onto a P×P grid with 4×4 supersampling. Each value is coverage from 0 to 1.

**What it draws:**
- **Launcher icons:** the word from `design/round5/icon-word-foreground.svg` (108 box) for every launcher PNG (legacy square and round masks, adaptive foreground, web 192, 512, maskable and apple-touch), plus the splash images, all on #114530.
- **Monochrome layer:** `ic_launcher_monochrome.xml` uses the `icon-word-monochrome.svg` path as vector pathData in a 108 viewport.
- **Status bar icon:**
  - `ic_stat_sprell.xml` is a 24dp vector of the `icon-mark-monochrome.svg` path, with its viewport cropped to the "s" plus 15% padding;
  - `ic_stat_lastcall.*` is removed;
  - the `capacitor.config.json` `smallIcon` becomes `ic_stat_sprell`.
- **Store graphics:**
  - `design/round5/play-icon-512.png` from the rasterizer;
  - `feature-graphic-1024x500.jpg` from the delivered PNG with `sips -s format jpeg -s formatOptions 95` (opaque, as Play requires).
- The round 3 store lockup and feature graphic and the round 4 icon PNG are no longer generated.

- [ ] **Step 1: tests first.**
  - `pathToPolygons('M0 0H10V10H0Z')` gives one 4-corner polygon.
  - A circle made of four C curves has an area within 1% of πr².
  - `fillCoverage` of the unit square on a 10×10 grid is 1 inside and 0 outside.
  - The icon word's coverage stays inside the 66dp safe zone (18 to 90 in the 108 box).
- [ ] **Step 2:** watch them fail; implement; `node scripts/icons.mjs`; `npm test`.
- [ ] **Step 3:** look at the generated PNGs, the splash and the vectors in the browser.
- [ ] **Step 4:** commit `Sprell icons, splash and store graphics`.

### Task 3: The rename

**Files:** everything in the inventory below.
**Test:** `tests/names.test.mjs` (new). It reads every shipped file (`js/**`, `css/**`, `index.html`, `manifest.webmanifest`, `sw.js`, `capacitor.config.json`, `package.json`, `android/app/build.gradle`, `android/app/src/main/**` except binaries, `.github/workflows/android.yml`) and asserts no match for `/leit|last ?call/i`. The only exceptions are the two allowed leftovers, each on a line containing `allowed-old-name`. Test files themselves are excluded.

**Inventory, mechanical except where noted:**
- **Names and copy:**
  - app name in `strings.xml`, `capacitor.config.json`, `manifest.webmanifest`, `index.html <title>`;
  - every user string listed by `git grep -n -E "Leit|Last Call"` in js and java (notifications, toasts, settings, battery note, numbers screen, storage-full sheet, GPX `creator`, export toasts);
  - saved names `sprell-YYYY-MM-DD.png|.gpx|.json`;
  - folders `Pictures/Sprell` and `Download/Sprell`.
- **Tagline:** "Relive it later." in `js/session.js:66`, `manifest.webmanifest`, `package.json`. The sample in `tests/words.test.mjs` follows.
- **Storage:**
  - `KEY = 'sprell_v1'`; `load()` falls back to `lastcall_v1` (allowed-old-name) when `sprell_v1` is absent;
  - `index.html`'s theme pre-paint reads the same two keys;
  - `sprell_errors`, and the backup key follows `KEY`.
- **Venues:** `sprell-venues-v1`, `x-sprell-fetched`, and the sw.js prefix. `VENUES_BASE` stays (allowed-old-name).
- **Import:** the import check reason becomes `'not-sprell'`.
- **Native:**
  - package `com.withrosmash.lastcall` → `app.sprell` (move the java folder; update `package` lines);
  - `namespace` and `applicationId` `app.sprell`;
  - `capacitor.config.json` `appId`;
  - `LastCallNative` → `SprellNative`: the Java class, `@CapacitorPlugin(name = "SprellNative")`, `registerPlugin` in MainActivity and keepalive.js;
  - PREFS `"sprell"`, channels `sprell_quicklog` and `sprell_resume`, action `app.sprell.QUICK_LOG`;
  - comments follow.
- **Build:** `package.json` name `sprell`; CI artifact `sprell-debug-<sha>`, keystore cache key `sprell-debug-keystore-v1` (a fresh key is fine on a fresh app ID).
- **Comments:** comments in shipped files that name Leit or Last Call as the current app. css/tokens headers, `scripts/import-avatar-art.mjs`; rerun the importer, and the existing art test proves the pixels are identical.
- **Docs:** `README.md`, `ANDROID.md`, `PRODUCT.md`, `docs/ROADMAP.md`, `docs/testers/*`, `design/dev-seed.html` title.

- [ ] **Step 1:** write `tests/names.test.mjs`; watch it fail with the full list.
- [ ] **Step 2:** work through the inventory until it passes; `npm test`; `node scripts/build.mjs`.
- [ ] **Step 3:** test the storage fallback in the browser: with only `lastcall_v1` set, the app opens with that history, and after a save `sprell_v1` exists.
- [ ] **Step 4:** a browser pass over the start screen, walkthrough, settings, numbers, history and a card export.
- [ ] **Step 5:** commit `Leit is now Sprell`.

### Task 4: Ship
- [ ] CACHE `sprell-v43`; build; `npm test`.
- [ ] Phone checklist: a new "Moving to Sprell" group at the top, then a round 8 group:
  - export history in Leit, install Sprell, import, check, then uninstall Leit;
  - icon, splash and themed icon;
  - notification icon and texts;
  - saved files in Pictures › Sprell and Downloads › Sprell;
  - tracking, quick log and the boot notice still work.
- [ ] Fresh reviewer; fix Critical and Important test-first; merge; push; watch CI (the APK is now `sprell-debug-<sha>`).
- [ ] Final sweep: `git grep -n -i -E "leit|last ?call"` across the whole repo, outside the records. Report anything left and why.
- [ ] Update memory and the roadmap.
