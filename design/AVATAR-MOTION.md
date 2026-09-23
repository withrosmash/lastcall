# Avatar motion brief

One body shape, any colours. The character is a 32 x 43 pixel chibi (the head
is over half its height) drawn in code from simple shapes plus small pixel maps
for the eyes, mouths and props. It is recoloured at draw time, so a new skin
tone or outfit colour costs nothing and ships no new art. Outlines are a darker
tone of whatever they border, never flat black, which keeps it soft on the
app's black background.

Working prototype: https://claude.ai/artifact/4iD1aQfs7V5P67Q7sxTeR1

## House rules

- **12 frames a second**, everything snapped to the pixel grid. Sub-pixel motion
  breaks the look.
- **Six frames or fewer per loop.** If it needs more, it is too fussy.
- **Reads at both sizes**: full size on the phone and 24px on a watch face.
  Silhouette first — if the pose is unclear in solid black, redraw it.
- **Hair is the only part that lags** behind the head. One beat, no more.
- **Anticipation before, settle after.** Dip before a lift, overshoot then settle
  on a landing. This is where the personality lives.
- **Never drunk, never unwell.** The avatar gets livelier with water, food and
  steps, not with drinks. No stumbling, no green faces, no guilt states for
  neglect. (Also what keeps us inside Apple's rule 1.4.3.)
- Respect the reduce-motion setting: fidgets stop, reactions shorten, no particles.

## The face

Most of the extra resolution went into the face, because that is where the
cuteness lives.

- **Eyes**: 4 x 5 pixels, set low and wide. Dark top, the chosen eye colour at
  the bottom, a highlight in the top-left corner that stays put whichever way the
  eye looks. Eyelids can drop partway (thirsty, sleepy, determined) and blinks
  take three frames: half, shut, half.
- **Expressions**: open, happy arcs, content (closed and smiling), surprised
  (whites showing, small pupils), puppy (taller, extra highlight), hearts, stars,
  wink, heavy lids, looking left, right and up.
- **Eyebrows**: raised, soft, determined and happy. A lot of the acting is here.
- **Blush**: its own colour, so it works on every skin tone. Warms up for happy
  moments.
- **Mouths**: smile, cat (ω), open with tongue, ooh, wide, flat, small.

## The movements

| When | Movement | What happens | Status |
| --- | --- | --- | --- |
| Always on | Breathing | Shoulders and head rise a pixel, a beat apart | prototype |
| Always on | Blinking | Every 2–6s, sometimes a double blink | prototype |
| Always on | Hair trail | Hair follows the head a beat late | prototype |
| Idle fidget | Weight shift | Leans onto one foot, glances aside, settles | prototype |
| Idle fidget | Look around | Head turns left, holds, turns right | prototype |
| Idle fidget | Foot tap | Taps along to music it can apparently hear | prototype |
| Idle fidget | Yawn | Arms up, mouth wide, slow blink. After midnight or 4h out | prototype |
| Idle fidget | Fan itself | Warm-and-thirsty fidget when water is overdue | prototype |
| Idle fidget | Hum | Eyes closed, sways, a note floats up | prototype |
| Idle fidget | Hello | Notices you, waves, winks. Rare | prototype |
| Idle fidget | Hair flick | A rare one-off preen | planned |
| Idle fidget | Pocket check | Pats pockets, finds phone, relieved. Rare | planned |
| You logged | Drink | Dip to wind up, tip back, two gulps, lower with a satisfied look. Friendly, not a celebration | prototype |
| You logged | Water | Gulp, then a star-eyed jump with hands on cheeks and sparkles. The most rewarding animation in the set, deliberately | prototype |
| You logged | Food | Two bites with the head lunging in, cheeks full, crumbs | prototype |
| You logged | Check in | Looks up as the pin drops, waves, little hop | prototype |
| You logged | Steps | Walk cycle with arms swinging, on a step milestone | prototype |
| Night | Start night | Crouch, jump with both arms up, land with the hair bouncing after | prototype |
| Night | End night | Stretch, yawn, shoulders drop, eyes close, Zzz | prototype |
| Night | Morning after | Pyjamas, messy hair, mug in both hands, slow blink, small wave | planned |
| Reward | Badge earned | Looks up, catches it, holds it overhead while it sparkles | prototype |
| Reward | Challenge done | Two quick jumps with arms up | prototype |
| Reward | Challenge accepted | Rolls up sleeves, determined nod | planned |
| Reward | Card shared | Holds up a tiny card, camera flash, grins | prototype |
| Nudge | Water reminder | Taps the inside of the screen, then holds up a cup with puppy eyes | prototype |
| Nudge | Still out? | Checks a watch, shrugs. For the six-hours-no-taps prompt | planned |
| Play | Poke | Tap it: startled jump, then it laughs at you | prototype |
| Play | Dance | Two-step with alternating arms when the pace picks up | prototype |
| Play | Tickle | Five quick pokes: a giggle fit ending in heart eyes. Hidden | prototype |
| Screen | Enter | Pops up from the bottom, overshoots, settles | planned |
| Screen | Leave | Waves and walks off the side | planned |
| Screen | Waiting | Taps foot and checks a watch while something loads | planned |
| Map | Walk the route | Replaces the map dot; walks the route on the history slider | planned |
| Watch | Wrist idle | Blink and the odd happy-eyes. At watch size the face is the whole character | planned |
| Watch | Wrist tap | One-frame nod when logging from the wrist | planned |

## Moods

The idle set changes with how the night is going. Moods never block an action
animation; they decide what it does between them.

- **Fresh** — weight shifts, looking around, foot taps.
- **Thirsty** (drinks since the last water past the reminder threshold) — fans
  itself, slower blinks, half-lidded eyes.
- **Sleepy** (after midnight, or a long night) — yawns, heavier stance.
- **Buzzing** (steps climbing quickly) — foot taps and dancing.

Dizzy or spiral eyes were considered for the tickle and dropped: in an app
that logs drinks they would read as drunk.

## For whoever redraws this

Keep the 32 x 43 canvas, the head centre and the eye positions, and the named
expressions (`open`, `happy`, `content`, `wide`, `puppy`, `heart`, `star`,
`wink` and the lid heights). Every animation refers to those names rather than
to pixels, so redrawn eyes, mouths or hair drop straight in and every movement
keeps working. Adding an outfit means adding one shape, not a new character.
