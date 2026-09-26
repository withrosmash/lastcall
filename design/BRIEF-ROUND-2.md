# Last Call — design brief, round 2

Paste this whole file into Claude Design. If the session doesn't already have
the Last Call design system, attach `design/HANDOFF.md` (the system) and
`design/AVATAR-MOTION.md` (the avatar's movements and expressions) as well.

Four pieces of work, in priority order. Each ends with what to hand back.

---

## What has changed since the design system

- **A pixel avatar** now lives in the app: on the home screen, beside the clock
  during a night, and on the recap. It's a 32 × 43 pixel chibi drawn in code,
  recoloured at draw time, with a customise screen (six hair styles, seven
  colour slots, sliders that reach any colour). It reacts to everything you log
  and has moods. Full detail in `AVATAR-MOTION.md`.
- **Maps** use Esri's Dark Gray Canvas tiles (CARTO started watermarking).
- **The share card** has real map backgrounds, snapping guides, text themes
  (Light / Halo / Dark), and a "Save for video" export of see-through PNGs.
- The app is still in testing with a small group. Nothing is public yet.

---

## 1. A stronger forest bloom (dark mode)

The client wants more of the forest green glow. Today:

```
--bloom-hero: radial-gradient(120% 80% at 50% 0%,
  rgba(33,118,79,.55) 0%, rgba(10,36,25,.35) 42%, rgba(0,0,0,0) 78%);
```

A starting point we mocked up (brighter at the top, reaching further down):

```
radial-gradient(135% 95% at 50% 0%,
  rgba(53,162,111,.62) 0%, rgba(33,118,79,.44) 30%,
  rgba(10,36,25,.30) 60%, rgba(0,0,0,0) 88%)
```

Please tune it by eye on real screens, and bring `--bloom-foot` (the recap
screen) up to match. Keep the grain layer — a stronger green field bands on
OLED without it. Check that text over the brightest part of the bloom still
reads (the clock and the "On the night" label sit there).

**Hand back:** updated `--bloom-hero` and `--bloom-foot` values, and the glass
values if they need to move with it.

---

## 2. Light mode

**This overrides constraint 1 of the original brief ("there is no light
mode").** The client wants one. Dark stays the default, because the app is used
in dark rooms; Settings gets Light / Dark / Match phone.

**The bloom colour in light mode is cobalt blue** — the client's choice.

We compared three grounds with a cobalt bloom (mockups shared separately) and
recommend **"Ice"**: a ground tinted slightly toward cobalt, white tiles, deep
navy ink. On pure white the bloom sits on top like a stain; on a faintly blue
ground it melts in, the way forest melts into black today. White tiles lift off
that ground the way grey tiles lift off black, so the layout keeps its
structure without outlines everywhere.

Starting palette (every figure checked against WCAG contrast):

| Role | Dark today | Light (Ice) | Contrast in light |
|---|---|---|---|
| Ground `--bg` | `#000000` | `#EEF2F8` | — |
| Tiles `--surface` | `#141414` | `#FFFFFF` | — |
| Sheets `--surface-2` | `#0D0D0D` | `#F7F9FC` | — |
| Hairlines `--line` | `#262626` | `#D5DDE9` | — |
| Text `--text` | `#FFFFFF` | `#0B1526` | 16.3 : 1 |
| Secondary `--muted` | `#6B6B6B` | `#4A576B` | 6.5 : 1 |
| Labels `--faint` | `#4D4D4D` | `#626E81` | 4.6 : 1 (5.2 on tiles) |
| Bloom | forest `#21764F` | cobalt `#0047AB` | — |
| Primary button | mint fill | mint fill, unchanged | ink on mint 8.7 : 1 |
| Mint used as text | `#7EE0C0` | deep teal `#0B6E55` | 6.2 : 1 (mint itself 1.6) |
| Drinks pink | `#F06C9B` | `#C92F68` | 5.1 : 1 (today's pink 2.9) |
| Water amber | `#EF9F27` | `#A35F00` | 5.0 : 1 |

Cobalt bloom starting point:
`radial-gradient(120% 80% at 50% 0%, rgba(0,71,171,.30) 0%, rgba(0,71,171,.12) 45%, rgba(0,71,171,0) 80%)`

Things that need a decision, not just a colour swap:

- **Mint stays the brand but changes role**: a fill for buttons only, never
  text on a light ground. Anywhere mint is text today, light mode needs the
  teal (or your better answer).
- **Forest glass** (translucent green panels) has no meaning on a light
  ground. What replaces it — cobalt glass, plain white cards, something else?
- **Glows** (`--glow-mint` on the primary button) read as smudges on light
  grounds. Replace with a shadow, or drop?
- **Maps**: Esri also has a keyless Light Gray Canvas, so maps can go light.
  The route stays mint (with a darker under-stroke), pins stay pink.
- **The Android status bar and navigation bar** need dark icons in light mode.
- **The share card is not themed** by this. Cards keep their own text themes.
- **The avatar needs no changes**: its outlines are darker tones of each colour,
  not black, and it reads on both grounds. Please confirm by eye.

**Hand back:** `tokens/colors-light.css` using exactly the same token names as
`colors.css` (so the build swaps one file), the cobalt bloom values, and these
screens in light: Start, Live night (with the hydration warning showing),
Recap, History, a bottom sheet, the avatar customise screen, the map.

---

## 3. The avatar: art pass, unlockable items, glasses

Read `AVATAR-MOTION.md` first. It has the grid, the parts, every expression
and every animation, and the rules below.

### Keep exactly as is

- One body shape.
- The **resting smile is two rows**: two corner pixels, then a four-pixel line
  one row down. A three-row U was tried and rejected by the client.
- **No facial hair** — tried and taken out.
- Never drunk, dizzy, sick or sad. It gets livelier with water, food and steps,
  never with drinks. No guilt for not opening the app.

### Constraints that keep your art drop-in

- **32 × 43 pixel canvas**, head centred at (16, 17), eyes at (12, 19) and
  (20, 19). The engine draws at 12 frames a second on whole pixels.
- **Named colour slots, not fixed colours**: skin, hair (also brows), eyes,
  cheeks, top, bottoms, shoes. The user can pick any colour for each, so every
  item must work in any colour. Shading and outlines are derived by the engine
  from the slot colour (outline = a darker tone of the neighbouring colour,
  never black).
- **Items are layers** on that grid with their own fixed colours or a named
  slot. Tell us which layer each sits on (behind hair, over hair, over face,
  in hand).
- Everything must read at **phone size (3 × scale, about 96 px wide)** and at
  **watch size (about 24 px)**.

### Unlockable items

Earned items give people a reason to come back without spending money. The
client asked for items unlocked by challenges, plus sunglasses and ordinary
glasses. Our proposal:

| Item | How you get it | Notes |
|---|---|---|
| **Glasses** (2–3 frame shapes) | Free from the start | They're part of how someone looks, like hair, so they shouldn't be locked. |
| **Sunglasses** | First Dare — first challenge done | |
| **Party hat** | Game On — three challenges in one night | |
| **Headphones** | No Notes — five challenges in one night | |
| **Bucket hat** | Ringleader — 25 challenges all-time | |
| **Crown** | Chaos Agent — 100 challenges all-time (hidden badge) | The top prize. |
| **Trainers** (shoe style) | 10K — 10,000 steps in a night | |
| **Water bottle** (held) | Hydro Homie — more waters than drinks | |
| **Cap** | Early Doors — a night started before 5pm | |

Rule: **nothing unlocks from a drinking badge** (French Exit, Brand Loyal,
Mixologist, Marathon). Swap any of these for better ideas, but keep that rule.

Design problems to solve, not just draw:

- **Sunglasses hide the eyes**, which do most of the acting. Do they slide
  down the nose for big reactions, get pushed up onto the head, or do the brows
  carry it?
- **Hats against six hairstyles**: a hat hides the crown, but Bun, Quiff,
  Curly and Long each stick out differently. Show each hat on each style.
- **Ordinary glasses must not hide expressions**: happy arcs, hearts and stars
  all have to show through or around the frames.

### Tops

"Top" is only a colour today. A few shapes would add a lot: T-shirt (today),
hoodie, shirt with a collar, jacket, and a dress or long top. Same body.

### Screens and moments

- **The customise screen** — built by us, functional, not designed. Please
  design it properly: preview, hair, glasses, items (showing locked ones with
  how to earn them), colour picking.
- **The unlock moment**: a badge is earned and an item comes with it.
- **Morning after**: the first open the day after a night. Pyjamas, messy hair,
  mug in both hands, the night's numbers.
- **The avatar on the share card**: where it sits in the preset layouts, and as
  a draggable element in photo mode. It must be drawable on a canvas.
- **The avatar walking the route** on the map and on the history slider — a
  map-scale sprite.
- **A reference sheet**: every expression at phone size and at watch size.

**Hand back:** pixel art for each item, top and scene on the 32 × 43 grid
(PNG at 1× and a colour-slot key, or the pixel maps as text, which is how the
engine stores them), the customise screen, and the three moments.

---

## 4. Also worth doing (optional, pick any)

- **Settings → Appearance**: Light / Dark / Match phone, with a preview.
- **A light share-card theme**: cobalt bloom on the Ice ground, for people
  whose photos are bright or who just want a light card.
- **First launch**: the avatar introduces itself and walks people through the
  permissions, instead of the plain priming screen.
- **App icon and splash**: the current icon is our route-line placeholder.
  If you refresh the brand for light mode, the icon should follow, plus the
  small monochrome icon Android shows in the tracking notification.

---

## Unchanged from the original brief

System fonts only (the app runs offline). Tap targets 44 px or larger. Safe
areas respected. The share card is drawn on a canvas, never screenshotted. The
Android tracking notification can't be restyled.
