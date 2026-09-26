# Last Call — design system

A solo night-out tracker for Android. You start a session when the night begins, log what you drink, keep water honest, and the app draws your route across a map as you move between places. When you end the night it produces a shareable card.

Native Android, not a website: tracking has to survive a locked phone in a pocket. No accounts, no server, no network calls — everything lives on the device.

**Audience:** one person, out at night, slightly drunk, holding a phone one-handed in a dark, loud room.
**The job of the interface:** log a drink in under two seconds without thinking, and produce something worth posting the next morning.

## Sources this system was built from

- `uploads/BRIEF.md` — the design brief: colour table, type scale, spacing, the eleven-component inventory, thirteen screens, share-card spec and the full voice/string list. This is the ground truth for every number here. It is described as the plain-text twin of `design/handoff.html` in the app repo — **that file was not supplied**, and neither was the app codebase or a Figma file.
- `uploads/app1–app6.webp` — six third-party app shots the client supplied as visual reference (an AI agent app, a wellbeing quiz, a cooking app, a camping-rental app, a voice recorder, and a focus app). They are mood only; nothing was copied from them. What they contributed: deep near-black grounds with an ambient green bloom behind content, translucent glass tiles over that bloom, large tight-tracked headlines, pill-shaped chips, fine grain over large colour fields.
- Client direction, verbatim: dark theme with a **forest green hero colour**.

**No logo, icon set, font files or photography were supplied.** See `assets/README.md` for what stands in and `guidelines/wordmark.html` for the placeholder wordmark.

## Index

| Path | What's in it |
|---|---|
| `styles.css` | The one file consumers link. `@import`s only. |
| `tokens/colors.css` | Ground, neutrals, forest ramp, action + data colours, glass, bloom gradients |
| `tokens/typography.css` | System-sans stack, sizes, weights, tracking, semantic `--type-*` shorthands |
| `tokens/spacing.css` | 4px base, gaps, screen padding, radii, tap targets, safe areas |
| `tokens/effects.css` | Shadows, glows, blur, motion durations and easings, grain |
| `tokens/base.css` | Element resets and three utility classes (`.lc-num`, `.lc-label`, `.lc-bloom`, `.lc-grain`) |
| `components/actions/` | `Button`, `NavPair` |
| `components/data/` | `StatTile`, `Timer`, `ListRow` |
| `components/inputs/` | `Chip`, `Field` |
| `components/feedback/` | `BottomSheet`, `WarningBanner` |
| `components/media/` | `Icon` — intentional addition, see below |
| `ui_kits/android-app/` | The thirteen app screens as a click-through kit (`index.html`) |
| `ui_kits/share-card/` | The three share-card layouts, drawn on canvas at 1080 wide |
| `guidelines/` | 17 foundation specimen cards |
| `assets/README.md` | Why there is no logo, and what to do instead |
| `SKILL.md` | Agent-skill entry point |

## Non-negotiable constraints

Each of these has already killed an alternative. Do not design past them.

1. **Dark ground is load-bearing, not stylistic.** The app runs GPS for six hours in dark rooms. A light theme costs real battery on OLED and wrecks night vision. There is no light mode.
2. **Type is the system sans.** The app boots offline from a service worker; a webfont that silently fails to load would break every layout. Character comes from weight, tracking and scale.
3. **Android forces a permanent foreground-service notification** while tracking. It cannot be hidden or restyled. Design around it — the kit shows it in place.
4. **Every tap target is 44px or larger.** This is operated by people who have been drinking.
5. **Safe-area insets are mandatory.** Gesture-nav bars sit exactly where the primary action wants to be.
6. **The share card is drawn on a canvas, not screenshotted from the DOM.** Compositing a live map would taint the canvas and make export throw. Anything in a card design must be drawable with Canvas 2D.

---

## Content fundamentals

**Voice: dry, short, never scolding.** The app is a record of a good night, not a health intervention. It can be honest about water without moralising.

