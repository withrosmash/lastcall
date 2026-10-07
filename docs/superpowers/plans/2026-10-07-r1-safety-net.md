# R1: Safety net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nothing a user does or Android does can lose, wrongly close or hide an adventure: red team items D1, D2 (stopgap), D3, D4, D6, D7, A2, A3 and C3, plus the owner's rename of First Dare.

**Architecture:** Pure fixes in js/storage.js and js/state.js (testable in node), wiring in js/app.js, js/history.js and js/map.js. No native code, and nothing that changes how tracking records. D2's real fix (storage that lasts for years) is round 2 with its own spec; this round only stops silent deletion.

**Tech Stack:** vanilla ES modules, node --test.

**Spec:** the red team report https://claude.ai/artifact/53LTSwVLvRC54MdDd6NxBg (items listed above) and the owner's picks of 2026-10-07: everything here was marked Fix.

## Global Constraints
- Copy: sentence case, no long dashes, "challenge" never "dare".
- Tracking capture (js/geo.js, the plugin, native code) is not touched.
- Bump CACHE once, to `lastcall-v42`.
- Badge slugs never change (earned badges must keep counting); only display names.

## Review Focus
1. **Older exports still import:** every export from M1 onwards (sessions without `sets`, `meals`, `challenges` or `parts`; prefs missing keys) imports and renders. (Task 1 test with an old-shape fixture.)
2. **A real export round-trips:** export, import, export again gives the same adventures. (Task 1 test.)
3. **Auto-close reopen:** carrying on an auto-closed adventure restores tracking and the notifications exactly as a live one. (browser plus phone checklist)
4. **Quick-log timing:** taps made after the last in-app activity but before reopening count in the adventure they belong to. (Task 2 test.)
5. **Render guard:** the guard never swallows a legitimate screen change (start, live, recap, morning, onboarding all still show). (browser)

---

### Task 1: Import and load can't destroy data (D1, D6 load path)

**Files:** Modify `js/storage.js`, `js/history.js:503-525`. Test: create `tests/storage.test.mjs` (stub `globalThis.localStorage` with a Map-backed object before importing).

**Interfaces — produces:**
- `normaliseSession(x) -> session | null`: null unless `x` is an object with a string `id` and finite `startedAt`; arrays `drinks, waters, meals, challenges, pins, trail, sets, parts` default to `[]` and keep only entries with a finite `t` (trail and pins also need finite or null `lat`/`lng`); `endedAt` finite or deleted.
- `migrate(data)` uses it: sessions normalised, nulls dropped, duplicates by id dropped (first kept), sorted by `startedAt` descending; `active` normalised (null if invalid); `prefs` merged only when it's a plain object; avatar colour prefs kept only when they match `/^#[0-9a-f]{6}$/i`.
- `checkImport(text) -> { ok: true, data, count } | { ok: false, reason }`: reasons `'not-json'`, `'not-leit'` (no `sessions` array).
- `importJSON(text)` keeps the current stored text under `lastcall_v1_backup` before writing; `undoImport() -> state | null` restores it.
- `history.js importData`: refuses while an adventure is live (toast "End your adventure before importing."); on a bad file, toast "That file isn't a Leit export." and nothing changes; otherwise a sheet: title "Replace your history?", body "This replaces your {n} adventures with the {m} in the file.", buttons "Replace" and "Keep mine". After replacing: toast "Imported. Tap to undo." which calls `undoImport()`.

- [ ] Tests first: `[]`, `{}`, `"hello"`, `{"name":"x"}` fail `checkImport`; `{"sessions":[null,{"id":"a","startedAt":1}]}` gives one session with every array present; an old-shape fixture (no sets, meals, parts) loads and `summarise` doesn't throw; a duplicate id is dropped; avatar colour `"red;background:url(x)"` is dropped; import then `undoImport` restores the previous text exactly; export, import, export round-trips equal.
- [ ] Watch them fail; implement; `npm test` green; commit `Import and load can't destroy your history`.

### Task 2: Auto-close and notification taps (D3, D4)

**Files:** Modify `js/state.js:295-306`, `js/app.js` (boot, drainQuickLogs), `js/session.js` (recap). Test: `tests/state.test.mjs` (new).

