# Handoff: Last Call, design round 2

## Overview
Round 2 of the Last Call design work. Last Call is a night-out tracker: start a night, log drinks and water, and it draws your route and builds a share card. This round covers:
1. A stronger forest bloom and new label styling (dark mode).
2. A full light mode ("Ice" ground, cobalt bloom).
3. The pixel avatar: customise screen, unlockable items and costumes, hair × hat rules, expressions, the unlock moment, the morning after, the avatar on the share card, and the avatar walking the route.
4. Optional pieces: Appearance setting, a light share card, first launch with the avatar, and app icon, splash and notification icon.

The original brief is in `source/BRIEF-ROUND-2.md`, and the avatar motion spec is in `source/AVATAR-MOTION.md`. Decisions made along the way are in `NOTES.md`.

## About the design files
The files in `designs/` are **design references built in HTML**. They are working prototypes that show the intended look and behaviour, not production code to ship. Recreate them in the app's own environment, using its existing patterns: its screen structure, its component set (Button, StatTile, Chip, Field, BottomSheet, WarningBanner, ListRow, NavPair, Icon, Timer), and its canvas drawing code.

Two files are closer to production than the rest, because the brief asked for drop-in art and canvas-only share cards:
- `designs/avatar-draw.js`: the avatar engine used by every design. It is the source of truth for the avatar's shapes, colour slots, derived tones, layer order and poses. The app's `js/avatar.js` was not supplied, so either port this into it or diff the two.
- `designs/share-card.js`: the share card, drawn with Canvas 2D only (gradients, paths, rects, text, crossOrigin map tiles), plus the per-element transparent export.

To view the designs, serve the `designs/` folder with any static server (for example `npx serve designs`) and open each `.dc.html`. They need `support.js`, `_ds/` and `tokens/` beside them. They load Lucide icons and Esri tiles from the network.

## Fidelity
**High fidelity.** Final colours, type, spacing, copy and interactions. The avatar art is final for this round, apart from the open decisions listed at the end.

## Non-negotiables (unchanged from round 1 unless noted)
- System sans only. No webfonts.
- Every tap target is 44 px or larger. Safe-area insets respected.
- The share card is drawn on a canvas and never screenshotted from the DOM.
- The tracking notification can't be restyled.
- **Changed:** there is now a light mode. Dark stays the default.
- Voice: dry, short, second person, no exclamation marks, no emoji. **No em or en dashes anywhere in copy.**

---

## Design tokens

### Dark (default): changes from round 1
File: `designs/tokens/colors.css`. Load it after the round 1 `colors.css`.
- `--bloom-hero`: `radial-gradient(70% 34% at 50% 0%, rgba(53,162,111,.34) 0%, rgba(53,162,111,0) 100%), radial-gradient(140% 100% at 50% 0%, rgba(33,118,79,.58) 0%, rgba(23,85,59,.40) 34%, rgba(10,36,25,.26) 64%, rgba(0,0,0,0) 90%)`
- `--bloom-foot`: `radial-gradient(70% 30% at 50% 100%, rgba(53,162,111,.26) 0%, rgba(53,162,111,0) 100%), radial-gradient(140% 85% at 50% 100%, rgba(33,118,79,.52) 0%, rgba(23,85,59,.34) 34%, rgba(10,36,25,.20) 64%, rgba(0,0,0,0) 90%)`
- `--glass-3: rgba(6,23,16,.58)` and `--glass-line: rgba(126,224,192,.18)`
- `--faint: #A3A3A3`, the label grey (was `#4D4D4D`). About 4.9:1 where "On the night" sits on the bloom, and 7.3:1 on tiles.
- New `--mint-fill: var(--mint)`. The primary button reads this token.
- Keep the grain layer (`--grain`, 5.5% overlay) on every bloom.

### Labels (decision "2d": no more spaced capitals)
File: `designs/tokens/typography.css`.
- **Eyebrows and wordmark:** `--type-eyebrow: 700 15px/1.2`, `--tr-eyebrow: -0.02em`, sentence case, colour `--faint` (the wordmark uses `--mint-dim`).
- **Tile keys and field labels:** `--type-label: 600 12px/1.2`, `--tr-label: 0`, sentence case.
- **Component change:** remove `textTransform: 'uppercase'` from StatTile, Field and the map stats strip. Buttons keep their capitals.

### Light ("Ice")
File: `designs/tokens/colors-light.css`. It uses the same token names, scoped to `[data-theme="light"]`. Load both files and set `data-theme="light"` on the root to switch themes. Every alias is re-declared in the file, because custom properties resolve where they are declared.

