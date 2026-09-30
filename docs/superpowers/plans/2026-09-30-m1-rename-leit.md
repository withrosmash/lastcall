# M1: Rename to Leit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Testers update in place and the app is called Leit everywhere they can see, with the word for an outing set in one place, so Adventure, Outing, Quest, Sidequest or Night can each be tried with a one-line change.

**Architecture:** A new pure module `js/words.js` holds the five word sets and a `t()` function that fills tokens (`{n}`, `{a}` …) in any string. Every user-facing "night" string goes through `t()`. The set in use is a constant in words.js (user decision 2026-09-30: no picker in Settings). The product name is a straight text swap; internal identifiers do not change.

**Tech Stack:** Vanilla ES modules (no bundler), Capacitor 8 Android, `node --test` for the one pure module, browser pane for everything else.

**Spec:** the M1 section of the roadmap agreed in chat on 2026-09-30, plus the user's notes: experiment with adventure / quest / sidequest / outing; keep the `lastcall` GitHub repo; the domain comes later.

## Global Constraints

- Product name in all user-facing text: `Leit` (capital L, no styling).
- Keep unchanged: `applicationId`/`appId`/`namespace` `com.withrosmash.lastcall`, Java package, storage key `lastcall_v1`, plugin name `LastCallNative`, SharedPreferences name `lastcall`, notification channel IDs, `ic_stat_lastcall`, CI artifact `lastcall-debug-<sha>`, keystore cache key, repo name. Changing any of these loses tester data or breaks the update-in-place.
- No long dashes (— or –) in any user-facing copy. Sentence case for labels.
- Never frame the app as a drinking app in new copy.
- Adding `js/words.js` means adding `./js/words.js` to `SHELL` in `sw.js` and bumping `CACHE` to `lastcall-v24` (the build fails on a missing SHELL entry).
- Default wording set: `adventure`.
- Badge names (e.g. "First Night") stay as they are in M1; per-mode badges are M2.

## Review Focus

1. **Articles:** "an adventure", "an outing", but "a quest", "a sidequest", "a night". Pinned in `tests/words.test.mjs`.
2. **Sentence-start capitals:** `{A}`/`{N}`/`{Ns}` must capitalise ("An adventure under 90 minutes…"). Pinned in the same test.
3. **Unfilled tokens on screen:** any string that skips `t()` shows a literal `{n}`. Task 4 walks every screen and checks `document.body.innerText` has no `{`.
4. **Old backups:** a `lastcall-YYYY-MM-DD.json` exported before the rename must still import. Task 4 imports one.
5. **Existing testers:** an update must keep their nights (same storage key). Task 4 checks with seeded data.

---

### Task 1: Word sets and `t()`

**Files:**
- Create: `js/words.js`
- Create: `tests/words.test.mjs`
- Modify: `sw.js` (SHELL + CACHE `lastcall-v24`)

**Interfaces:**
- Produces:
  - `WORDINGS: Record<'adventure'|'outing'|'quest'|'sidequest'|'night', { label, n, ns, art, endTitle?, recapTitle? }>`
  - `setWording(key: string): void` (unknown keys fall back to `adventure`)
  - `currentWording(): string`
  - `t(text: string, key?: string): string` fills `{n}` noun, `{N}` capitalised, `{ns}` plural, `{Ns}`, `{a}` article + noun, `{A}` capitalised
  - `phrase(name: 'endTitle'|'recapTitle', key?: string): string` returns the set's override, else the generic: `End the {n}?` / `What {a}.`, filled

Word sets (exact):

| key | label | n | ns | art | endTitle | recapTitle |
|---|---|---|---|---|---|---|
| adventure | Adventure | adventure | adventures | an | | |
| outing | Outing | outing | outings | an | | |
| quest | Quest | quest | quests | a | | Quest complete. |
| sidequest | Sidequest | sidequest | sidequests | a | | Sidequest complete. |
| night | Night | night | nights | a | Call it a night? | That was a night. |

