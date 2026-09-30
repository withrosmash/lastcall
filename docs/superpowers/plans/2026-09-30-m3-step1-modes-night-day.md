# M3 step 1: Modes, Night out and Day out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** You pick Night out or Day out when you start, can switch between them partway through, and the drink list, recap, card, history and morning-after screen follow the mode.

**Architecture:** `js/modes.js` describes each mode, and screens read from it. A session carries `parts: [{ t, mode, company }]`. The helpers that read parts live in the pure `js/state.js`, so they can be tested under node. Sessions without `parts` read as a Night out with friends.

**Tech Stack:** Vanilla ES modules, Capacitor 8 Android, `npm test` (node --test), browser pane; Impeccable for the two new sheets.

**Spec:** `docs/superpowers/specs/2026-09-30-m2-modes-design.md` (build order step 1).

## Global Constraints

- Tracking (`geo.js`, native plugin) is not touched.
- Word for an adventure comes from `t()` / `phrase()` (`js/words.js`). "Challenge", never "dare". No long dashes; sentence-case labels; curly ’ in single-quoted strings.
- A new file under `js/` means an entry in `sw.js` SHELL and a CACHE bump. Bump once in this plan, to `lastcall-v26`.
- Keep existing storage keys. `prefs.recentDrinks` stays Night out's list; other modes use `prefs.recentByMode[mode]`.
- Mode keys: `night` (label "Night out"), `day` (label "Day out"). Walk and festival are later steps. Don't add them to `MODES` yet.
- Company keys: `group` ("With friends"), `solo` ("On my own").
- Day out drink list: `Coffee, Tea, Soft drink, Juice, Pint, Wine, Low/no`. Night out keeps `PRESETS` from drinks.js.
- Morning-after: Night out yes, Day out no. A session qualifies when its **last** part's mode has `morning: true`.

## Review Focus

1. **Adventures from before the update**, including one running while the update installs: no `parts`, so they must read as Night out and group everywhere, and switching must still work. (Task 1 test `partsOf falls back…`, Task 4 browser check.)
2. **Hold-to-log a drink** uses the current mode's last drink, not Night out's. (Task 2 test `recentFor per mode`.)
3. **The quick-log notification label** after switching to Day out shows a day drink, or "Drink". (Task 2.)
4. **Switching to the mode you're already in** does nothing and doesn't add a part. (Task 1 test.)
5. **Recap and card on a switched adventure** say "Day out, then Night out". Switching back again gives "Day out, then Night out, then Day out", not a deduplicated list. (Task 1 test `modeLine`.)

---

### Task 1: Modes and parts (pure)

**Files:** Create `js/modes.js`, `tests/modes.test.mjs`. Modify `js/state.js`, `sw.js` (SHELL + CACHE `lastcall-v26`).

**Interfaces (produces):**
- `modes.js`:
  - `MODES: { night: {label:'Night out', buttons:['drink','water','food','checkin','challenge','map'], drinks:<PRESETS copy>, morning:true}, day: {label:'Day out', buttons:<same>, drinks:['Coffee','Tea','Soft drink','Juice','Pint','Wine','Low/no'], morning:false} }`
  - `MODE_KEYS: string[]` (`['night','day']`)
  - `COMPANY: { group:'With friends', solo:'On my own' }`
  - `recentFor(prefs, mode): string[]`
  - `rememberFor(prefs, mode, kind): void` (mutates prefs: night writes `recentDrinks`, others write `recentByMode[mode]`, max 3, most recent first)
