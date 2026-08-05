# Handoff: Last Call — Android night-out tracker

## Overview

Last Call is a solo night-out tracker for Android. You start a session when the night begins, log what you drink, keep water honest, and the app draws your route across a map as you move between places. When you end the night it produces a shareable card.

Native Android, not a website: tracking has to survive a locked phone in a pocket. No accounts, no server, no network calls — everything lives on the device.

**Audience:** one person, out at night, slightly drunk, holding a phone one-handed in a dark, loud room.
**The job of the interface:** log a drink in under two seconds without thinking, and produce something worth posting the next morning.

This package is the whole project folder: the full design system (tokens, 10 components, 17 foundation specimens) plus the 13 app screens and 3 share-card layouts as click-through prototypes.

## About the design files

The files in this package are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy directly. The React/JSX in `ui_kits/` and `components/` exists to render the design in a browser; it is not an Android implementation.

The task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. For this product that means native Android (Compose or Views) — the constraints below (foreground service, safe-area insets, offline-first, canvas export) are Android facts, not web ones. If no environment exists yet, Jetpack Compose is the natural target: the token set maps cleanly onto a Compose theme (colours → `ColorScheme`/custom palette object, type roles → `Typography`, spacing/radii → a dimensions object).

Do not ship the HTML. Do treat the token values, type scale, spacing, copy strings and layout structure as exact.

## Fidelity

**High-fidelity.** Every colour, size, radius, duration and string in this bundle is final and intentional. Values are precise; reproduce them. The two knowingly unfinished areas are the wordmark (plain type placeholder) and the icon set (Lucide stands in) — both flagged under Open items.

## Non-negotiable constraints

Each of these has already killed an alternative. Do not design or build past them.

1. **Dark ground is load-bearing, not stylistic.** GPS runs for six hours in dark rooms. A light theme costs real battery on OLED and wrecks night vision. **There is no light mode** — do not wire one up, do not follow the system dark/light setting.
2. **Type is the system sans.** The app boots offline; a webfont that silently fails would break every layout. Character comes from weight, tracking and scale. Do not bundle a typeface.
3. **Android forces a permanent foreground-service notification** while tracking. It cannot be hidden or restyled. Design around it — the kit shows it in place, and the copy is `Last Call is tracking your night.`
4. **Every tap target is 44px (44dp) or larger.** This is operated by people who have been drinking.
5. **Safe-area insets are mandatory.** Gesture-nav bars sit exactly where the primary action wants to be.
6. **The share card is drawn on a canvas, not screenshotted from the view tree.** Compositing a live map would taint the output. Anything in a card design must be drawable with a 2D drawing API.

---

## Design tokens

Source of truth: `tokens/*.css`, aggregated by `styles.css`. Values below are canonical.

### Colour — ground and neutrals

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#000000` | Page ground. True black, not dark grey. |
| `--surface` | `#141414` | Neutral tiles, list rows |
| `--surface-2` | `#0D0D0D` | Sheet panel |
| `--line` | `#262626` | Hairline borders (1px only) |
| `--text` | `#FFFFFF` | Primary text |
| `--muted` | `#6B6B6B` | Secondary text, 14px and above |
| `--muted-up` | `#8A8A8A` | Secondary text below 14px |
| `--faint` | `#4D4D4D` | Labels, disabled, attribution |
| `--placeholder` | `#3A3A3A` | Field placeholder |

### Colour — forest ramp (brand hero, owns depth)

`--forest-950 #030A07` · `--forest-900 #061710` · `--forest-800 #0A2419` · `--forest-700 #0F3626` · `--forest-600 #17553B` · **`--forest-500 #21764F` (hero)** · `--forest-400 #35A26F` · `--forest-300 #5FC79A`

700–900 carry depth. 300–400 are for hairlines and glow only — never large text.

### Colour — action and data

