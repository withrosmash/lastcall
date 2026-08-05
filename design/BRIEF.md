# Last Call — design brief

Paste this whole file into Claude Design as context. It is the plain-text twin of `design/handoff.html`, which shows the same thing rendered.

---

## What the app is

A solo night-out tracker for Android. You start a session when the night begins, log what you drink, keep water honest, and the app draws your route across a map as you move between places. When you end the night it produces a shareable card.

It runs as a native Android app rather than a website, because the whole point is that tracking survives a locked phone in a pocket, and no browser can do that. There are no accounts, no server, and no network calls. Everything lives on the device.

**Audience:** one person, out at night, slightly drunk, holding a phone one-handed in a dark and loud room.

**The job of the interface:** log a drink in under two seconds without thinking, and produce something worth posting the next morning.

---

## Non-negotiable constraints

Read these before proposing anything, because each one has already killed an alternative.

1. **Dark ground is load-bearing, not stylistic.** The app is used in dark rooms and runs GPS for six hours. A light theme costs real battery on OLED and wrecks night vision. There is no light mode.
2. **Type must be the system sans.** The app boots offline from a service worker. A webfont that fails to load silently would break every layout. Character has to come from weight, tracking and scale, not from a typeface we load over the network.
3. **Android forces a permanent foreground-service notification** while tracking. It cannot be hidden, restyled, or dismissed. Design around it.
4. **Every tap target is 44px or larger.** This is operated by people who have been drinking.
5. **Safe-area insets are mandatory.** Android gesture-nav bars sit exactly where the primary action wants to be.
6. **The share card is drawn on a canvas, not screenshotted from the DOM.** Compositing a live map would pull in cross-origin tiles, taint the canvas, and make export throw. Anything in the card design has to be drawable with the Canvas 2D API.

---

## Color

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#000000` | Page ground. True black. |
| `--surface` | `#141414` | Tiles, sheets, list rows. |
| `--line` | `#262626` | Hairline borders. |
| `--text` | `#FFFFFF` | Primary text. |
| `--muted` | `#6B6B6B` | Secondary text. Floor for 14px and above. |
| `--faint` | `#4D4D4D` | Labels, disabled, attribution. |
| `--mint` | `#7EE0C0` | The only affirmative action color. |
| `--mint-ink` | `#04342C` | Text on mint. Never black. |
| `--pink` | `#F06C9B` | Drinks. A data color, not an accent. |
| `--amber` | `#EF9F27` | Hydration behind. Never decorative. |

**Rules that are easy to break by accident:**

- One mint element per screen. If a screen needs two primary actions, one of them isn't primary.
- Pink marks drink counts and named stops. It never becomes a button fill.
- Amber appears only when hydration is actually behind. No amber in a resting state.
- Text on mint is `#04342C`. Pure black on mint reads harsh against the rest of the palette.
- Below 14px, step muted text up from `#6B6B6B` to `#8A8A8A`.

---

## Type scale

System sans throughout. `font-variant-numeric: tabular-nums` on anything that counts.

| Role | Size / line | Weight | Tracking | Used for |
|---|---|---|---|---|
| Timer | 44 / 1.0 | 700 | −0.045em | Elapsed session clock |
| Stat value | 22 / 1.1 | 700 | −0.03em | Tile numbers, card stats |
| Screen title | 19 / 1.25 | 700 | −0.02em | Sheet and dialog headings |
| Body | 14 / 1.55 | 400 | 0 | Explanatory copy. Never below 13px. |
| Button | 13 | 700 | 0.1em | Uppercase |
| Label / eyebrow | 10 | 600 | 0.18em | Uppercase |
| Caption | 11.5 | 400 | 0 | Timestamps, secondary detail |

## Spacing and shape

| Token | Value | Applied to |
|---|---|---|
| `--gap` | 9px | Between stacked blocks |
| `--gap-tight` | 7px | Inside tile grids and button pairs |
| `--pad-screen` | 16px 14px | Screen edges, plus safe-area insets |
| `--r-tile` | 11px | Tiles, buttons, list rows |
| `--r-sheet` | 16px | Bottom sheets, top corners only |
| Tap target | ≥ 44px | Everything interactive |

Base unit is 4px. Portrait only, 9:19.5.

---

## Components

Eleven pieces build all thirteen screens. A twelfth is worth a conversation.