- `state.js`:
  - `newSession(now = Date.now(), { mode = 'night', company = 'group' } = {})` adds `parts: [{ t: now, mode, company }]`
  - `partsOf(s): Part[]` (fallback `[{ t: s.startedAt, mode:'night', company:'group' }]`)
  - `partAt(s, t): Part`
  - `currentPart(s): Part` (the last one)
  - `switchPart(s, { mode, company }, now = Date.now()): boolean` (appends a part only when mode or company differs from the current one; returns whether it did; creates `s.parts` from the fallback first if it's missing)
  - `modeLine(s): string` ("Night out", or "Day out, then Night out")
  - `hasMorning(s): boolean`
- `modes.js` stays import-free. `state.js` imports `MODES` from it.

- [ ] **Step 1: Write the failing tests** in `tests/modes.test.mjs`:
  - `newSession(1000, { mode:'day', company:'solo' }).parts` deep-equals `[{ t:1000, mode:'day', company:'solo' }]`; `newSession(1000).parts[0].mode === 'night'`.
  - `partsOf falls back to night/group for old sessions`: a session object without `parts` and with `startedAt:5` gives `[{ t:5, mode:'night', company:'group' }]`.
  - `partAt` on parts at t=0 day and t=100 night: `partAt(s, 50).mode === 'day'`, `partAt(s, 100).mode === 'night'`, `partAt(s, -1).mode === 'day'`.
  - `switchPart` to the same mode and company returns false and leaves the length at 1. To night it returns true, length 2, and `currentPart(s).mode === 'night'`. On an old session with no parts it creates two parts.
  - `modeLine`: night only → `'Night out'`; day then night → `'Day out, then Night out'`; day, night, day → `'Day out, then Night out, then Day out'`; a company-only switch (day group, then day solo) → `'Day out'`.
  - `hasMorning`: night true; day false; day then night true.
  - `recentFor per mode`: night reads `prefs.recentDrinks`; `rememberFor(prefs,'day','Coffee')` then `recentFor(prefs,'day')[0] === 'Coffee'` and `prefs.recentDrinks` is unchanged; the list is capped at 3 and deduplicated.
  - `MODES` invariants: every mode has a label, a non-empty `buttons`, a non-empty `drinks` including `'Low/no'`, and a boolean `morning`.
- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3:** Implement. `MODES.night.drinks` copies drinks.js `PRESETS` literally; modes.js must not import drinks.js, which imports the DOM. Adjacent parts that only change company don't repeat a mode label in `modeLine`.
- [ ] **Step 4:** `npm test` → all pass (words + modes).
- [ ] **Step 5:** Add `./js/modes.js` to SHELL, bump CACHE, then `npm run build` → shell verified.
- [ ] **Step 6: Commit** `M3: modes and adventure parts`

### Task 2: Drinks follow the mode

**Files:** `js/drinks.js`, `js/app.js`, `js/session.js`.

**Interfaces:** Consumes `MODES`, `recentFor`, `rememberFor`, `currentPart`. Changes `pickDrink(prefs, onPick)` to `pickDrink(prefs, mode, onPick)`, and `recentAndRest(recent, presets)` now takes the preset list.

- [ ] **Step 1:** Add to `tests/modes.test.mjs` a test for `recentAndRest(['Pint'], MODES.day.drinks)`: `top` is `['Pint']` and `rest` excludes Pint and includes Coffee. Import `recentAndRest` from a pure place: move it into `modes.js` and have drinks.js re-export it. Run it → FAIL.
- [ ] **Step 2:** Implement the move; `pickDrink` uses `MODES[mode].drinks` and `recentFor(prefs, mode)`.
- [ ] **Step 3:** app.js:
  - `logDrink` uses `rememberFor(ctx.state.prefs, currentPart(s).mode, kind)`.
  - Both places that pass a quick-log drink label (`recentDrinks[0]`, lines ~241 and ~363) use `recentFor(prefs, currentPart(s).mode)[0] || 'Drink'`.
  - session.js `addDrinkButton`: the picker gets the current mode; hold-to-log reads `recentFor(prefs, mode)[0]`.
- [ ] **Step 4:** `npm test` passes; `node --check` on every changed file.
- [ ] **Step 5: Commit** `M3: the drink list follows the mode`

### Task 3: Pick a mode when you start (Impeccable)

**Files:** `PRODUCT.md` (new, repo root), `js/session.js` (`startScreen`, new `modePicker(ctx)`), `js/app.js` (`beginNight(opts)`, `startNight`, `grantThenStart`), `js/storage.js` (`defaultPrefs` gains `lastMode:'night'`, `lastCompany:'group'`, `recentByMode:{}`), `js/icons.js` (add Lucide `moon` and `sun`), `css/style.css`.

**Interfaces:**
- `ctx.beginNight({ mode, company })`
- `startNight({ skipLocation, mode, company })` → `S.newSession(Date.now(), { mode, company })`. The chosen mode and company are saved to `prefs.lastMode` / `prefs.lastCompany`.
- The priming screen and the skip route carry the choice: store it on `ctx.pendingStart` before `go('priming')`.

- [ ] **Step 1:** Load the `impeccable:impeccable` skill. Run its context step, then `init` to write `PRODUCT.md`, a short one: Leit, what it's for, who uses it (18 to 35, UK, socialising), the constraints in this plan's Global Constraints, and "round 2 tokens and components are the design system". Commit it on its own: `Impeccable: product context`.
- [ ] **Step 2:** The **Start adventure** button opens `modePicker(ctx)`, a sheet using existing components only (`.sheet`, `.theme-tile`-style tiles, `.chips`, `btn`):
  - title `What kind of adventure?`;
  - one tile per `MODE_KEYS` entry, with its icon (`moon` for night, `sun` for day) and label, preselected from `prefs.lastMode`;
  - a chip pair `With friends` / `On my own`, preselected from `prefs.lastCompany`;
  - a primary button `t('Start {n}')`.
  - Glows are step 5, so tiles use today's colours.
- [ ] **Step 3:** Impeccable `polish` pass on the sheet only, following its craft floor. It keeps the round 2 identity; any deviation goes in `design/README.md`.
- [ ] **Step 4:** Verify in the browser pane at mobile size, dark and light: the sheet opens, the choice persists across a reload, and starting creates a session whose `parts[0]` matches.
- [ ] **Step 5: Commit** `M3: choose Night out or Day out when you start`

### Task 4: Switch mode on the live screen

**Files:** `js/session.js` (`liveScreen`, new `switchSheet(ctx)`), `js/app.js` (`switchMode({ mode, company })` on ctx), `css/style.css`.

**Interfaces:** Consumes `switchPart`, `currentPart`, `MODES`, `COMPANY`. `ctx.switchMode(choice)` calls `S.switchPart`. If it returns true, it saves, re-renders and plays the avatar's `react('checkin')` reaction.

- [ ] **Step 1:** Under the head on the live screen, add a chip button showing `${MODES[mode].label} · ${COMPANY[company]}`. It opens `switchSheet`:
  - title `Change of plan?`;
  - body `It stays one {n}. The buttons and challenges change from now.` through `t()`;
  - the same mode tiles and company chips as the picker, preselected to the current part;
  - buttons `Switch` (primary; disabled until something differs) and `Keep going` (secondary).
- [ ] **Step 2:** The live screen's buttons are built from `MODES[mode].buttons` through a key-to-button map, keeping the current layout: drink full width, then pairs. Night and Day render identically to today.
- [ ] **Step 3:** Verify in the browser:
  - start Night out, switch to Day out, and the drink picker shows the day list;
  - switch to Day out again and nothing is appended;
  - an old active session (no `parts`) switches cleanly;
  - check dark and light.
- [ ] **Step 4: Commit** `M3: switch mode partway through`

### Task 5: Recap, card, history and morning follow the mode

**Files:** `js/session.js` (`recapScreen`, `morningNight`), `js/card.js` (`placeLine`), `js/history.js` (history rows, detail head).

**Interfaces:** Consumes `modeLine`, `hasMorning`.

- [ ] **Step 1:** Add to `tests/modes.test.mjs` a test that the morning rule uses `hasMorning`. `morningNight` stays in session.js, but its mode check must be `S.hasMorning(last)`, so that test covers it. Run it → pass (from Task 1). Then wire `morningNight` to skip when `!S.hasMorning(last)`.
- [ ] **Step 2:**
  - **Recap:** add a `cap` line under the title with `modeLine(s)`.
  - **Card:** `placeLine(s)` returns `${date} · ${modeLine(s)}`. Check the line still fits at 4:5 and 9:16, both themes, both card types.
  - **History:** each row's subtitle becomes `${shortDate} · ${modeLine(s)}`.
  - **Detail:** the eyebrow becomes `${shortDate} · ${modeLine(s)}`.
- [ ] **Step 3:** Verify in the browser with seeded data: an old night, a Day out, and a Day out then Night out. The recap, card (4:5 and 9:16, dark and light), history and detail all show the right line. The morning screen shows for the switched one and not for the Day out.
- [ ] **Step 4: Commit** `M3: recap, card and history say which mode`

### Task 6: Check and ship

- [ ] **Step 1:** The 19-screen × 5-word browser sweep from M1 (no `{`, no "Last Call", no stray "night" with non-night words), plus the picker and switch sheets.
- [ ] **Step 2:** `npm test`, `npm run build`.
- [ ] **Step 3:** Final whole-branch review by a fresh reviewer, then merge and push. Watch CI to the artifact.
- [ ] **Step 4:** Update `design/README.md` (the mode picker and switch sheet are built in the app, not designed) and the memory file.

**🛑 Checkpoint for the user:** try a Day out that turns into a Night out on the phone.