| Token | Light value |
|---|---|
| `--bg` | `#EEF2F8` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F7F9FC` |
| `--line` | `#D5DDE9` |
| `--text` | `#0B1526` (16.3:1) |
| `--muted`, `--muted-up` | `#4A576B` (6.5:1) |
| `--faint` | `#626E81` (4.6:1, 5.2:1 on tiles) |
| `--mint-fill` | `#7EE0C0`, the button fill (ink `#04342C`, 8.7:1) |
| `--mint`, `--mint-dim` | `#0B6E55`, deep teal wherever mint is text or a line (6.2:1) |
| `--pink` | `#C92F68` (5.1:1) |
| `--amber` | `#A35F00` (5.0:1) |
| `--glass-3` / `--glass-line` | `rgba(255,255,255,.62)` / `rgba(0,71,171,.14)`: frosted white glass over the bloom, 18 px blur (decision 4a) |
| `--glow-mint` | `0 6px 16px rgba(11,21,38,.14), 0 1px 2px rgba(11,21,38,.10)`: a soft shadow replaces the glow (decision 4c) |
| `--shadow-sheet` | `0 -8px 28px rgba(11,21,38,.14)` |
| `--scrim` | `rgba(11,21,38,.36)` |
| `--grain-opacity` | `.04` |
| `--bloom-hero`, `--bloom-foot` | cobalt `#0047AB` versions (see file) |
| `--data-route` | `#3FC79E` on a `#0B6E55` under-stroke |

**Component change:** the primary Button background becomes `var(--mint-fill)`. Chips, the Field focus line and other mint text or lines keep `var(--mint)`, which is teal in light mode.

**System bars:** when light is on, set dark status-bar and navigation-bar icons (Android `APPEARANCE_LIGHT_STATUS_BARS` and `APPEARANCE_LIGHT_NAVIGATION_BARS`).

**Maps in light:** Esri `World_Light_Gray_Base`. In dark: `World_Dark_Gray_Base`.

### Unchanged from round 1
Spacing (4 px base, 9/7/16 gaps, 16/14 screen padding), radii (9 chips, 11 tiles, 16 sheet tops, 20 glass), motion (120 ms press, 180 colour, 240 screen, 280 sheet; `cubic-bezier(.16,.84,.44,1)`; press = `scale(.98)`; no bounce), type scale for timer, stat, display, title, body and button.

---

## Screens and views
Each `.dc.html` is a board. The ids (1b, 2d, 4a…) match the decisions in the chat and in `NOTES.md`.

### `Bloom Tuning.dc.html`: bloom and labels
- **Chosen:** 1b (Deep canopy) and 2d (quiet heading labels). The other options stay on the board for reference.

### `Customise Board.dc.html` and `Customise Screen.dc.html`: the customise screen
- **Layout:** a 390 × 845 phone.
  - Eyebrow "Customise".
  - A 188 px preview with the avatar at 4× (128 × 172). Tapping it cycles eight expressions, with a caption "{Expression} · tap for another face".
  - A chip row: Hair, Glasses, Top, Items, Colours.
  - A scrolling panel.
  - Foot: primary "Save look" (reads "Saved" after tapping), then a NavPair with Shuffle and Cancel.
- **Hair, Glasses and Top:** a 3-column grid of neutral tiles (`--surface`, 11 px radius, min height 112). The selected tile gets a 1 px mint border and a mint name.
  - Hair: Short, Long, Bun, Quiff, Curly, Scruffy, Mohawk, Pigtails, Bald.
  - Glasses: None, Round, Square, Browline, and Sunglasses (First Dare).
  - Tops: T-shirt, Hoodie, Shirt, Jacket, Dress.
- **Items:** grouped under Hats, Costumes and Other.
  - Unlocked items show in colour on the avatar's head (2×). Locked items show as flat silhouettes (`#3A3A3A` in dark, `#C3CCD9` in light) with a lock icon and the badge name.
  - Tapping a locked item opens a BottomSheet: the item's silhouette, the badge name as a quiet heading, the requirement, and progress. It has a secondary Close button.
- **Colours:** seven slot chips, each with a 12 px swatch dot (Skin, Hair & brows, Eyes, Cheeks, Top, Bottoms, Shoes).
  - Below them, 44 px swatch buttons (the selected one has a 1 px mint ring).
  - Then three 44 px custom sliders: Colour (hue), Strength (saturation) and Shade (lightness 8 to 92), with a 10 px gradient track and a 24 px thumb.