| Token | Hex | Role |
|---|---|---|
| `--mint` | `#7EE0C0` | The only affirmative action colour |
| `--mint-ink` | `#04342C` | Text/icons on mint. Never pure black. |
| `--mint-dim` | `#4FB495` | Quiet mint (eyebrow on start screen) |
| `--pink` | `#F06C9B` | Drinks and named stops. A data colour. |
| `--pink-ink` | `#3A0A1C` | — |
| `--amber` | `#EF9F27` | Hydration behind. Never decorative. |
| `--amber-ink` | `#2E1B00` | — |

**Rules that are easy to break by accident:**
- One mint element per screen, maximum. If a screen needs two primary actions, one of them isn't primary.
- Pink marks drink counts and named stops. It never becomes a button fill.
- Amber appears only when hydration is actually behind. No amber in a resting state.
- Text on mint is `#04342C`. Pure black on mint reads harsh against the rest of the palette.
- Below 14px, step muted text up from `#6B6B6B` to `#8A8A8A`.
- Never a purple-blue gradient. No coloured left-border accents.

### Colour — forest glass

| Token | Value |
|---|---|
| `--glass-1` | `rgba(33,118,79,.10)` |
| `--glass-2` | `rgba(33,118,79,.18)` |
| `--glass-3` | `rgba(15,54,38,.55)` — the card fill |
| `--glass-line` | `rgba(126,224,192,.14)` |
| `--glass-line-strong` | `rgba(126,224,192,.28)` |

### Colour — bloom, scrim, protection gradients

| Token | Value |
|---|---|
| `--bloom-hero` | `radial-gradient(120% 80% at 50% 0%, rgba(33,118,79,.55) 0%, rgba(10,36,25,.35) 42%, rgba(0,0,0,0) 78%)` |
| `--bloom-foot` | `radial-gradient(100% 60% at 50% 100%, rgba(33,118,79,.40) 0%, rgba(0,0,0,0) 70%)` |
| `--bloom-mint` | `radial-gradient(60% 60% at 50% 50%, rgba(126,224,192,.28) 0%, rgba(126,224,192,0) 70%)` |
| `--scrim` | `rgba(0,0,0,.62)` — behind sheets |
| `--protect-bottom` | `linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.70) 38%, rgba(0,0,0,0) 100%)` |
| `--protect-top` | `linear-gradient(to bottom, rgba(0,0,0,.80) 0%, rgba(0,0,0,0) 100%)` |

Type over a map or photo sits on a gradient, not a capsule. Capsules are reserved for the Android service notification, which should read as system chrome.

### Typography

Font stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. On Android this is Roboto. `tabular-nums` on **anything that counts**, always.

| Role | Size / line | Weight | Tracking | Used for |
|---|---|---|---|---|
| Timer | 44 / 1.0 | 700 | −0.045em | Elapsed session clock |
| Display | 34 / 1.05 | 700 | −0.035em | Marketing, empty states |
| Stat value | 22 / 1.1 | 700 | −0.03em | Tile numbers, card stats |
| Title | 19 / 1.25 | 700 | −0.02em | Sheet and screen headings |
| Body | 14 / 1.55 | 400 | 0 | Explanatory copy. Never below 13px. |
| Button | 13 / 1 | 700 | +0.1em | Uppercase |
| Caption | 11.5 / 1.35 | 400 | 0 | Timestamps, secondary detail |
| Label / eyebrow | 10 / 1 | 600 | +0.18em | Uppercase |

Tracking carries the character: negative on everything large, strongly positive on the small uppercase runs. A −0.045em timer over a +0.18em eyebrow is the type identity.

### Spacing, shape, tap targets

Base unit 4px. Portrait only, 9:19.5 (prototype canvas 390 × 845).