- [ ] **Step 1: Write the failing test** `tests/words.test.mjs` (node:test + node:assert):
  - `t('{a}', 'adventure') === 'an adventure'`, `t('{a}', 'quest') === 'a quest'`, `t('{a}', 'outing') === 'an outing'`, `t('{a}', 'sidequest') === 'a sidequest'`
  - `t('{A} under 90 minutes', 'outing') === 'An outing under 90 minutes'`
  - `t('Start {n}', 'quest') === 'Start quest'`, `t('{Ns}', 'night') === 'Nights'`, `t('No {ns} yet.', 'sidequest') === 'No sidequests yet.'`
  - `phrase('endTitle', 'night') === 'Call it a night?'`, `phrase('endTitle', 'adventure') === 'End the adventure?'`
  - `phrase('recapTitle', 'adventure') === 'What an adventure.'`, `phrase('recapTitle', 'quest') === 'Quest complete.'`, `phrase('recapTitle', 'outing') === 'What an outing.'`
  - after `setWording('nonsense')`, `currentWording() === 'adventure'`; after `setWording('quest')`, `t('{n}') === 'quest'`
  - a string with no tokens comes back unchanged
- [ ] **Step 2: Run** `node --test tests/` from `~/lastcall`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `js/words.js`.** It must not import anything, so it runs under node.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all pass.
- [ ] **Step 5: Wire it in.** Add the SHELL entry and bump CACHE.
- [ ] **Step 6: Run** `npm run build`. Expected: no SHELL drift error.
- [ ] **Step 7: Commit** `M1: word sets for trying adventure, outing, quest, sidequest, night`

### Task 2: Leit everywhere the name shows

**Files:** `index.html` (title), `manifest.webmanifest` (name, short_name, description `Track the adventure. Piece it together later.`), `package.json` (description only), `capacitor.config.json` (`appName` only), `android/app/src/main/res/values/strings.xml` (`app_name`, `title_activity_main` only), `js/notify.js`, `js/geo.js` (title), `js/app.js` (hand-off mark), `js/session.js` (eyebrows at :54 and :90, battery line :287), `js/card.js` (both wordmarks, file names, toasts), `js/history.js` (GPX name and creator, export file names, toasts, import error), `android/.../LastCallNative.java` (Download and Pictures folders `Leit`), `android/.../BootReceiver.java` (title), `ANDROID.md`.

**Interfaces:** Consumes nothing. Exported file names change from `lastcall-…` to `leit-…`. The folders become `Download/Leit` and `Pictures/Leit`; old files stay where they are.

Exact copy:
- Tracking notification title: `Leit`
- Boot notification: title `Leit stopped tracking`, text `Your phone restarted. Tap to pick up where you left off.`, channel description `Shown when tracking was still on after a restart.`
- Quick log channel description: `Log a drink or water from the shade while you're out.`
- Battery line (session.js :287): `Battery optimisation is on for Leit, so your phone can put it to sleep while you're out.`
- Import error: `That file didn't read as Leit data.` (keep the curly apostrophe the file already uses)

- [ ] **Step 1:** Make the swaps above. Leave every identifier in Global Constraints alone.
- [ ] **Step 2: Verify.** Run `grep -rn "Last Call" js index.html manifest.webmanifest capacitor.config.json android/app/src/main/res android/app/src/main/java`. Expected: no user-facing hits. Comments are fine.
- [ ] **Step 3: Commit** `M1: the app is called Leit`

### Task 3: Every "night" goes through `t()`

**Files:** `js/session.js`, `js/history.js`, `js/map.js`, `js/challenges.js`, `js/wardrobe.js`, `js/badges-data.js` (criteria only), `js/badges.js` (render criteria through `t()`), `js/ui.js`, `js/geo.js`.

**Interfaces:** Consumes `t`, `phrase` from Task 1. Module-level tables (`REQ` in wardrobe.js, `ONBOARD` in session.js, `BADGES` criteria, `CHALLENGES`) keep raw tokens. They are filled where they are shown, so a wording change applies without reloading modules.

Exact copy (templated strings shown with tokens):