- **Props:** `theme` (dark or light), `tab`, `sheet`.

### `Light Mode.dc.html`: light mode
- **Decisions:** 4a (frosted glass) and 4c (soft shadow) are chosen. 4b and 4d are for reference.
- **Screens in light:** Start, Live night with the water warning, Recap, History, the drink sheet, Customise, and Map.
  - The Start screen shows the avatar above the title.
  - The Live screen shows the avatar at 2× beside the clock, with a thirsty face.
  - The Map uses light grey tiles, with the mint route on a teal under-stroke and pink stops with a white ring.

### `Avatar Reference.dc.html`: hair × hats and expressions
- **5a:** 11 head states × 9 hair styles.
  - Brims (cap, bucket, cowboy, sleep cap) hide hair above the brim row.
  - Hoods (duck, dino, panda) replace the hair.
  - The party hat, crown, headphones and cat ears sit on top.
  - The bun hides under brims and under the party hat.
- **5b:** 14 named expressions: phone at 3×, with round glasses, with sunglasses, and watch size (face crop 24 × 20 at 1×).
  - Sunglasses move 8 rows up onto the head for hearts, stars, surprised and puppy.

### `Moments.dc.html`: unlock and morning after
- **6a, unlock:** badges earned during a night queue up until the recap.
  - A BottomSheet opens, and the catch animation plays once: looks up (3 frames at 12 fps), catches it (2), holds it up with sparkles (6), wears it.
  - Then you page through the new badges, with dots at the bottom. Each page shows the avatar wearing the item and the badge pin.
  - Buttons: primary "Wear it" (applies the item and moves on) and secondary "Next badge", which reads "Done" on the last one.
- **6b, morning after:** replaces the start screen on the first open after a night, until midday.
  - Eyebrow "{Date} · {Place}", then "Morning." at display size.
  - The avatar at 4× in pyjamas, a sleep cap, messy hair and a mug. Tapping it plays the wave.
  - The line "You were out 5 hours 12 minutes and home by 2:24 am.", then four stat tiles.
  - Primary "Make a card" and a NavPair: See the night, Not now.
  - Loop: sips (6 frames), holds (12), slow blink (2, 4, 2), opens (8), and an occasional wave (6).

### `Share and Route.dc.html`: share card and walking the route
- **Card sizes:** 1080 × 1350 (feed 4:5) or 1080 × 1920 (story 9:16). An optional title of up to 24 characters, with a counter.
- **Route layout:**
  - The Esri dark map fills the top and fades to black behind the text. Route lw 11 in mint, with a `rgba(0,0,0,.55)` under-stroke, and pink stops.
  - Stats in rows, with labels at 600 28px `#A3A3A3` and values at 700 76px:
    1. Distance, Steps
    2. Stops, Drinks (pink), Water, Food
    3. Time out
  - The avatar stands at 10× at the right.
  - Date "Sat 2 August" 30px `#8A8A8A`, and the wordmark "Last Call" 700 40px mint, bottom left.
- **Your photo:** photo under a 34% black wash.
  - Every element can be toggled and dragged: Title, Time out, Stats, Water, Food, Date, Route, Avatar.
  - Elements snap within 30 px to the margins (64), the centre and a third of the way down, with a mint 1 px guide and a dashed selection box.
  - Pinch to resize. Text scales from 0.5× to 2.5×. The avatar steps in whole-pixel scales from 6× to 18×. No flip.
  - Text uses the Halo treatment (shadow `rgba(0,0,0,.7)`, blur 22). The wordmark is fixed at the bottom right.
- **Light card theme:** `theme: 'light'` in `drawCard` (shown in `Extras.dc.html` 8b). It is **not yet in the builder UI**: add Dark and Light chips.
- **Save for video:** a sheet with element chips and a choice of Full frame (every PNG at card size, so layers stack in place) or Cropped (trimmed to each element). It exports one transparent PNG per element (`exportLayers`).
- **Walking the route:** a 12 × 16 sprite at 2× replaces the white position dot, on a soft white 40 × 14 halo.
  - Four-frame walk while the history slider is dragged, one frame per 5 route units. It mirrors when walking left, and stands on frame 1 when released.
  - The slider has pink stop ticks. The stop name shows in pink within 2.5% of a stop, otherwise "Between stops".

### `Extras.dc.html`: optional pieces
- **8a, Settings · Appearance:** two tiles, Dark and Light, each with a mini-phone preview. The selected tile gets a mint border. Selecting one switches the theme at once. No "Match phone".
- **8b:** the light Route card, in feed and story.
- **8c, first launch:** four steps, with progress bars and Back from step 2.
  1. Hello: the avatar waves.
  2. Location.
  3. Steps, meaning motion and activity.
  4. Notification.
  The copy works on both platforms, and each step says what still works without that permission. The permission names for each platform are listed on the board.