| Component | Spec | States |
|---|---|---|
| Button · primary | Mint fill, `#04342C` text, 11px radius, 13/700 uppercase, 0.1em tracking | rest · pressed (scale 0.98) · disabled |
| Button · secondary | 1px `#262626` border, white text, transparent fill | rest · pressed |
| Button · pink outline | 1px pink border, pink text. Hydrate only. | rest · pressed |
| Stat tile | Surface fill, 11px radius, uppercase key over tabular value | default · pink value (drinks) · unavailable (hidden, never zeroed) |
| Timer | 44/700 tabular, ticks every 1s, derived from `startedAt` | running · ended |
| Bottom sheet | Scrim, `#0D0D0D` panel, 16px top corners, drag handle | entering · open · dismissing |
| Chip | 1px border, 9px radius, 12px text. Drink presets. | rest · selected (mint border and text) |
| Field | Underline only, uppercase label above, 14px value | empty (placeholder `#3A3A3A`) · filled · focused (mint underline) |
| Warning banner | 1px amber border, 11px radius, amber heading, action pair | only when hydration threshold crossed |
| List row | Surface fill, 9px radius, bold date left, tabular metrics right | rest · pressed |
| Nav pair | Two secondary buttons pinned to the screen foot | rest · pressed |

---

## The thirteen screens

| # | Screen | What it does |
|---|---|---|
| 01 | Start | No login, no email gate. One button. |
| 02 | Live session | Home for the night. Timer, drink/water/steps/distance tiles, Add drink, Hydrate, nav to Map and End. |
| 03 | Pick your poison | Bottom sheet of drink presets, recents floated to top, custom entry. |
| 04 | Map | Live position (white), route (mint), named stops (pink), stats strip, Drop pin. |
| 05 | Drop pin | Name a stop, optional note. |
| 06 | Hydration nudge | Threshold-triggered warning. Also fires as a local notification. Always dismissible. |
| 07 | End night | Confirmation. The one destructive action, tapped at 2am. |
| 08 | Recap | Stats and route the moment a night ends. Make a card, or just save it. |
| 09 | Card builder | Preset / Your photo tabs, live canvas, element toggles. |
| 10 | Share | Feed 4:5 or Story 9:16, native share sheet, save to photos. |
| 11 | History | Stats header, eight-week bar chart, night list, export. Replaces the leaderboard. |
| 12 | Night detail | That night's map, stats, and a timeline. Re-make a card from any past night. |
| 13 | Permission priming | Android-only, shown before the system prompt for background location. |

---

## The share card

The artefact that leaves the app, so it carries the identity alone with no chrome around it. Three layouts across two modes.

- **Mode A · Preset.** One tap, zero editing. Route auto-fitted from the session's GPS trail, four stats, date and area, wordmark.
- **Mode B · Photo, stats bar.** Your picture with numbers locked to a solid footer. Most legible over a busy image.
- **Mode C · Photo, free placement.** Every element draggable and scalable. Dashed mint outline is the selection state and never renders into the export.

| Item | Value |
|---|---|
| Feed ratio | 1080 × 1350 (4:5) |
| Story ratio | 1080 × 1920 (9:16) |
| Render | Offscreen canvas at full resolution, never a scaled-up preview |
| Draggable elements | Stats block · single big stat · route · elapsed time · stops list · drink of choice · date and place · wordmark |
| Safe margin | 64px on all edges at 1080 wide |
| Photo handling | Cover-fit, centred, from the device picker. Never uploaded. |
| Wordmark | Always mint, bottom corner. The one fixed element. |

---

## Voice

Dry, short, never scolding. The app is a record of a good night, not a health intervention — it can be honest about water without moralising. Sentence case in prose, uppercase only on buttons and labels.

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

---

## What's most worth pushing on

Every colour, size and radius reads from custom properties in one stylesheet, so a palette or type change is a handful of lines rather than a refactor. In rough order of leverage:

1. **The wordmark.** Currently plain type as a placeholder. It's on every share card, so it's the highest-leverage thing to draw properly. Also needs to work at 10px.
2. **The preset card.** By a wide margin the most-seen surface. Layout, crop and hierarchy all open.
3. **Mint versus pink weighting.** Mint currently carries all action, pink only drink counts. Worth testing whether pink should own more, given drinks are what people actually post about.
4. **Timer treatment.** Functional at 44/700 but it's the hero of screen 02 and could carry far more character within the system-sans constraint.
5. **Empty and first-run states.** Written in copy, not yet designed.
6. **The icon.** Needs 192, 512, 512-maskable, and an adaptive Android foreground layer. Nothing exists yet.

Hand back changed tokens, layouts, or a redrawn card and they go straight into the build.