| Token | Value | Applied to |
|---|---|---|
| `--gap` | 9px | Between stacked blocks |
| `--gap-tight` | 7px | Tile grids, button pairs |
| `--gap-loose` | 16px | Between sections |
| `--pad-screen-y` / `--pad-screen-x` | 16px / 14px | Screen edges, plus safe-area insets |
| `--pad-tile` | 12px | Inside tiles |
| `--pad-sheet` | 16px 14px 20px | Inside sheets |
| `--r-chip` | 9px | Chips, list rows, service notification |
| `--r-tile` | 11px | Tiles, buttons, warning banner |
| `--r-sheet` | 16px | Sheet **top corners only** |
| `--r-card` | 20px | Forest-glass cards |
| `--r-pill` | 999px | Drag handle, gesture bar |
| `--tap` / `--tap-lg` | 44px / 52px | Minimum interactive height |
| `--hairline` | 1px | All borders. There are no 2px borders. |

### Depth, blur, texture

| Token | Value |
|---|---|
| `--shadow-sheet` | `0 -12px 32px rgba(0,0,0,.72)` — the one real shadow |
| `--shadow-float` | `0 6px 20px rgba(0,0,0,.60)` |
| `--shadow-inset-glass` | `inset 0 1px 0 rgba(255,255,255,.06)` |
| `--glow-mint` | `0 0 24px rgba(126,224,192,.30)` — under the primary button |
| `--glow-mint-strong` | `0 0 40px rgba(126,224,192,.45)` |
| `--glow-forest` | `0 0 60px rgba(33,118,79,.45)` |
| `--blur-glass` / `--blur-sheet` / `--blur-chrome` | 18px / 24px / 12px |
| `--grain` | fractal-noise SVG tile, 120×120 |
| `--grain-opacity` | `.055`, blend mode `overlay` |

On true black an outer drop shadow does almost nothing, so depth comes from **glow and hairlines**. Blur only where something is behind it — never over flat black. Grain sits over every bloom; it stops large green fields banding on OLED.

### Motion

| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 80ms | — |
| `--dur-press` | 120ms | Press scale |
| `--dur-fast` | 180ms | Colour change |
| `--dur-base` | 240ms | Screen fade |
| `--dur-sheet` | 280ms | Sheet in/out |
| `--ease-out` | `cubic-bezier(.16,.84,.44,1)` | Default |
| `--ease-in-out` | `cubic-bezier(.4,0,.2,1)` | — |
| `--ease-sheet` | `cubic-bezier(.2,.9,.25,1)` | Sheets |
| `--press-scale` | `.98` | Every interactive element |

**No bounce, no spring, no overshoot** — someone drunk in a dark room does not need things springing about. The only continuous motion in the app is the timer ticking once a second.

### Interaction states

- **No hover state.** This is a touch app; any hover is dead weight.
- **Press is `scale(0.98)`** on every interactive element, and nothing else — no colour shift, no opacity dip.
- **Disabled** drops to 38% opacity and stops pointer events.
- **Focus** (fields only) turns the underline mint.
- **Selected chips** take mint border + mint text, never a fill.

### Surfaces — two kinds, and they don't mix

1. **Neutral tile** — `#141414` fill, 11px radius, no border, no shadow. Stat tiles, list rows, sheets. The app's working surface.
2. **Forest glass** — `--glass-3` fill, 1px `--glass-line` hairline, 20px radius, 18px backdrop blur. Only ever over bloom or imagery; over flat black it looks like a mistake. Used for the route card, history chart, marketing surfaces.

---

## Components

Ten components build all thirteen screens. Source: `components/<group>/<Name>.jsx` with a `.d.ts` API and a `.prompt.md` note per component.

### Button — `components/actions/Button.jsx`
```ts
variant?: 'primary' | 'secondary' | 'pink'   // default 'primary'
size?: 'md' | 'lg'                            // md = 44px, lg = 52px
full?: boolean; disabled?: boolean
icon?: ReactNode; children: ReactNode; onClick?: () => void
```
- **primary** — mint fill `#7EE0C0`, `#04342C` text, 11px radius, 13/700 uppercase +0.1em, `--glow-mint` beneath. One per screen.
- **secondary** — transparent fill, 1px `#262626` border, white text.
- **pink** — transparent fill, 1px `#F06C9B` border, pink text. **Hydrate only.**
- Icon sits left of the label at 15–16px, tinted to the label colour.
- States: rest · pressed (`scale(0.98)`, 120ms) · disabled (38% opacity).