- **Second person, and sparing.** "You've been out 5 hours 12 minutes." Never "we", never "let's". The app does not have a personality that talks about itself.
- **Sentence case in prose. Uppercase only on buttons and labels.** `Start night` renders as `START NIGHT` because the button style uppercases it — the string itself is sentence case.
- **Statements, not exclamations.** No exclamation marks anywhere. No "Oops", no "Nice one", no praise.
- **Two-beat structure for anything that asks something.** A flat observation, then the smallest possible reason. "Five drinks since your last water." / "Takes ten seconds. Tomorrow says thanks."
- **Failure states name what still works.** "Waiting for GPS. Everything else still works." · "Location is off, so there's no map tonight. Drinks, water and time are all still being tracked."
- **No emoji. Ever.** Not in copy, not in labels, not as icons. The palette and type carry the tone.
- **No jargon and no metrics-speak.** "Nights out", not "sessions logged". The one exception is the technical honesty in permission copy, where naming Android's own wording ("Allow all the time") saves the user a hunt.
- **Destructive copy is plain about consequence.** "Call it a night?" then "This stops tracking and builds your recap. You can't reopen a session once it's closed."

Canonical strings live in `uploads/BRIEF.md` under Voice and in `guidelines/voice.html`. Use them verbatim rather than paraphrasing; the tagline is **Track the night. Piece it together later.**

---

## Visual foundations

### Ground and colour
True black `#000000` is the page ground everywhere — not a dark grey. Forest green is the brand hero and owns **depth**: bloom, glass, marketing surfaces. Mint owns **action**. Pink and amber are **data colours**, never decoration.

- One mint element per screen. If a screen needs two primary actions, one of them isn't primary.
- Pink (`#F06C9B`) marks drink counts and named stops. It never becomes a button fill.
- Amber (`#EF9F27`) appears only when hydration is actually behind. No amber in a resting state.
- Text on mint is `#04342C`, never pure black — black reads harsh against the rest of the palette.
- Below 14px, step muted text up from `#6B6B6B` to `#8A8A8A`.
- The forest ramp: `--forest-950` through `--forest-300`, with `--forest-500 #21764F` as the hero. 700–900 carry depth; 300–400 are for hairlines and glow only, never for large text.

### Backgrounds
Flat black with a **radial forest bloom** anchored to the top of the screen (`--bloom-hero`) or the foot (`--bloom-foot`). No photography is supplied, so bloom does the work imagery would otherwise do. Over every bloom sits **fine grain** at 5.5% opacity in overlay mode (`--grain`) — it keeps large green fields from banding on OLED. No pattern fills, no illustration, no gradient meshes, and never a purple-blue gradient.

### Type
System sans only. The scale is fixed: timer 44/700/−0.045em, stat 22/700/−0.03em, display 34/700/−0.035em (marketing and empty states), title 19/700/−0.02em, body 14/1.55, button 13/700 uppercase +0.1em, label 10/600 uppercase +0.18em, caption 11.5/400. Body never goes below 13px. `tabular-nums` on anything that counts, always.

Tracking carries the character: negative on everything large, strongly positive on the small uppercase runs. That contrast — a −0.045em timer over a +0.18em eyebrow — is the type identity.

### Spacing and layout
4px base unit. 9px between stacked blocks, 7px inside tile grids and button pairs, 16px between sections. Screen padding 16px vertical / 14px horizontal, plus safe-area insets. Portrait only, 9:19.5.

Layout is a single column: head, content, a flexible spacer, then actions pinned to the foot. The primary action is always the lowest full-width element above the safe-area inset; navigation sits below it as a two-up `NavPair`. Nothing floats over content except sheets.

### Corners and borders
9px chips and list rows, 11px tiles and buttons, 16px on sheet **top corners only**, 20px on forest-glass cards. Borders are 1px hairlines: `--line #262626` on neutral surfaces, `--glass-line rgba(126,224,192,.14)` on glass. There are no 2px borders and no coloured left-border accents.

### Cards and surfaces
Two kinds, and they don't mix:
1. **Neutral tile** — `#141414` fill, 11px radius, no border, no shadow. Stat tiles, list rows, sheets. This is the app's working surface.
2. **Forest glass** — `--glass-3` fill, 1px mint-tinted hairline, 20px radius, 18px backdrop blur. Only ever placed over bloom or imagery; over flat black it looks like a mistake. Used for the route card, the history chart, marketing surfaces.

### Depth, shadow and glow
On true black an outer drop shadow does almost nothing, so depth comes from **glow and hairlines**. `--glow-mint` sits under the primary button. `--shadow-sheet` (`0 -12px 32px rgba(0,0,0,.72)`) is the one real shadow, lifting a sheet off the screen. `--shadow-inset-glass` gives glass a 1px top highlight. Nothing else casts.