| Where | New |
|---|---|
| session.js tagline :56 | `Track the {n}.` / `Piece it together later.` |
| session.js :69 | `Last {n} · <date>` |
| session.js :76, :309, :401 | `Start {n}`, `End {n}`, `End {n}` |
| session.js :91 | `It lives on this phone and keeps you company on your {ns}. You can change how it looks whenever you like.` |
| session.js :106 | `…which is how each {n} gets its steps and the walk gets its pace.` |
| session.js :113 | `While {a} is running, a notification stays on your lock screen. …` (rest unchanged) |
| session.js :207 | `See the {n}` |
| session.js :256, map.js :60 | `Location is off, so there's no map for this {n}. Drinks, water and time are all still being tracked.` |
| session.js :260 | eyebrow `On the {n}` |
| session.js :355 | `No water reminders this {n}. Everything else is tracked the same.` |
| session.js :397 | `phrase('endTitle')` |
| session.js :435, :436 | `Last {n}`, `phrase('recapTitle')` |
| history.js :21 | `No {ns} yet. Your first one shows up here.` |
| history.js :45, :69, map.js :280 | `{Ns}` |
| history.js :102 | `Stops Android putting the app to sleep while you're out.` |
| history.js :115 | `All set. Nothing will stop {a} recording.` |
| history.js :249, :341, :350 | `Delete {n}`, `Delete this {n}?`, `{N} deleted.` |
| history.js :265, map.js :42 | aria `Your route` |
| history.js :282 | aria `Time through the {n}` |
| history.js :299 | `No route was recorded on this {n}.` |
| map.js :55 | title `Your route` |
| challenges.js :27 | `…best photo of the {n}…` |
| challenges.js :32 | `Genuinely thank whoever is working here and mean it.` |
| challenges.js :33 | `Give this {n} an official title, and get everyone to use it from now on.` |
| challenges.js :65 | `Challenge · <count> done so far` |
| wardrobe.js REQ | every `night` becomes `{n}`; `Start a night before 5pm.` becomes `Start {a} before 5pm.`; `first night out` becomes `first {n}`. `requirement()` returns `t(REQ[slug])` |
| wardrobe.js :68 | `Your best so far is <n>.` |
| badges-data.js criteria | `night` becomes `{n}`, `nights` becomes `{ns}`; a sentence-start `A night` / `Night` becomes `{A}` |
| ui.js :103, geo.js :46 | `Leit is tracking your {n}.` (geo reads it when tracking starts) |

- [ ] **Step 1:** Apply the table.
- [ ] **Step 2: Verify.** Run `grep -rnE "['\`\"][^'\`\"]*\b[Nn]ights?\b" js/*.js`. Expected: only the `night` word set in words.js, badge names/slugs, and code identifiers.
- [ ] **Step 3: Run** `node --test tests/ && npm run build`. Expected: pass, no drift.
- [ ] **Step 4: Commit** `M1: the word for an outing comes from the word set`

### Task 4: Verify and ship

- [ ] **Step 1:** Seed a history with nights via `/design/handoff.html` (the app flushes localStorage on pagehide, so seed there). Open the app in the browser pane at mobile size.
- [ ] **Step 2:** For each of the five sets (switch with `setWording` from the console, by importing `./js/words.js`), visit start, live night, end sheet, recap, morning, history, night detail, badges, customise locked sheet, and the unlock sheet. On each, check `document.body.innerText` contains no `{` and no `Last Call`. With any set other than `night`, it also contains no `night` apart from badge names and "Nightcap". This catches strings that wrap across lines, which the Task 3 grep misses. Screenshot start and recap for `adventure` and `quest`.
- [ ] **Step 3:** Render a route card and a photo card with `__renderForTest`. The wordmark reads `Leit` in dark and light.
- [ ] **Step 4:** Import a backup exported by the current build (7fbf618 format). Expected: `Imported.` and the nights appear.
- [ ] **Step 5:** Push. Watch the CI run through the public GitHub API until `lastcall-debug-<sha>` is uploaded.
- [ ] **Step 6:** Update `design/README.md` ("where the build knowingly differs": internal IDs keep the old name on purpose) and the memory file.

**🛑 Checkpoint for the user:** install the build and live with "adventure"; say if another word should be tried next. Then decide the pronunciation, the tagline and the wordmark style for the Claude Design brief (M2).