### NavPair — `components/actions/NavPair.jsx`
```ts
items: { label: string; onClick?: () => void }[]
```
Two secondary buttons in a `1fr 1fr` grid, `--gap-tight` between, pinned to the screen foot above the safe-area inset. Always below the primary action.

### StatTile — `components/data/StatTile.jsx`
```ts
label: string; value: string | number; unit?: string
tone?: 'default' | 'drinks' | 'hydration'
unavailable?: boolean
```
`#141414` fill, 11px radius, 12px padding, no border, no shadow. Uppercase 10/600 +0.18em label over a 22/700 −0.03em tabular value; unit follows at caption size in `--muted`. `drinks` → pink value. `hydration` → amber value, only when behind. `unavailable` hides the tile entirely — **never render an unavailable stat as 0**. No icons in stat tiles; the uppercase label is the identifier.

Laid out as a 2-up grid: `grid-template-columns: 1fr 1fr; gap: 7px`.

### Timer — `components/data/Timer.jsx`
```ts
startedAt: number | Date; endedAt?: number | Date; running?: boolean
```
44/700, line-height 1.0, tracking −0.045em, tabular numerals. Ticks once a second from `startedAt`. `endedAt` freezes the clock and renders it muted. Format `H:MM:SS`.

### ListRow — `components/data/ListRow.jsx`
```ts
date: string
metrics?: { value: string; tone?: 'default' | 'drinks' }[]
onClick?: () => void
```
`#141414` fill, 9px radius, ≥44px tall. Bold date left, tabular metrics right separated by `·`. Pressed = `scale(0.98)`.

### Chip — `components/inputs/Chip.jsx`
```ts
selected?: boolean; onClick?: () => void; children: ReactNode
```
1px border, 9px radius, 12px label, ≥44px tap height. Rest = `--line` border, white text. Selected = mint border + mint text, **never a fill**.

### Field — `components/inputs/Field.jsx`
```ts
label?: string; value?: string; placeholder?: string
onChange?: (value: string) => void
```
Underline only — no box, no fill. Uppercase 10/600 label above, 14px value, placeholder `#3A3A3A`. Underline `--line` at rest, mint on focus (180ms).

### BottomSheet — `components/feedback/BottomSheet.jsx`
```ts
open?: boolean; title?: string; onDismiss?: () => void
children?: ReactNode; footer?: ReactNode
```
`--scrim` behind, `#0D0D0D` panel, 16px **top** corners only, `--shadow-sheet`, `--blur-sheet`, 108×4 pill drag handle centred at the top. Padding `16px 14px 20px`. Title at 19/700 −0.02em. Footer holds the actions, pinned at the bottom of the panel. Enters/exits in 280ms on `--ease-sheet`. Absolutely positioned — parent must be a positioned container. Dismissible by scrim tap and by drag-down.

### WarningBanner — `components/feedback/WarningBanner.jsx`
```ts
heading: string; body?: string; actions?: ReactNode
```
1px amber border, 11px radius, amber heading, body in `--muted-up`, action pair beneath. **Only renders when the hydration threshold is crossed** — no amber in a resting state. Always dismissible.

### Icon — `components/media/Icon.jsx`
```ts
name: string     // Lucide name, kebab-case
size?: number    // 13 chrome · 15–16 in buttons · 22 max
color?: string   // any colour token
```
**Flagged substitution:** no icon set was supplied, so Lucide (`lucide-static` CDN) stands in — 1.5px stroke, rounded caps, 24px grid, which matches the app's hairline weight. Replace with the real set the moment one exists; only `Icon.jsx` changes.

The glyph is applied as a CSS `mask` and filled with a colour token, so an icon always takes a palette colour and never ships its own. In Android, mirror this: tint every vector from the palette.

