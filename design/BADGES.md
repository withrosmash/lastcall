# Badges — spec for Claude Design

A brief for drawing the achievement set. Everything here is derived from data
the app already stores per night (drinks, waters, pins, trail, steps, distance,
start/end times), so every badge listed is computable with no new tracking.

## Deliverable format

| Item | Value |
|---|---|
| Format | **SVG preferred** (scales, themable). PNG fallback: 512×512, transparent. |
| Canvas | Square. Safe zone: keep artwork inside a centred circle at 88% of width. |
| Display sizes | 64dp in the badge grid, 32dp inline on recap/history — must read at both. |
| States | **Earned:** full colour. **Locked:** same geometry, all strokes `#262626` on `#141414` fill — silhouette only, no colour, no lock icon. |
| Stroke | Match the app's icon language: 1.5 units on a 24 grid (= 32 at 512), round caps and joins. |
| Colour | Ground `#000` or transparent. One accent per badge, chosen from: mint `#7EE0C0`, pink `#F06C9B`, amber `#EF9F27`, forest `#35A26F`. Never more than two accents on one badge. |
| Type on badges | Avoid words in the artwork — the name renders as text beside it. Numerals allowed (e.g. a "10K" mark). |
| No emoji, no gradients on strokes | Bloom-style radial fills are fine behind the mark. |
| Naming | `badge-<slug>.svg`, slugs below. |

## Tone

Same voice as the app: dry, short, never scolding. The funny ones are in on the
joke, not mocking. Health badges never moralise — "Balanced Books", not "Good
Boy". Locked badges show name + criteria in the UI (no mystery badges, except
the two marked 🔒 which show "???" until earned).

## The set

### Firsts (attainable in night one)

| Slug | Name | Criteria (computable) | Accent |
|---|---|---|---|
| `first-night` | First Night | End your first session | mint |
| `on-the-board` | On the Board | Pin your first stop | pink |
| `cover-star` | Cover Star | Share or save your first card | mint |
| `cartographer` | Cartographer | A night with a route and zero tracking gaps | forest |

### Funny

| Slug | Name | Criteria | Accent |
|---|---|---|---|
| `french-exit` | French Exit | Night under 90 minutes with 3+ drinks | pink |
| `marathon` | Marathon, Not a Sprint | Session over 8 hours | amber |
| `one-and-done` | One and Done | Exactly one drink, whole night | mint |
| `mixologist` | Mixologist | 5+ different drink kinds in one night | pink |
| `brand-loyal` | Brand Loyal | 5+ drinks, all the same kind | pink |
| `pin-cushion` | Pin Cushion | 5+ stops in one night | pink |
| `homing-pigeon` | Homing Pigeon | End within 250m of where you started | forest |
| `scenic-route` | Scenic Route | Over 10 km on foot in one night | forest |
| `early-doors` | Early Doors | Session started before 5pm | amber |
| `sunrise-service` 🔒 | Sunrise Service | Session ended after 5am | amber |
| `ghost` 🔒 | Ghost | A tracked night with zero drinks and zero waters logged | mint |

### Health (never scolding)

| Slug | Name | Criteria | Accent |
|---|---|---|---|
| `hydro-homie` | Hydro Homie | More waters than drinks (min 3 drinks) | mint |
| `balanced-books` | Balanced Books | Waters ≥ drinks with 4+ drinks | mint |
| `metronome` | Metronome | 4+ drinks and the hydration nudge never fired | mint |
| `two-step` | Two-Step | 5,000+ steps in a night | forest |
| `ten-k` | 10K | 10,000+ steps in a night | forest |
| `dry-run` | Dry Run | A tracked night of waters only (3+) | mint |

### Streaks

| Slug | Name | Criteria | Accent |
|---|---|---|---|
| `good-habits` | Good Habits | Nudge never fired, 3 nights running | mint |
| `regular` | Regular | Same named stop pinned on 3 different nights | pink |
| `month-in-books` | Month in the Books | 4 nights tracked in one calendar month | amber |

### Aspirational (all-time accumulators)

| Slug | Name | Criteria | Accent |
|---|---|---|---|
| `fifty-stops` | Fifty Stops | 50 stops pinned all-time | pink |
| `century-club` | Century Club | 100 km walked across all nights | forest |
| `archivist` | The Archivist | 25 nights tracked all-time | amber |

## Implementation notes (for the build, not for design)

- Badge evaluation is a pure function over `sessions[]` run at end-of-night;
  newly earned badges surface on the recap screen and live in a grid reachable
  from History.
- "Nudge never fired" = at no point did drinks-since-water reach the user's
  threshold, evaluated against their setting that night.
- Streaks count consecutive *tracked nights*, not consecutive days.
- Earned badges store `{ slug, earnedAt, sessionId }` so the night that earned
  it is linkable.
