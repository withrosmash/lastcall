# M3 step 2: Challenges by mode, Day out badges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Challenges fit the mode and company you're in, 17 new challenges join the pool, the six Day out badges can be earned, and First Night becomes First Adventure.

**Architecture:** The challenge list moves into a pure `js/challenges-data.js`, with `modes` and `group` on every entry and a pure `poolFor()`. The badge rules move out of the DOM-bound `badges.js` into a pure `js/badge-checks.js`, so the new rules are tested under node. `badges.js` re-exports `evaluate`. Day out badges see the Day out slice of an adventure (`S.sliceTo(s, 'day')`), the same way Night out badges see theirs.

**Tech Stack:** Vanilla ES modules, `npm test` (node --test), browser pane.

**Spec:** `docs/superpowers/specs/2026-09-30-m2-modes-design.md` (build order step 2).

## Global Constraints

- "Challenge", never "dare", in user-facing copy. No long dashes. Curly ’ inside single-quoted strings.
- Mode keys on challenges may name modes not built yet (`walk`, `festival`); `poolFor` must ignore that.
- New JS files go in `sw.js` SHELL, and CACHE bumps to `lastcall-v27`.
- Badge slugs never change; First Night's slug stays `first-night`.
- Day out badges and their accents (from the round 3 delivery): `day-into-night` pink, `tourist` mint, `explorer` forest, `brunch-club` amber, `caffeine-trail` amber, `sunday-best` pink. Category `Day out`. They unlock no items.

## Review Focus

1. **A Day out on my own must still offer challenges:** at least 10 fit (test `poolFor day/solo`).
2. **Once every fitting challenge has been done,** the pool resets rather than coming up empty (test).
3. **Old sessions (no parts)** pick from the Night out / group pool (test).
4. **Explorer** counts a stop as new only if its name was never pinned in any earlier adventure, in any mode. The first-ever adventure's stops are all new (test).
5. **Day Into Night** needs a Day out part followed later by a Night out part, not the reverse (test).

---

### Task 1: Challenges by mode and company

**Files:**
- Create: `js/challenges-data.js` (`CHALLENGES`, `poolFor`)
- Create: `tests/challenges.test.mjs`
- Modify: `js/challenges.js` (imports the data, `pick(session, exclude)` uses `poolFor`)
- Modify: `js/modepick.js` (switch body copy)
- Modify: `sw.js`

**Interfaces:**
- Produces:
  - `CHALLENGES: { id, text, modes: string[], group: boolean }[]`
  - `poolFor(list, part, done: Set<string>) → Challenge[]`:
    - fits = `c.modes.includes(part.mode) && (part.company === 'group' || !c.group)`;
    - returns fits minus `done`;
    - if that's empty, returns fits;
    - if fits is empty, returns the whole list.
- Tags for the existing 26:
  - `ALL = ['night','day','walk','festival']`.
  - Venue-bound `['night','day']`, group: seat-swap, swap-orders, plan-heist, compliment-staff. `compliment-staff` is `group: false`.
  - Strangers around `['night','day','festival']`, group: dramatic-photo, photograph-stranger.
  - Alone-OK, ALL, `group: false`: serious-object, best-photo.
  - `menu-critic` works alone: `['night','day','festival']`, `group: false`.
  - Everything else: ALL, `group: true`.
- The 17 new challenges, Humanizer-polished (id: text, modes, group):
  - `older-than`: Find something older than your grandparents and take its photo. [day, walk] solo
  - `dream-door`: Take a photo of a door you’d like to live behind. [day, walk] solo
  - `five-birds`: Spot five different birds before your next stop. Made-up names count. [walk, day] solo
  - `best-view`: Find the best view within ten minutes of here. Look at it for a full minute before you take a photo. [walk, day] solo
  - `other-path`: Take a path you’d normally walk past and follow it for five minutes. [walk, day] solo
  - `five-hellos`: Say hello to the next five people you pass. [walk] solo
  - `bench-plaque`: Find a bench with a plaque and read the whole thing. [walk, day] solo
  - `keepsake`: Keep a leaf, a stone or a ticket stub to remember today by. [walk, day, festival] solo
  - `film-set`: Take a photo that makes this place look like a film set. [day, walk, festival] solo
  - `phone-down`: Go the next five minutes without looking at your phone once. [walk, day] solo
  - `dog-name`: Give the next dog you see a full name, middle name included. [walk, day] solo
  - `new-chorus`: Pick an act you’ve never heard of and learn one of their choruses before the set ends. [festival] solo
  - `swap-picks`: Swap recommendations with a stranger, then go and see their pick. [festival] solo
  - `best-outfit`: Find the best outfit on site and tell its owner exactly why. [festival] solo
  - `photobomb`: Get your group into the background of someone else’s photo without them noticing. [festival, day] group
  - `new-chant`: Get your group chanting for an act you’ve only just discovered. [festival] group
  - `oldest-date`: Race your group to find the oldest date written or carved on anything nearby. [walk, day] group

