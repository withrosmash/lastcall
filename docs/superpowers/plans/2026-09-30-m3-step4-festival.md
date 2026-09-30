# M3 step 4: Festival — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Festival becomes the fourth mode: a Saw a set button, sets on the map and in the timeline, festival reviews built from several days, and six Festival badges.

**Architecture:**
- **Festival mode:** one more `MODES` entry, with `morning: 'late'` (the morning-after screen only when the day ends after midnight) and `headline: 'festival'` (a Sets tile).
- **Sets:** kept on the session as `sets: [{ t, name, lat, lng }]`. `sliceTo` keeps them.
- **Festival reviews:** kept in `state.festivals: [{ id, name, sessionIds, createdAt }]`.
- **The review screen and its card:** both use `S.mergeSessions(sessions)`, a read-only combined session (`id: 'f…'`, `sessionIds`) that the existing recap tiles and card can draw.
- **Badge evaluation:** `evaluate` gains a `festivals` input.

**Spec:** `docs/superpowers/specs/2026-09-30-m2-modes-design.md` (build order step 4, Festival section).

## Global Constraints

- The festival entry:
  - key `festival`, label `Festival`, Lucide `tent` icon, picker hint `Stages, fields, one more act.`;
  - buttons `['drink','water','food','set','challenge','map']` (no Check in);
  - drinks `Pint, Cider, Cocktail can, Spirit + mixer, Low/no`, drink hint `Frozen margarita`.
- **Saw a set sheet:**
  - title `Who are you watching?`;
  - a text field (placeholder `Act name`);
  - chips for acts already logged in festival adventures from the last 5 days, including this one;
  - primary `Log set`.
  - It saves the latest fix's lat/lng, or none. Toast `<name> logged. Tap to undo.`
- **Map and timeline:** sets appear as amber markers with the act name. In the timeline they read `Set: <name>`.
- **Festival review:**
  - a `Make a festival` row in History when there are 2+ Festival adventures;
  - a pick screen with checkboxes, a name field (default `Festival, <first day's short date>`) and `Make festival` (enabled at 2+ days);
  - the festival screen shows the days, total steps and distance, every act seen (unique, in order first seen), badges earned on those days, `Make a card`, and `Delete review` (with confirm; the days are kept).
  - Deleted days drop out of reviews quietly.
- `storage.migrate` and `EMPTY` gain `festivals: []`.
- Badges, category `Festival`, accents from the round 3 delivery, no item unlocks:

| slug | name | criteria | accent | rule |
|---|---|---|---|---|
| `front-row` | Front Row | 5 sets in one festival day | pink | festival slice sets ≥ 5 |
| `headliner` | Headliner | See a set after 10pm | pink | a festival-slice set with hour ≥ 22 or < 5 |
| `stage-hopper` | Stage Hopper | Sets from 3 spots at least 200m apart | mint | 3 located sets in one adventure pairwise ≥ 200 m |
| `hydration-station` | Hydration Station | 5 waters in a festival day | mint | festival slice waters ≥ 5 |
| `discovery` | Discovery | 10 different acts across one festival | amber | a review whose days' sets have ≥ 10 unique names |
| `full-weekend` | Full Weekend | A festival of 3+ days | forest | a review with ≥ 3 existing days |

- New JS files get SHELL entries, and CACHE bumps to `lastcall-v29`.

## Review Focus

1. **A festival review that includes a deleted day** skips it. A review left with fewer than 2 days still opens and can be deleted. (test plus browser)
2. **Old backups have no `festivals`,** and import still works. (test on `migrate`)
3. **Saw a set with no GPS** saves without a location and never counts towards Stage Hopper. (test)
4. **Headliner:** a set at 00:30 counts, a set at 9pm doesn't. (test)
5. **The festival card** shows badges from every day in the review, not none. (browser)

---

### Task 1: Festival mode, sets, merge (pure)

**Files:** `js/modes.js`, `js/state.js` (`addSet`, `sliceTo` keeps sets, `hasMorning` late rule, `mergeSessions`, `festivalActs`), `js/storage.js` (`festivals`), `js/icons.js` (`tent`, `music`), `js/modepick.js` (hint), `tests/festival.test.mjs`.

- [ ] **Failing tests:**
  - `MODE_KEYS` ends with `festival`;
  - `addSet` with and without a location;
  - `sliceTo` keeps sets;
  - `hasMorning`: festival ending 23:30 the same day is false, ending 01:00 the next day is true;
  - `mergeSessions`:
    - `startedAt` is the earliest, `endedAt` the latest;
    - trails, pins, sets, drinks and waters are concatenated in time order;
    - `distanceM` and `steps` are summed;
    - `sessionIds` lists the days;
    - `parts` is `[{ mode:'festival' }]`;
  - `festivalActs(sessions)` gives unique names, case- and space-insensitive, first spelling kept;
  - `migrate` of data without `festivals` gives `[]`.
- [ ] **Implement.** Commit `M3: Festival mode and sets`.

### Task 2: Saw a set, live tiles, map and timeline

**Files:** `js/session.js` (the `set` button key, the set sheet, festival live and recap tiles `Drinks, Water, Sets, Steps or Distance`), `js/app.js` (`logSet` on ctx), `js/map.js` (set markers on the live map and the night map), `js/history.js` (timeline entries), `css/style.css` (`.dot-set`).

- [ ] **Build.** Browser check: a festival adventure logs a set with and without GPS; the chips offer earlier acts; the timeline and map show sets. Commit `M3: Saw a set`.

### Task 3: Festival reviews

**Files:** new `js/festival.js` (the `festivalPick` and `festivalScreen` screens), `js/app.js` (SCREENS `festivalPick`, `festival`; `makeFestival`, `deleteFestival`), `js/history.js` (the row and the list of reviews), `js/card.js` (badge filter uses `s.sessionIds || [s.id]`), `sw.js`.

- [ ] **Build.** Browser check:
  - make a review from 3 days;
  - its screen totals match;
  - the card shows the combined route and badges;
  - delete a day and the review still opens;
  - delete the review and the days remain.
- [ ] Commit `M3: festival reviews`.

### Task 4: Festival badges

**Files:** `js/badge-checks.js` (festival checks; `evaluate({ …, festivals = [] })`), `js/app.js` (`syncBadges` passes festivals and runs after `makeFestival`, with a toast for fresh badges), `js/badges-data.js`, `tests/badges.test.mjs`.

- [ ] **Failing tests** for each rule, including Review Focus 3 and 4, plus the six badges listed under category `Festival`.
- [ ] **Implement.** Commit `M3: Festival badges`.

### Task 5: Check and ship

- [ ] Browser: the picker's four tiles, the festival live screen, morning-after rules, the Festival badge group in dark and light, and the five-word sweep. Then a fresh reviewer, the fix pass, merge, push, CI and memory.