**Icons are functional, never decorative.** Three places only: inside a button next to its label (`plus`, `droplet`, `map-pin`, `share-2`, `download`), in status chrome (`signal`, `wifi`, `battery-medium`, `circle-dot`), and as timeline markers (`map-pin`). No icon font, no sprite sheet, no hand-drawn SVG. **No emoji, ever** — not in copy, not in labels, not as icons.

### Shell primitives — `ui_kits/android-app/Shell.jsx`
Not exported design-system components, but the layout scaffolding every screen uses:
- `Shell` — black ground + bloom layer + grain layer, Android status bar, optional foreground-service notification, content column at `16px 14px`, gesture bar (108×4, `#2A2A2A`) at the foot.
- `ServiceNotification` — `rgba(20,20,20,.72)` capsule, 9px radius, 12px blur, 1px `--line`, mint `circle-dot` at 13px, caption text in `--muted-up`: "Last Call is tracking your night."
- `ScreenHead` — eyebrow + title block, 9px bottom margin, optional right slot.
- `GlassCard` — the forest-glass surface, 14px padding.
- `TileGrid` — `1fr 1fr`, 7px gap.

---

## Screens

Layout is a single column everywhere: head, content, a flexible spacer, then actions pinned to the foot. The primary action is always the lowest full-width element above the safe-area inset; navigation sits below it as a two-up `NavPair`. Nothing floats over content except sheets.

Source: `ui_kits/android-app/` — `SessionScreens.jsx` (01, 02, 03, 05, 07), `MapScreens.jsx` (04, 08), `ShareScreens.jsx` (09, 10), `HistoryScreens.jsx` (11, 12, 13). Open `ui_kits/android-app/index.html` in a browser to click through all of them.

| # | Screen | What it does |
|---|---|---|
| 01 | Start | No login, no email gate. One button. |
| 02 | Live session | Home for the night. Timer, four tiles, Add drink, Hydrate, nav to Map and End. |
| 03 | Pick your poison | Bottom sheet of drink presets, recents floated to top, custom entry. |
| 04 | Map | Live position (white), route (mint), named stops (pink), stats strip, Drop pin. |
| 05 | Drop pin | Name a stop, optional note. |
| 06 | Hydration nudge | Threshold-triggered warning. Also fires as a local notification. Always dismissible. |
| 07 | End night | Confirmation. The one destructive action, tapped at 2am. |
| 08 | Recap | Stats and route the moment a night ends. Make a card, or just save it. |
| 09 | Card builder | Preset / Your photo tabs, live canvas, element toggles. |
| 10 | Share | Feed 4:5 or Story 9:16, native share sheet, save to photos. |
| 11 | History | Stats header, eight-week bar chart, night list, export. |
| 12 | Night detail | That night's map, stats and a timeline. Re-make a card from any past night. |
| 13 | Permission priming | Android-only, shown before the system prompt for background location. |

**06 renders inside 02** as a `WarningBanner` rather than as its own screen — that is how it appears in the build.

### 01 · Start
Bloom-hero ground. Content bottom-aligned: `Last Call` eyebrow in `--mint-dim`, display headline "Track the night.<br>Piece it together later." (34/700 −0.035em, 10px/12px margins), body paragraph in `--muted-up` capped at 300px wide, then a full-width `lg` primary button "Start night". No status chrome beyond the Android status bar; no service notification (not tracking yet).

### 02 · Live session
Service notification present. `ScreenHead` eyebrow "On the night" → `Timer` → caption "Started 9:12 pm" in `--faint` → 2-up `TileGrid`: Drinks (pink), Water, Steps, Distance (unit `km`). Warning banner slots in below the grid when the threshold is crossed. Flexible spacer. Foot stack at 7px gap: primary `lg` "Add drink" with `plus` icon → pink "Hydrate" with `droplet` icon → `NavPair` [Map, End night].

