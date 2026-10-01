# Leit: Impeccable technical audit

Date: 2026-10-01. Platform: web (Capacitor 8 WebView, vanilla ES modules). Scope: every screen and sheet listed in the brief, in dark and light, at 375 x 812 and 360 x 740, plus a 130% scale pass. Design authority: the round 2 system (`css/tokens/*.css`, `design/round2/`). Every difference listed in `design/README.md` was treated as intentional and is not reported here.

**How the evidence was gathered.** The app was driven in the Claude browser pane (Chromium) at http://localhost:8010 with emulated phone viewports and both themes, using seeded data: nine past adventures, a festival, live adventures in all four modes with a route, a 0 km night with location off, a fresh install with no adventures, and very long stop and act names. Contrast was measured from computed styles: text colour (with opacity) composited over the real background stack, including the radial glow evaluated at the text's own position. The 5.5% grain overlay was ignored, so glow numbers are slightly optimistic. Not tested: TalkBack on a device, real touch gestures (clicks only, no synthesised touch), Android's system font size inside the WebView, and the photo picker beyond a synthetic image.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | Small grey labels fail contrast on every screen (3.5:1 on tiles), and the whole screen is a live region, so the timer is read out every second |
| 2 | Performance | 3 | Lean and offline; only minor waste (Leaflet parsed at every launch) |
| 3 | Responsive Design | 3 | No overflow at 360px even at 130%; text is fixed in px, a few targets under 44px, long names spill across maps |
| 4 | Theming | 3 | Full token system and a careful light theme; labels over the glow fail in light (2.9 to 3.4:1) and one map colour is hard-coded |
| 5 | Implementation Integrity | 3 | Coherent and product-specific; isolated drift from the round 2 components (label colour, zeroed stats) |
| **Total** | | **14/20** | **Good (address weak dimensions)** |

## Implementation Integrity Verdict

**Pass.** The build expresses one coherent, product-specific system. Every colour, radius, type role and duration resolves to the round 2 tokens; the light theme re-declares every alias as designed; mode glows are generated from the same recipe as the brand bloom (`js/glow.js`); icons are one inlined Lucide set at one stroke; the avatar engine is the designed art. Nothing reads as a generic template.

Detector results:

- **Static scan** (`impeccable detect --json js/*.js css/*.css css/tokens/*.css index.html`): **0 findings** across 39 files, also 0 with `--no-config`. There is no detector config or inline ignore in the repo, so nothing was suppressed.
- **Rendered scan** (supplementary, `detect --viewport 375x812 http://localhost:8010/`): 7 warnings, all checked in context and all **false positives for this product**:
  - `radial-spotlight-glow` on `#bloom`: the forest bloom is the brand's identity, specified token for token in round 2.
  - `buried-raster` at opacity 0.055: the grain layer, which round 2 says to keep on every bloom to stop banding.
  - `dark-glow` x2 (#7EE0C0 zero-offset shadow): `--glow-mint` on the primary button, a design token.
  - `body-text-viewport-edge` x2 (14px gutter): `--pad-screen-x: 14px` is the system's screen padding.
  - `tiny-text` 11.5px: `--fs-caption`, the system's caption size. (Smaller text the detector did not catch, 9px and 10px, is reported below as a real issue.)

Verified drift from the round 2 system, found by hand:

- Tile keys, units and field labels use `--muted` (#6B6B6B). The design system's StatTile uses `--faint` (#A3A3A3, 7.3:1 on tiles) for the key and `--muted-up` for the unit (`design/round2/designs/_ds/.../_ds_bundle.js` lines 196 to 240). The design system uses `--muted` for text almost nowhere; the build uses it in 11 places.
- The StatTile contract says "Unavailable stats are hidden, never zeroed". The build shows `Distance 0.0 km` with location off and `Steps 0` without a step counter, on screen and on share cards.
- `btn--sm` is used in `js/badges.js:71` and is not defined anywhere in `css/style.css` (harmless, but dead).

## Executive Summary

- Audit Health Score: **14/20** (Good)
- Issues found: **P0: 0, P1: 4, P2: 12, P3: 5** (21 total)
- Top issues:
  1. **[P1]** The small grey labels on tiles, sheets and lists measure 3.5:1 to 3.9:1 in dark, below AA. It comes from one token choice and is drift from the round 2 StatTile.
  2. **[P1]** Labels sitting on the glow (screen eyebrows such as "On the adventure", "History", "Customise") fall to 2.7:1 on the Day out glow in dark and 2.9 to 3.4:1 on every screen in light.
  3. **[P1]** `<main id="app" aria-live="polite">` makes the whole app a live region: TalkBack would read the live timer every second and re-read the whole screen after every tap.
  4. **[P1]** Bottom sheets (every log, the mode picker, End) have no accessible name, don't move focus into themselves, leave the screen behind them focusable and don't hand focus back.
  5. **[P2]** Stats that can't be measured show as zero ("0.0 km" with location off, "Steps 0" without a step counter), on screen and on the share card, which also draws an empty half-card when there is no route.
- Recommended next steps: fix the two contrast tokens first (one CSS edit each removes most failures), then the live region and the sheet focus handling, then the zeroed-stat and empty-state behaviour.

## Detailed Findings by Severity

### P1 Major

**[P1] Small grey labels fail contrast throughout (dark theme)**
- **Location**: `css/style.css:140` `.tile__k`, `:144` `.tile__u`, `:195` `.field__k`, `:211` `.listrow__m`, `:228` `.tl__t`, `:422` `.mode-tile__hint`; `js/badges.js:64` (locked badge names).
- **Category**: Accessibility / Implementation Integrity
- **Impact**: Every stat tile key ("Drinks", "Water", "Distance"), every unit ("km", "/km"), every field label ("Something else", "Name this stop", "Title"), history and festival row details ("3h 30m", "2.4 km", "0 sets"), timeline times, the mode picker's hints and 37 locked badge names render #6B6B6B. Measured: **3.46:1 on tiles (#141414), 3.65:1 on sheets (#0D0D0D), 3.94:1 on black**. These are 11.5 to 12px, so they need 4.5:1. In a dark bar at 2am these are the labels that tell you what each number is. Light theme passes (#4A576B, 6.5:1).
- **WCAG/Standard**: 1.4.3 Contrast (Minimum), AA. Round 2 StatTile uses `--faint` for keys and `--muted-up` for units.
- **Recommendation**: Point `.tile__k` and `.field__k` at `--faint` and `.tile__u`, `.listrow__m`, `.tl__t`, `.mode-tile__hint` and locked badge names at `--muted-up` (#8A8A8A, 4.9:1 on tiles, 5.6:1 on black), as the design system does. Keep `--muted` for large text only (the ended timer is fine at 44px).
- **Suggested command**: `/impeccable colorize`

**[P1] Labels over the glow fail contrast, worst in light and on mode glows**
- **Location**: `.eb` (`css/style.css:80`) wherever a screen's eyebrow, section label or caption sits in the top third: live screen, history, badges, settings, customise, festival, detail; `.cap` "Started 9:49"; customise "Resting · tap for another face"; selected range chip "8 weeks" in light.
- **Category**: Accessibility / Theming
- **Impact**: Measured across the text of "On the adventure" (left edge to right edge): dark Night out **5.7 to 3.7:1**, dark Walk **3.0:1**, dark Day out **2.7:1**, dark Festival **4.1:1**; light, every mode **2.9 to 3.4:1**. In light, "History" is 3.1:1, "Customise" 3.0:1, "Resting · tap for another face" 3.6:1, "Started" 3.8 to 4.0:1 and the mint selected chip 3.9:1. Round 2 quoted 4.9:1 for the dark eyebrow on the bloom, which holds only at the very left of the word on the Night out glow. The mode glows picked in the app are brighter at the top than the brand bloom, and the light `--faint` (#626E81) was rated against flat Ice, not the cobalt bloom.
- **WCAG/Standard**: 1.4.3 Contrast (Minimum), AA (15px bold is not "large").
- **Recommendation**: Either darken light `--faint` toward `--muted` (#4A576B gives about 4.6:1 on the brightest cobalt) and use `--muted-up` or `--text` for eyebrows over a glow, or pull the top stop of each glow down so that `--faint` keeps 4.5:1 where text sits. Re-check the three mode glows in both themes with the same measurement.
- **Suggested command**: `/impeccable colorize`

**[P1] The whole app is a live region, so the timer is announced every second**
- **Location**: `index.html:33` `<main id="app" aria-live="polite">`; `js/session.js:250` (`ctx.tick` rewrites the timer text every second); `js/app.js:101` (`render()` replaces the whole screen on every change).
- **Category**: Accessibility
- **Impact**: With TalkBack on, the live screen would speak "2:30:01", "2:30:02" and so on without end, and every tap (log a drink, open a screen) would re-read the entire new screen. That makes the core screen unusable with a screen reader. Verified in code; not run under TalkBack.
- **WCAG/Standard**: 4.1.3 Status Messages (used too broadly), 2.2.2 Pause, Stop, Hide.
- **Recommendation**: Remove `aria-live` from `<main>`. Announce the things that matter through the existing toast (`role="status"`, already in `js/ui.js:170`). Move focus to the new screen's heading on navigation instead of announcing it. Give the timer `role="timer"` (implicitly `aria-live="off"`).
- **Suggested command**: `/impeccable harden`

**[P1] Bottom sheets are unnamed, don't take focus and don't trap it**
- **Location**: `js/ui.js:110` to `136` (`sheet()`); all sheets: mode picker, Change of plan, drink picker, Saw a set, More, Check in, challenge, End, locked item, unlock.
- **Category**: Accessibility
- **Impact**: Measured after opening the mode picker: focus stays on `<body>`, the first three Tab stops are "Customise", "Start adventure" and "History" behind the sheet, and the dialog has no `aria-label`/`aria-labelledby`. A screen reader user is not told a sheet opened and can wander into the dimmed screen; on close, focus is not returned to the button that opened it.
- **WCAG/Standard**: 2.4.3 Focus Order, 4.1.2 Name, Role, Value; ARIA dialog pattern.
- **Recommendation**: Label the panel from its title (`aria-labelledby` on the sheet's `h2`/`.title`), focus the first control or the title on open, set `inert` on `.frame` while a sheet is open, and restore focus to the opener on close. Give the challenge, Change of plan and End sheets a real heading element.
- **Suggested command**: `/impeccable harden`

### P2 Minor

**[P2] Placeholder text is close to invisible**
- **Location**: `css/style.css:45` with `--placeholder` (#3A3A3A dark, #8E99AA light). Drink "Negroni", act "Act name", stop "The Grapes", card title "Leaving do", festival name.
- **Category**: Accessibility
- **Impact**: 1.7:1 on the dark sheet, 2.7:1 in light. The example names are part of how people learn what to type.
- **WCAG/Standard**: 1.4.3 (placeholder is text); craft floor asks 4.5:1.
- **Recommendation**: Use `--muted-up` (dark) and `--muted` (light) for placeholders.
- **Suggested command**: `/impeccable colorize`

**[P2] Stats that can't be measured show as zero**
- **Location**: `js/session.js:273` to `290` (live tiles), `:527` to `:545` (recap), `js/history.js:287` (detail), `js/festival.js:92` (festival tiles), `js/card.js:917` to `:922` (photo card always draws Steps and Km), route card layout when `trail` is empty.
- **Category**: Implementation Integrity / Edge states
- **Impact**: With location off the live screen, recap and morning-after show "Distance 0.0 km" next to the note that there is no map. Without a step counter the photo card prints "Steps 0" and "Km 0.0", and the festival screen shows "Steps 0". A route card for a 0 km adventure is an empty dark (or blank light) top half with the stats crowded at the bottom. On a share card this looks like a broken app. The design contract says unavailable stats are hidden, never zeroed.
- **Recommendation**: Treat distance as unavailable when there is no trail and steps as unavailable when the sensor is absent; swap in another tile (Stops, Water, Time) and drop them from the card. Default to the stats-only card, or hide the Route option, when there is no route.
- **Suggested command**: `/impeccable harden`

**[P2] Check in with location off gives a misleading message**
- **Location**: `js/map.js:180`.
- **Category**: Edge states
- **Impact**: With location denied, Check in stays on the live screen and tapping it toasts "No position yet. Give GPS a moment." Waiting will never help. The same applies to Drop pin.
- **Recommendation**: When `geoStatus` is `denied`/`unsupported`, either let them name a stop without a position (it still counts as a stop) or say "Location is off, so stops can't be pinned" with a way to settings.
- **Suggested command**: `/impeccable clarify`

**[P2] Map stop and act labels: hard-coded pink and no length limit**
- **Location**: `js/map.js:139` (`color:#F06C9B`, `white-space:nowrap`), `js/map.js:156` (sets use `var(--amber)`).
- **Category**: Theming / Responsive
- **Impact**: Stop labels stay #F06C9B in light, about 2.3:1 on the light grey map (the light token is #C92F68). A long stop or act name ("The Very Long And Rather Grand Old Duke of Wellington Arms...", 406px wide) runs off the map, over the route, over the avatar and into the next label.
- **WCAG/Standard**: 1.4.3.
- **Recommendation**: Use `var(--pink)` and give the label a `max-width` with ellipsis (full name stays in the timeline), plus a light halo for legibility on tiles.
- **Suggested command**: `/impeccable polish`

**[P2] Secret badges leak their names; locked state is silent**
- **Location**: `js/badges.js:39` (`alt: meta.name`); `js/avatarscreen.js:71` to `75` (locked wardrobe tiles).
- **Category**: Accessibility
- **Impact**: The three hidden badges show "???" on screen but their `alt` reads "Sunrise Service", "Ghost" and "Chaos Agent". Every badge image repeats the visible name, and nothing tells a screen reader which badges or items are locked (the lock icon is `aria-hidden`).
- **Recommendation**: `alt=""` on badge images (the name is already visible text); add "locked" or "earned" to each cell's accessible name; for wardrobe tiles add "locked, needs No Notes" to the button label.
- **Suggested command**: `/impeccable harden`

**[P2] Sliders and swatches announce raw numbers**
- **Location**: `js/history.js:348` (rewind slider, 0 to 1000), `js/avatarscreen.js:154` (colour sliders), `:177` (swatches labelled "#1E1A18").
- **Category**: Accessibility
- **Impact**: The rewind slider reads "1000" rather than "8:47, The Crown". Colour swatches read hex codes.
- **Recommendation**: Set `aria-valuetext` on input (time plus place for rewind, "22 degrees" or "30 percent" for colour), and give swatches plain names ("Dark brown", "Blonde").
- **Suggested command**: `/impeccable harden`

**[P2] Text can't be enlarged by the reader**
- **Location**: every size token is px (`css/tokens/typography.css`), inline sizes in JS; `index.html:4` `maximum-scale=1,user-scalable=no`; 9px chart labels (`css/style.css:220`), 10px badge criteria (`js/badges.js:65`).
- **Category**: Responsive / Accessibility
- **Impact**: Setting the root size to 130% changed nothing (body stayed 14px, buttons 13px). Pinch zoom is disabled. Whether Android's system font size reaches the app depends on the WebView's text zoom, which the project leaves at its default; untested on a device. The 9px and 10px text is hard to read in daylight at any setting. Good news: forcing a 130% page zoom at 360px produced no horizontal overflow on any screen tested; long labels wrap ("Check in", "End adventure" go to two lines) and the live screen simply scrolls.
- **WCAG/Standard**: 1.4.4 Resize Text.
- **Recommendation**: Drop `maximum-scale=1,user-scalable=no`. Test with Android Font size at maximum; if the WebView ignores it, set `textZoom` from the system font scale in the native shell. Raise the 9px and 10px text to the 11.5px caption.
- **Suggested command**: `/impeccable adapt`

**[P2] A new user can't reach Settings, Appearance or Badges**
- **Location**: `js/history.js:25` (empty history shows only the message and Import history); Settings is linked only from the populated history (`js/history.js:92`).
- **Category**: Edge states
- **Impact**: On a fresh install, History shows "No adventures yet" and Import history, nothing else. Someone who wants light mode for a daylight walk, or wants to see what badges exist, can't until they have finished an adventure.
- **Recommendation**: Keep the Badges and Settings rows on the empty history screen.
- **Suggested command**: `/impeccable onboard`

**[P2] Light theme warning heading is just under AA**
- **Location**: `.warn__h` (`css/style.css:201`), "Five drinks since your last water."
- **Category**: Theming / Accessibility
- **Impact**: Amber #A35F00 is 5.0:1 on white but **4.45:1** on the Ice ground the banner sits on.
- **WCAG/Standard**: 1.4.3.
- **Recommendation**: Give the banner a `--surface` fill in light, or darken light amber slightly (about #985800).
- **Suggested command**: `/impeccable colorize`

**[P2] A few touch targets are under 44px**
- **Location**: Settings reminder chips 3/4/5/6/8 are **38 x 44** (`js/history.js:206`); permission "Fix" chips are 36px tall (`js/history.js:187`, native only); undo toast is **37px tall** and disappears after 4 seconds (`js/ui.js:166`, 4000ms from `js/app.js`).
- **Category**: Responsive
- **Impact**: Below the app's own "44px floor, no exceptions" (`css/style.css:110`). The undo toast is the only way to take back a mistap, and it is small and brief at 2am.
- **Recommendation**: `min-width: var(--tap)` on `.chip`; 44px minimum on the permission chips; make the toast at least 44px tall and keep it up for 6 to 8 seconds when it carries an undo.
- **Suggested command**: `/impeccable adapt`

**[P2] Heading structure is missing on key screens**
- **Location**: live screen, customise and the challenge sheet have no heading at all; badge categories and history sections are styled divs; settings is titled "Reminders" above Appearance and Your numbers.
- **Category**: Accessibility
- **Impact**: Screen reader users navigate by heading; the most used screen has none.
- **WCAG/Standard**: 1.3.1 Info and Relationships, 2.4.6 Headings and Labels.
- **Recommendation**: Make the eyebrow or a visually hidden title the `h1` on live and customise, make section labels `h2`, and title the settings screen "Settings".
- **Suggested command**: `/impeccable harden`

**[P2] A walk's detail screen leads with a drinks count**
- **Location**: `js/history.js:287` to `290` (detail tiles always Drinks plus Distance).
- **Category**: Implementation Integrity
- **Impact**: The recap of a walk leads with distance, pace and stops, as designed, but opening the same walk from History shows "Drinks 0" in pink. It contradicts "never framed around drinking" and the walk rules in `design/README.md`.
- **Recommendation**: Reuse the recap's mode-aware tile choice on the detail screen.
- **Suggested command**: `/impeccable polish`

### P3 Polish

**[P3] "Session" leaks into the copy**
- **Location**: `js/map.js:76` "Back to session"; `js/session.js:477` "You can't reopen a session"; `js/history.js:231` "the session screen"; `js/app.js:556`; badge criteria "End your first session", "Session over 8 hours" (`js/badges-data.js`).
- **Category**: Implementation Integrity
- **Impact**: The word for an outing is meant to come from `js/words.js`; these bypass it.
- **Recommendation**: Route them through `t()` ("Back to the {n}").
- **Suggested command**: `/impeccable clarify`

**[P3] Map credit collides with the stats strip**
- **Location**: `.map-foot` and `.leaflet-control-attribution` (`css/style.css:235`, `:242`), live map and Everywhere you've been.
- **Category**: Responsive
- **Impact**: The credit line touches the bottom of "10.4 km" (1px overlap measured) and wraps over the stats at 130%. In light it is 9px at about 2.7:1.
- **Recommendation**: Add bottom padding to `.map-foot` for the credit, or move the credit to the top corner as the share card does.
- **Suggested command**: `/impeccable polish`

**[P3] Tapping the avatar is mouse-and-touch only**
- **Location**: `js/avatar.js:990` (`role="img"` canvas with a click handler; "Tap to customise", "Tap for another face").
- **Category**: Accessibility
- **Impact**: Not focusable and not a button. Low impact because Customise and Shuffle do the same things.
- **Recommendation**: Leave it as an image and drop "Tap to" from its label, or wrap it in a `<button>`.
- **Suggested command**: `/impeccable harden`

**[P3] Leaflet is parsed at every launch**
- **Location**: `index.html:36` (147KB `vendor/leaflet.js`, synchronous).
- **Category**: Performance
- **Impact**: Start-up work on low-end phones for a library only map screens need.
- **Recommendation**: `defer`, or load it on first map screen.
- **Suggested command**: `/impeccable optimize`

**[P3] Small leftovers**
- **Location**: `btn--sm` used in `js/badges.js:71` but never defined; "Dress for the mode" row (`js/avatarscreen.js:191`) has no vertical padding, so its two-line hint touches the tile edges, and its state is only a grey "On"; the customise tabs hide "Colours" off-screen at 130% with no scroll hint.
- **Category**: Implementation Integrity / Responsive
- **Recommendation**: Remove the class or define it; give the switch row padding and a visible on/off control.
- **Suggested command**: `/impeccable polish`

## Patterns & Systemic Issues

- **One token, many failures.** Most contrast failures come from `--muted` being used for small text in 11 places where the design system uses `--faint` or `--muted-up`. Fixing the component layer, not each screen, clears them.
- **Contrast was rated against flat ground, but text sits on light.** The bloom, the three mode glows and the cobalt bloom brighten the top of every screen, exactly where eyebrows live. Any future glow needs its contrast checked where the text is, in both themes.
- **Screen reader plumbing is shared and missing in shared places.** The live region, the sheet helper and the badge image helper are each one function; three small fixes in `index.html`, `js/ui.js` and `js/badges.js` cover every screen.
- **"Unknown" is rendered as "zero".** Distance without GPS, steps without a sensor and the route card without a route all fall back to 0 rather than being left out.

## Positive Findings

- **Token discipline is excellent.** All colours, type roles, radii and timings come from the round 2 files; app-level additions (`--chrome-bg`, `--map-ground`, halos) are declared for both themes in one place. The static detector found nothing.
- **The light theme is careful.** Every alias is re-declared, mint splits into fill and text, badges get generated light art, map tiles and route colours switch, and the theme is applied before first paint (`index.html:18`) so there is no black flash.
- **Layouts hold up.** No horizontal overflow at 360px in any screen tested, including at 130% zoom and with 70-character act names (chips wrap, timeline rows ellipsize).
- **Labels and states are mostly right.** Every icon-and-text button has visible text, toggles use `aria-pressed`, the mode chip and water tile have descriptive labels, the "Dress for the mode" row is a real `role="switch"`, form fields in the stop sheet are wrapped in `<label>`, the toast is `role="status"`, and the avatar canvas has a meaningful `role="img"` label.
- **Motion is considerate.** The avatar honours `prefers-reduced-motion` itself, its loop stops when its canvas leaves the page, and press feedback is a 120ms scale.
- **Edge states exist and are written well.** "Location is off, so there's no map for this adventure. Drinks, water and time are all still being tracked." is exactly the right tone, and the hydration nudge, tap-to-undo and venue lookup all degrade without blocking.

## Recommended Actions

1. **[P1] `/impeccable colorize`**: move small labels from `--muted` to `--faint`/`--muted-up`, and fix eyebrow contrast over the brand, mode and cobalt glows in both themes (also placeholders and the light amber heading).
2. **[P1] `/impeccable harden`**: remove the app-wide live region, add `role="timer"`, and give sheets a name, initial focus, `inert` background and focus return; add headings, badge alt and locked-state names, and slider value text.
3. **[P2] `/impeccable harden`**: hide unavailable stats instead of zeroing them on screen and on cards; handle no-route cards.
4. **[P2] `/impeccable clarify`**: the location-off Check in message and the stray "session" copy.
5. **[P2] `/impeccable adapt`**: allow zoom, check Android font scaling, raise 9px/10px text, bring chips and the undo toast up to 44px.
6. **[P2] `/impeccable onboard`**: keep Settings and Badges reachable from an empty history.
7. **[P2] `/impeccable polish`**: map label colour and length, walk detail tiles, map credit spacing, small leftovers.
8. **[P3] `/impeccable optimize`**: defer Leaflet.
9. **`/impeccable polish`**: final pass once the above land.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `/impeccable audit` after fixes to see your score improve.

## Proposed fixes for the owner

**Most important (P1)**

1. Make the small grey labels readable: words like "Drinks", "Water", "km" and the times in lists would turn a lighter grey, as the design intended, so they're easy to read in a dark bar.
2. Make the small headings at the top of screens readable over the coloured glow: "On the adventure", "History" and similar would stay clear on every mode colour and in light mode.
3. Stop the screen reader from reading the clock every second: blind and low-vision users could actually use the live screen, and would hear only what changed when they tap.
4. Make the pop-up sheets work with a screen reader: when a sheet opens, the phone would say what it is and move there, and closing it would return you to where you were.

**Worth doing next (P2)**

5. Make example text in boxes ("Negroni", "The Grapes") readable: the grey hints would be visible instead of nearly black on black.
6. Stop showing zeros for things the phone couldn't measure: with location off or no step counter, "0.0 km" and "Steps 0" would disappear from the screen and the share card, and a card with no route wouldn't have an empty half.
7. Fix the Check in message when location is off: instead of "Give GPS a moment", it would explain location is off, or still let you name the stop.
8. Tidy stop and act names on the map: long names would be shortened on the map (full name in the timeline) and stop names would be readable in light mode.
9. Keep secret badges secret and say what's locked: screen readers would stop revealing hidden badge names, and would say which badges and outfit items are still locked.
10. Make sliders and colour dots speak sensibly: the history slider would say the time and place, and colour dots would say "dark brown" instead of a code.
11. Let people make text bigger: pinch zoom would work, the tiniest text (chart numbers, badge descriptions) would grow a little, and we'd check that the phone's own text size setting reaches the app.
12. Let new users find Settings and Badges: someone who hasn't finished an adventure yet could still switch to light mode and browse badges from History.
13. Make the water warning heading a touch darker in light mode so it's clearly readable.
14. Make every button easy to hit: the 3/4/5/6/8 reminder buttons would be wider, and the "Tap to undo" message would be bigger and stay up a few seconds longer.
15. Add proper headings to the live and customise screens so screen reader users can jump around.
16. Show a walk's own numbers in History: opening a walk would lead with distance, pace and stops instead of "Drinks 0".

**Polish (P3)**

17. Replace the leftover word "session" with "adventure" in the few places it still shows ("Back to session", two badge descriptions).
18. Give the map credit line its own space so it doesn't touch the distance figure.
19. Make the avatar's tap actions reachable without touch, or just describe it as a picture.
20. Load the map library only when a map is opened, so the app starts slightly faster on older phones.
21. Small tidy-ups: padding on the "Dress for the mode" row with a clear on/off control, and a hint that the customise tabs scroll at large text sizes.