### Transparency and blur
Blur only where something is behind it: sheets over content (24px), glass over bloom (18px), chrome over the map (12px). Never blur over flat black — it costs a compositing layer and shows nothing.

### Protection gradients
Type over a map or photo sits on a gradient, not a capsule: `--protect-bottom` (black 92% → transparent, 38% midpoint) under the map's stats strip, `--protect-top` under status chrome. Capsules are reserved for the Android service notification, which needs to read as system chrome rather than app content.

### Animation
Short and flat. 120ms press, 180ms colour, 240ms screen fade, 280ms sheet. `--ease-out cubic-bezier(.16,.84,.44,1)` by default, `--ease-sheet cubic-bezier(.2,.9,.25,1)` for sheets. **No bounce, no spring, no overshoot** — someone drunk in a dark room does not need things springing about. The only continuous motion in the app is the timer ticking, once a second.

### Interaction states
There is no hover state: this is a touch app, and any hover you add is dead weight. **Press is `scale(0.98)`** on every interactive element, plus nothing else — no colour shift, no opacity dip. Disabled drops to 38% opacity and stops pointer events. Focus (relevant only to fields) turns the underline mint. Selected chips take mint border + mint text and never a fill.

### Imagery
None supplied. When the user's own photo enters the system (share card, Mode B/C) it is cover-fit, centred, from the device picker, never uploaded, and always sat under a 34% black wash so white type holds. Treat user photos as warm and unpredictable — the wash and the solid stats footer are what keep the card legible.

---

## Iconography

- **Glyph set: Lucide, via `lucide-static` CDN — a flagged substitution.** The brief specifies no icon set and the repo shipped none, so rather than draw marks we link Lucide: 1.5px stroke, rounded caps, 24px grid, which matches the app's hairline weight. Replace with the real set the moment one exists; only `components/media/Icon.jsx` needs changing.
- **How icons are rendered:** `Icon` applies the SVG as a CSS `mask` and fills with a colour token, so a glyph always takes a palette colour and never ships its own. `<Icon name="droplet" size={16} color="var(--amber)" />`.
- **No icon font, no sprite sheet, no inline hand-drawn SVG.** Do not author new glyphs for this system.
- **Icons are functional, never decorative.** They appear in three places only: inside a button next to its label (`plus`, `droplet`, `map-pin`, `share-2`, `download`), in status chrome (`signal`, `wifi`, `battery-medium`, `circle-dot`), and as timeline markers (`map-pin`). Stat tiles have no icons — the uppercase label is the identifier.
- **Sizes:** 13px in status chrome, 15–16px inside buttons, 22px maximum. Icons take the colour of their context: mint-ink on a mint button, pink inside a pink button, `--muted-up` in chrome.
- **Emoji are never used.** Neither are unicode glyphs as icons; the one non-ASCII characters in use are the `·` separator and curly quotes in prose.
- **The app icon does not exist yet** — 192, 512, 512-maskable and an adaptive Android foreground layer are all outstanding.

---

## Components

The brief defines the inventory: eleven pieces build all thirteen screens. Those eleven map onto nine exported components, because three of them are `Button` variants and the twelfth ("worth a conversation") was not built.

| Brief component | Here |
|---|---|
| Button · primary / secondary / pink outline | `Button` `variant="primary" \| "secondary" \| "pink"` |
| Stat tile | `StatTile` |
| Timer | `Timer` |
| Bottom sheet | `BottomSheet` |
| Chip | `Chip` |
| Field | `Field` |
| Warning banner | `WarningBanner` |
| List row | `ListRow` |
| Nav pair | `NavPair` |

### Intentional additions

- **`Icon`** — a wrapper for the Lucide glyph set. The brief lists no icon component but the screens clearly use glyphs; this keeps them tinted from tokens instead of hard-coded per use.

Nothing else was added. There is no Toast, Avatar, Tabs or Tooltip in this system because there is none in the product.

## Open items, in the brief's order of leverage

1. **The wordmark.** Plain type placeholder today. It is on every share card and has to work at 10px.
2. **The preset card.** The most-seen surface. Layout, crop and hierarchy are all open.
3. **Mint versus pink weighting.** Mint carries all action, pink only drink counts. Worth testing whether pink should own more, given drinks are what people post about.
4. **Timer treatment.** Functional at 44/700, but it's the hero of the live screen and could carry more character within the system-sans constraint.
5. **Empty and first-run states.** Written in copy, not yet designed.
6. **The app icon.** Nothing exists.