### 03 · Pick your poison
Bottom sheet, title "What are you having?". `Recent` label + 3 chips, `All` label + remaining chips (Pint, Wine, Spirit + mixer, Shot, Cider, Cocktail, Low/no), wrapping flex at 7px gap. Field labelled "Something else", placeholder "Negroni". Footer: full-width primary "Add drink". Typing a custom value overrides the chip selection.

### 04 · Map
Full-bleed map (offline tiles in the build; the prototype draws a grid + route). Route in mint, live position a white dot, named stops pink. Chrome over the map is blurred at 12px. Stats strip at the foot sits on `--protect-bottom`, not a capsule. Primary action "Drop pin" with `map-pin` icon. No-fix state: "Waiting for GPS. Everything else still works." Denied state: "Location is off, so there's no map tonight. Drinks, water and time are all still being tracked."

### 05 · Drop pin
Bottom sheet, title "Name this stop". Two fields at 16px gap: "Name this stop" (placeholder "The Grapes") and "Anything worth remembering" (placeholder "Met Tom outside"). Footer: full-width primary "Drop pin". Empty name falls back to "Unnamed stop".

### 07 · End night
Bottom sheet, title "Call it a night?". Body in `--muted-up`: "You've been out {elapsed}. This stops tracking and builds your recap. You can't reopen a session once it's closed." Footer stack at 7px: primary "End night", secondary "Keep tracking".

### 08 · Recap
Bloom-foot ground. Display heading "That was a night." Stats and the auto-fitted route in a forest-glass card. Two exits: make a card (primary) or just save it.

### 09 · Card builder
Preset / Your photo tabs. Live canvas preview at the card's real aspect. Element toggles for the draggable pieces. Mode C's selection state is a dashed mint outline that **never renders into the export**.

### 10 · Share
Feed 4:5 / Story 9:16 choice, then the native share sheet and save-to-photos. Rendering happens offscreen at full resolution, never a scaled-up preview.

### 11 · History
Stats header, eight-week bar chart in a forest-glass card, night list of `ListRow`s, export action. Empty state: "No nights yet. Your first one shows up here." Storage-full state: "Storage is full. Export your history to free up room."

### 12 · Night detail
That night's map, its stats, and a timeline with `map-pin` markers. Re-make a card from any past night.

### 13 · Permission priming
Shown before the Android system prompt for background location. Heading "Your phone will be in your pocket", body "Android opens its settings screen for this one — pick "Allow all the time", then come back." Reassurance line "Your location never leaves the phone." Decline path "Skip — track without the map".

---

## The share card

The artefact that leaves the app, so it carries the identity alone with no chrome around it. Three layouts across two modes. Prototype: `ui_kits/share-card/index.html`, drawn on canvas at 1080 wide (`drawCard` in `ui_kits/android-app/ShareScreens.jsx`).

- **Mode A · Preset.** One tap, zero editing. Route auto-fitted from the session's GPS trail, four stats, date and area, wordmark.
- **Mode B · Photo, stats bar.** The user's picture with numbers locked to a solid footer. Most legible over a busy image.
- **Mode C · Photo, free placement.** Every element draggable and scalable. Dashed mint outline is the selection state and never renders into the export.

| Item | Value |
|---|---|
| Feed ratio | 1080 × 1350 (4:5) |
| Story ratio | 1080 × 1920 (9:16) |
| Render | Offscreen canvas at full resolution, never a scaled-up preview |
| Draggable elements | Stats block · single big stat · route · elapsed time · stops list · drink of choice · date and place · wordmark |
| Safe margin | 64px on all edges at 1080 wide |
| Photo handling | Cover-fit, centred, from the device picker. Never uploaded. Always under a 34% black wash so white type holds. |
| Wordmark | Always mint, bottom corner. The one fixed element. |

---

## Interactions & behaviour