**Interfaces — produces:**
- `lastActivity(s)` = max of `startedAt`, `touchedAt`, and the last `t` of drinks, waters, meals, challenges, pins, trail, sets, and parts' `from`.
- `storage.save(state)` sets `state.active.touchedAt = Date.now()` when there is an active adventure.
- `S.reopen(state, s)`: moves an auto-closed `s` (flag `autoClosed: true`, set by boot) back to `state.active`, deleting `endedAt` and `autoClosed`; refuses (returns false) if another adventure is active.
- `S.eventsFor(s, events)`: keeps quick-log events with `startedAt <= t` and (no `endedAt` or `t <= endedAt`).
- Boot: when there's an active adventure, drain quick-log events first and add those that fit, then run the stale check. The stale branch also calls `keepalive.hideQuickLog()` and `keepalive.setSessionActive(false)`. The recap of an auto-closed adventure shows a secondary button "Not finished? Carry on" that calls `reopen`, then starts tracking and goes live.
- `drainQuickLogs` drops events outside the active adventure.

- [ ] Tests first: a festival day with location off, a set at +5h and a meal at +6h has `lastActivity` at +6h; `touchedAt` counts; `eventsFor` keeps an in-range tap and drops one from before `startedAt`; `reopen` restores and refuses when another adventure is live.
- [ ] Implement; `npm test`; commit `Auto-close counts everything and can be undone; notification taps land in the right adventure`.

### Task 3: Storage full never deletes (D2 stopgap)

**Files:** Modify `js/storage.js:56-72`, `js/state.js` (addFix), `js/app.js`. Test: `tests/storage.test.mjs`.

**Interfaces — produces:**
- `flush()` never removes sessions. On failure it keeps `lastError` and calls the handler registered with `onStorageError(fn)`.
- App registers a handler that opens a sheet once per launch: title "Leit's storage is full", body "Your newest changes aren't saved yet. Export your history now so nothing is lost, then delete some old adventures.", buttons "Export now" (runs the existing export) and "Later".
- `addFix` rounds `lat`/`lng` to 5 decimal places (about 1 m) before storing.

- [ ] Tests first: with a quota-limited stub, `flush` returns false, sessions are untouched, the handler is called once with the error; a stored fix has 5 decimals.
- [ ] Implement; `npm test`; commit `A full phone warns instead of deleting adventures`.

### Task 4: Blank screens and Back (D6, C3)

**Files:** Modify `js/app.js` (render, back, error hooks), `js/history.js:471-478`.

**Interfaces — produces:**
- `render()` holds a counter; if a nested `go()` rendered during `def.build`, the outer render returns without mounting.
- `render()` wraps build and mount in try/catch; on error it mounts a fallback: title "Something went wrong", body "Your adventures are safe.", buttons "Export my data" and "Back to start". The error goes to the log below.
- `window` `error` and `unhandledrejection` listeners append `{ t, msg, stack (first 500 chars), screen }` to `localStorage['lastcall_errors']`, keeping the last 20.
- `back()` skips stack entries whose `arg` is an adventure (has `id` and `startedAt`) that no longer exists in `sessions` or `active`. Delete navigates with `replace: true`.

- [ ] Verify in the browser: Back to the map after ending an adventure shows the start screen, not blank; a thrown error in a screen shows the fallback and Export works; after deleting an adventure, Back never shows it.
- [ ] Commit `No more blank screens; Back skips deleted adventures`.

### Task 5: Stops in the right place (A2, A3)

**Files:** Modify `js/map.js:198-201`, `js/state.js:220-225`. Test: `tests/state.test.mjs`.

**Interfaces — produces:**
- `S.freshFix(s, now, maxAgeMs = 3 * 60e3) -> fix | null`: the last trail point if no older than `maxAgeMs`.
- `dropPin` uses `freshFix` and never the map centre; with no fresh fix the stop is pending (or off the map with location off), and venue suggestions only run with a fresh fix.
- `placePending(s, fix)` only places a pending stop with a fix taken within 5 minutes after the stop; an older pending stop stays off the map (`pending` removed, `lat`/`lng` null).

- [ ] Tests first: `freshFix` returns null for a 10-minute-old point; `placePending` places with a fix 2 minutes later and leaves the stop off the map with one 20 minutes later.
- [ ] Implement; `npm test`; commit `Stops only use a recent position`.

### Task 6: History paging and the badge name (D7, rename)

**Files:** Modify `js/history.js:83`, `js/badges-data.js:224`.
- History shows 40, then a "Show more" button that adds 40 at a time (kept for the visit).
- "First Dare" becomes "First Challenge" (slug `first-dare` kept). Test: `tests/badges.test.mjs` asserts no badge name contains "dare" (case-insensitive).
- [ ] Commit `History shows every adventure; First Challenge`.

### Task 7: Ship
- [ ] CACHE `lastcall-v42`; `node scripts/build.mjs`; `npm test`.
- [ ] Phone checklist group "Round 7 notes" (import confirm and undo, carry on after auto-close, no blank screens, Show more, First Challenge).
- [ ] Fresh reviewer; fix Critical and Important test-first; merge, push, watch CI; update memory and the roadmap.