- [ ] **Step 1: Write the failing tests:**
  - 43 challenges, ids unique;
  - every entry has non-empty `modes` drawn from ALL and a boolean `group`;
  - no text contains "dare", "—" or "–";
  - `poolFor day/solo` has ≥10 entries, all `group: false`;
  - `poolFor night/group` contains `plan-heist` and not `five-birds`;
  - `poolFor` with every fitting id in `done` returns the full fitting list;
  - `poolFor` with `{mode:'walk', company:'solo'}` excludes `seat-swap`.
- [ ] **Step 2:** `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement.
  - `challenges.js` `pick(session, exclude)` builds `done` from the session's challenges plus `exclude`, and uses the **current part** (`S.currentPart`).
  - Switch sheet body: `It stays one {n}. Drinks and challenges change from now.`
- [ ] **Step 4:** `npm test` passes; SHELL entry added; CACHE `lastcall-v27`; `npm run build` verified.
- [ ] **Step 5: Commit** `M3: challenges fit the mode and company`

### Task 2: Badge rules in a pure module, plus the Day out set

**Files:**
- Create: `js/badge-checks.js`, `tests/badges.test.mjs`
- Modify: `js/badges.js` (imports `evaluate` from badge-checks and re-exports it; UI stays), `js/badges-data.js` (rename plus 6 entries), `js/modes.js` (`DAY_BADGES`), `js/wardrobe.js` if it names First Night, `sw.js`.

**Interfaces:**
- Produces:
  - `evaluate({ sessions, prefs, flags })` in `badge-checks.js`, same contract as today;
  - `DAY_BADGES: Set` in modes.js.
- Day checks run on `dayDone = done.filter(hasMode day).map(sliceTo day)`, except `day-into-night` (whole session) and `explorer` (needs history):
  - `day-into-night`: some day part is followed later by a night part.
  - `tourist`: day slice has ≥6 pins.
  - `explorer`: aggregate over `done` in chronological order. For a session with a day part, count its day-slice pin names (trimmed, lowercased, unique) that appear in no earlier session's pins; true if ≥3 in any session.
  - `brunch-club`: a day slice meal before 11:00 local time.
  - `caffeine-trail`: ≥3 day slice drinks of kind `Coffee`.
  - `sunday-best`: a day slice whose `startedAt` falls on a Sunday.
- badges-data entries:

| slug | name | criteria |
|---|---|---|
| `day-into-night` | Day Into Night | Turn a day out into a night out |
| `tourist` | Tourist | 6+ stops in one day out |
| `explorer` | Explorer | 3 stops you’ve never been to before |
| `brunch-club` | Brunch Club | Food before 11am on a day out |
| `caffeine-trail` | Caffeine Trail | 3 coffees in one day out |
| `sunday-best` | Sunday Best | A day out on a Sunday |

  First Night becomes `"name": "First Adventure"`.

- [ ] **Step 1: Write the failing tests** in `tests/badges.test.mjs`, importing from `badge-checks.js`:
  - `day-into-night`: earned for day then night, not for night then day;
  - `tourist`: earned for 6 pins in the day slice, not for 5 day plus 1 night;
  - `explorer`: earned on the first-ever day out with 3 named stops; not earned when 2 of the 3 names appeared in an earlier night out;
  - `brunch-club`: earned for a 10:30 meal on a day out, not for one on a night out;
  - `caffeine-trail`: earned for 3 coffees, not for 2 coffees and a tea;
  - `sunday-best`: earned for a day out starting on Sunday 2026-09-27;
  - regression: 5 coffees on a Day out earn no `brand-loyal`, and an old session with 5 pints does;
  - `BADGES` includes all six with category `Day out`, and `first-night` is named `First Adventure`.
- [ ] **Step 2:** `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Move the helpers (`kindCounts`, `maxRun`, `crossesHour`, `nudgeNeverFired`) and both check tables into badge-checks.js unchanged. `badges.js` keeps only the UI.
- [ ] **Step 4:** `npm test` passes; SHELL and build verified; `node --check` on all changed files.
- [ ] **Step 5: Commit** `M3: Day out badges, and First Night becomes First Adventure`

### Task 3: Check and ship

- [ ] **Step 1: Browser:**
  - Badges screen shows a Day out group with the six new badges (greyed until earned), in dark and light.
  - A Day out's challenge sheet only offers day-fitting challenges; switching to On my own gives only solo ones.
  - The 20-screen × 5-word sweep stays clean.
- [ ] **Step 2:** Final whole-branch review by a fresh reviewer, then merge, push and watch CI to the APK artifact.
- [ ] **Step 3:** Update `design/README.md` and memory.

**🛑 Checkpoint for the user:** a Day out on your own, with challenges.