- **8d, app icon:** three directions, with **A (the face) recommended**.
  - The icon is the default avatar face on the forest bloom (`#35A26F` to `#17553B` to `#061710`). It is shown in the circle and rounded-square masks, and at 48 px.
  - The monochrome notification and themed icon is a 12 × 12 pixel face, drawn at 2× to 24 px.
- **8e, splash hand-off:** the platform splash can only show the static default face. The app's first frame then draws the user's own avatar in the same circle, at the same size, waving, and fades into home.

---

## The avatar engine (`designs/avatar-draw.js`)
- **Grid:** 32 × 43. Head centre (16, 17), eyes 4 × 5 at x 10 to 13 and 18 to 21, y 17 to 21. 12 fps, whole pixels only.
- **Look object:**
  - `{ hair, top, glasses, hat, held, costume, shoes, eyes, mouth, brows, blush, pose, badge, sparkles, messy, glassesUp, colors: { skin, hair, eyes, cheeks, top, bottoms, shoes } }`
- **API:**
  - `build(look, only?)` returns a pixel grid.
  - `draw(canvas, look, { scale, crop, fit, only, silhouette })`
  - `paint(ctx, look, x, y, scale)` draws into the share card.
  - `mini(look, frame)` and `drawMini(canvas, look, { frame, flip, scale })` for the map sprite.
- **Derived tones:**
  - Outline ×0.58 on edges against empty space or a lower layer. If the part's luminance is under 0.12, the outline mixes 32% toward `#969696` instead.
  - Skin under hair or a hat ×0.86. Highlights mix 32% toward white.
- **Draw order:** hair back, shoes, bottoms, neck, top, arms, head, face, hair front, glasses, hat/hood/ears, held item/badge/sparkles.
- **Pixel maps, 1× PNGs, a contact sheet and a slot key for all 44 layers are in `avatar/`.** See `avatar/README.md` and `avatar/pixel-maps.txt`.

## Unlocks (rule: nothing unlocks from a drinking badge)
- **Free from install:** all hair styles, glasses frames and tops. Which extra items are free is still to decide (see `NOTES.md`).
- **From the brief:**
  - First Dare: sunglasses
  - Early Doors: cap
  - Game On: party hat
  - No Notes: headphones
  - Ringleader: bucket hat
  - Chaos Agent (hidden): crown
  - 10K: trainers
  - Hydro Homie: water bottle
- **New badges needed:**
  - Long Haul (50 km, all time): cowboy hat
  - Nine Lives (nine nights): cat ears
  - Just Add Water (50 waters, all time): duck
  - Left the Building (five stops in one night): Elvis
  - Snack Break (food three times in one night): panda
  - Big Stomp (20,000 steps in one night): dinosaur
  - Late Bite (food after midnight): pizza slice
  - Anniversary (one year): balloon

## Assets
- **Icons:** Lucide via the `lucide-static` CDN, through the `Icon` component. This is a stand-in until a real set exists.
- **Map tiles:** Esri Canvas `World_Dark_Gray_Base` and `World_Light_Gray_Base`. Load with `crossOrigin='anonymous'` for the canvas, and show attribution.
- **Avatar art:** generated by `avatar-draw.js`. There are no bitmaps apart from the exported PNGs in `avatar/png/`.
- **No photography or logo files.** The app icon is drawn in code (see `Extras.dc.html`). Export it at 432 × 432 as the adaptive foreground over a forest background, and at 1024 for the store.

## Open items
1. Add Dark and Light card theme chips to the card builder.
2. Decide which extra items are free from install.
3. The route shape in the designs is a placeholder. The app draws the real GPS track in map coordinates.
4. Messy-hair flyaways could be bolder at phone size.
5. Map sprite hats: only the hoods, crown and party hat show at 12 × 16.

## Files
- `designs/*.dc.html`: the design boards (open with `support.js`, `_ds/` and `tokens/` beside them).
- `designs/avatar-draw.js`, `designs/share-card.js`: the drawing code behind the avatar and share card.
- `designs/tokens/colors.css`, `colors-light.css`, `typography.css`: the round 2 tokens.
- `avatar/`: pixel maps, PNGs, the contact sheet and the avatar README.
- `NOTES.md`: the decision log.
- `source/`: the round 2 brief and the avatar motion spec.