- **Navigation:** Start → Live session. Live session hosts sheets (drink, end) and pushes to Map. Map hosts the drop-pin sheet. Ending a night → Recap → Card builder → Share. History is reachable from Start/Live; History → Night detail → Card builder.
- **Add drink:** opens sheet 03, chip or custom text, confirm increments the drinks count. Target: under two seconds, one-handed.
- **Hydrate:** increments water and clears any active nudge. Available both as a standing foot button and inside the nudge.
- **Hydration nudge:** fires when the drinks-since-water threshold is crossed (5 in the prototype). Renders as a `WarningBanner` inside 02 and also as a local notification ("Last Call · Time for a water."). Dismissible with "Later".
- **End night:** confirmation sheet, then tracking stops and the recap is built. Irreversible — a closed session cannot reopen.
- **Transitions:** screen fade 240ms `--ease-out`; sheets 280ms `--ease-sheet`; press 120ms; colour 180ms. Timer ticks 1s. Nothing else animates.
- **No hover, no loading spinners on device-local reads.** The only genuinely async things are GPS fix and photo picking.
- **Responsive:** portrait only, 9:19.5. No landscape, no tablet layout.

## State management

Per-session state (see `ui_kits/android-app/App.jsx` and `data.js` for the prototype's shape):

| State | Notes |
|---|---|
| `session.startedAt` | ms epoch. Drives `Timer`; survives process death. |
| `session.endedAt` | Set once, freezes the timer and closes the session. |
| `drinks[]` | Each `{ label, at }`. Count feeds the Drinks tile and the nudge threshold. |
| `water[]` | Each `{ at }`. Clears the nudge. |
| `steps`, `distanceKm` | From the platform activity/GPS sources. |
| `trail[]` | GPS points `{ lat, lng, at }`. Feeds the route line and the card's auto-fit. |
| `stops[]` | `{ name, note, lat, lng, at }`. Pink markers and the timeline. |
| `nudgeActive` | Derived from drinks-since-last-water; dismissible. |
| `permissions` | Background location granted / denied / not asked. Drives 04's no-fix and denied states. |
| `pastNights[]` | Persisted history; feeds 11 and 12. |
| `card` | Mode A/B/C, photo URI, element visibility, per-element transforms, ratio. |

Persistence is device-local only (Room / DataStore / files). **No network calls of any kind.** Tracking runs in a foreground service so it survives a locked phone. Export writes history to a file the user chooses.

## Voice

**Dry, short, never scolding.** The app is a record of a good night, not a health intervention.

- Second person, and sparing. "You've been out 5 hours 12 minutes." Never "we", never "let's".
- Sentence case in prose. Uppercase only on buttons and labels — `Start night` renders as `START NIGHT` because the button style uppercases it; the string itself is sentence case.
- Statements, not exclamations. No exclamation marks anywhere. No "Oops", no "Nice one", no praise.
- Two-beat structure for anything that asks something: a flat observation, then the smallest possible reason.
- Failure states name what still works.
- No emoji, ever. No jargon, no metrics-speak — "Nights out", not "sessions logged".
- The only non-ASCII characters in use are `·` and curly quotes.

### Canonical strings — use verbatim

| Where | String |
|---|---|
| Tagline | Track the night. Piece it together later. |
| Start | Start night |
| Live · eyebrow | On the night |
| Live · start time | Started 9:12 pm |
| Drink sheet | What are you having? |
| Drink sheet · custom | Something else |
| Pin sheet | Name this stop / Anything worth remembering |
| Hydration | Five drinks since your last water. / Takes ten seconds. Tomorrow says thanks. |
| Hydration · notification | Last Call · Time for a water. |
| End confirm | Call it a night? / You've been out 5 hours 12 minutes. This stops tracking and builds your recap. You can't reopen a session once it's closed. |
| Recap | That was a night. |
| Permission priming | Your phone will be in your pocket / Android opens its settings screen for this one — pick "Allow all the time", then come back. |
| Permission · reassurance | Your location never leaves the phone. |
| Permission · decline | Skip — track without the map |
| Foreground service | Last Call is tracking your night. |
| History · empty | No nights yet. Your first one shows up here. |
| Map · no fix | Waiting for GPS. Everything else still works. |
| Map · denied | Location is off, so there's no map tonight. Drinks, water and time are all still being tracked. |
| Storage · full | Storage is full. Export your history to free up room. |

## Assets

**No logo, icon set, font files or photography were supplied.** What stands in:

| Asset | Status |
|---|---|
| Wordmark | Plain type placeholder — see `guidelines/wordmark.html`. Highest-leverage open item; it's on every share card and has to work at 10px. |
| Icons | Lucide via `lucide-static` CDN, a flagged substitution. Replace when a real set exists; only `components/media/Icon.jsx` changes. |
| Typeface | System sans by constraint, not by default. Nothing to bundle. |
| Photography | None. Bloom + grain do the work imagery would otherwise do. The only image in the product is the user's own photo on the share card. |
| App icon | Does not exist. 192, 512, 512-maskable and an adaptive Android foreground layer are all outstanding. |
| Map tiles | Not in the prototype. The brief specifies offline tiles and no cross-origin imagery. |

See `assets/README.md`.

## Files in this package

| Path | What's in it |
|---|---|
| `HANDOFF.md` | This document |
| `styles.css` | The one stylesheet consumers link. `@import`s only. |
| `tokens/colors.css` | Ground, neutrals, forest ramp, action + data colours, glass, bloom |
| `tokens/typography.css` | Font stack, sizes, weights, tracking, `--type-*` shorthands |
| `tokens/spacing.css` | 4px base, gaps, screen padding, radii, tap targets, safe areas |
| `tokens/effects.css` | Shadows, glows, blur, motion, grain |
| `tokens/base.css` | Resets and the `.lc-num` / `.lc-label` / `.lc-bloom` / `.lc-grain` utilities |
| `components/actions/` | `Button`, `NavPair` — `.jsx` + `.d.ts` + `.prompt.md` each |
| `components/data/` | `StatTile`, `Timer`, `ListRow` |
| `components/inputs/` | `Chip`, `Field` |
| `components/feedback/` | `BottomSheet`, `WarningBanner` |
| `components/media/` | `Icon` |
| `ui_kits/android-app/index.html` | **Click-through prototype of all 13 screens** — open this first |
| `ui_kits/android-app/*.jsx`, `data.js` | Screen source, router, fake session data |
| `ui_kits/share-card/index.html` | The three share-card layouts, drawn on canvas at 1080 wide |
| `guidelines/*.html` | 17 foundation specimen cards (colour, type, space, depth, motion, voice) |
| `screenshots/01-start.png` … `13-permission-priming.png` | One PNG per screen, 426×857, captured from the prototype |
| `screenshots/all-screens.png` | All 13 screens on one labelled contact sheet, 2350×2757 |
| `screenshots/share-cards.png` | The three share-card layouts side by side |
| `ui_kits/android-app/screens.html` | The page the contact sheet is captured from — every screen and sheet rendered at once |
| `_ds_bundle.js` | Compiled component bundle the prototypes load (`window.LastCallDesignSystem_b253fc`) |
| `uploads/BRIEF.md` | The original client brief — ground truth for every number here |
| `readme.md` | The full design-system rationale, longer form |

To run the prototypes: serve the project folder over HTTP (`python3 -m http.server`) and open `ui_kits/android-app/index.html`. They need a server, not `file://`, because the bundle and stylesheet load by relative path. Lucide icons load from a CDN, so they need network; everything else is local.

## Open items, in order of leverage

1. **The wordmark.** Plain type placeholder today. On every share card, has to work at 10px.
2. **The preset card.** The most-seen surface. Layout, crop and hierarchy all open.
3. **Mint versus pink weighting.** Mint carries all action, pink only drink counts. Worth testing whether pink should own more, given drinks are what people post about.
4. **Timer treatment.** Functional at 44/700, but it's the hero of the live screen and could carry more character within the system-sans constraint.
5. **Empty and first-run states.** Written in copy, not yet designed.
6. **The app icon.** Nothing exists.
