# Leit avatar, Style B: round 4 hand-back

All three priorities are in this delivery. The app can switch to Style B straight away.

## Files

| Path | What it is |
|---|---|
| `avatar-draw.js` | The drawing code, and the source of truth for every shape, tone and layer. One file with no dependencies, using Canvas 2D only. It exposes `window.LeitAvatar` and `window.LeitGroup`. |
| `pixel-maps.txt` | Every layer in the round 2 notation, extended to four tones, with a key and anchors for each one. |
| `png/` | Every layer at 1× in default colours, on a transparent background. Layers that are empty for a given style are left out. |
| `contact-sheet.png` | Everything at 4× on black. |
| `contact-sheet-light.png` | Everything at 4× on #EEF2F8. |
| `group/` | All 28 group poses drawn at share-card width (1080), plus `group-layouts.json`. |

The PNGs are drawn by canvas, so they carry no C2PA or other metadata.

## Grid and anchors

- **Character:** 64 × 80 pixels. Every shape is defined once on a 48-unit grid, then sampled at pixel centres: `px = u × 1.25 + 2`, `py = v × 1.25`.
- **Map walker:** 16 × 22 pixels, with 4 frames. Mirror it to walk left.
- **Sizes it was checked at:** 3× on the live screen, 10× on the share card and 2× in wardrobe tiles, all on black and on #EEF2F8. 3× makes the figure 192 px wide; 2× makes it 128 px.

Anchor points in the standing pose, in pixels. `LeitAvatar.anchors(look)` returns them for any pose.

| Anchor | Left | Right |
|---|---|---|
| Head centre | 31, 29 | |
| Eye centres | 24, 34 | 39, 34 |
| Neck | 32, 48 | |
| Shoulders | 22, 51 | 41, 51 |
| Hands, arms down | 18, 66 | 45, 66 |

- Hand anchors for each arm pose are listed under each arm map in `pixel-maps.txt`.
- A pose moves the whole upper body by `dy` (one pixel = 0.8 units). Walking bobs one pixel on frames 2 and 4, sitting drops 9 pixels, and the jump's air frame rises 8.

## Tone rules

Every pixel of skin, hair, eyes, cheeks, top, bottoms, shoes, glasses frame and hat belongs to a colour slot: S, H, E, C, T, B, F, G or A. G (glasses frame) and A (hat) are new this round. The engine works out four tones from whatever colour is in the slot.

| Tone | Map | Rule |
|---|---|---|
| base | `H` | The slot colour. |
| shade | `h` | × 0.82 |
| deep shade | `h.` | × 0.58. Also used as the outline on outer edges. |
| highlight | `* + ~ ^ = - _ ! ?` | Mixed 30% toward warm white `#FFF0D6`. If the colour is already very light (luminance over 0.86), mixed 60% toward white instead. |

- **Near-black colours** (luminance under 0.12) lighten instead of darkening, so they stay readable on black. Shade mixes 16% toward `#969696`, and deep shade mixes 34% toward it. Fixed colours follow the same rule.
- **Outlines:** a pixel next to empty space becomes deep shade. A pixel next to a lower layer steps down one tone (base or highlight to shade, shade to deep). Face layers and glasses never create outlines.
- **Hair speckle:** coded hairstyles add a fine two-pixel speckle on top of their shading, borrowed from the hand-drawn styles, so it recolours with the hair.

## Layer order (back to front)

The order is set by `LAYER_Z` in `avatar-draw.js`. A pixel can carry a small z offset to sit between layers.

1. `fxBack`: the rainbow and golden aura effects.
2. `hairBack`
3. `footL`, then `footR`
4. `packBack`: backpacks, capes, costume tails, the astronaut's pack.
5. `body`: neck, top and bottoms.
6. `mode`: mode touches, the badge pin, scarf, backpack straps, and the front pieces of costumes.
7. `armL`, then `armR`. Arms posed in front of the body sit at about 4.6, and raised arms at 5.5.
8. `head`
9. `blush`, then `mouth`, then `eyes`
10. `glitter`
11. `held`, then `grip` (fingers drawn over the held item)
12. `hairFront`
13. `brows`: drawn over the fringe, so expressions read under any hairstyle.
14. `glasses`
15. `hat`: hats, hoods and helmets.
16. `fx`: effects in front of the avatar.

## Layer rules

- **Hats** hide the hair above a set row. Cap, beanie, sun hat, bowler, cowboy, nightcap, and the wizard, chef, pirate and pith hats all do this. Party hat, crown, flower crown, headphones, cat ears and bunny ears sit on top of the hair.
- **Hoods and the helmet** (duck, dino, panda, teddy, astronaut, plain hood) hide all hair outside the face opening. The face is never covered.
- **Costumes** recolour the body, arms and feet, and add their own pieces on the `hat`, `mode` and `packBack` layers.
  - Wizard and chef come with a held prop unless the user picks a different one.
  - The superhero mask is a red frame in the glasses slot, so the eyes stay visible.
  - Elvis swaps in its own hair, aviators and jumpsuit.
- **Held items** set the arm pose unless the look sets one already.
  - Mug, map, book, binoculars and camera are two-handed.
  - The guitar uses two arm poses made for it, `strum` and `fret`.
  - The umbrella raises the arm, the balloon and skateboard hang from a lowered hand, and the rest are held at the chest.
- **Sunglasses and aviators** cover the eyes with their lenses. The other frames sit outside the eye box.
- **Glasses temple arms** are drawn only on head pixels, so the hair covers them.
- **Bald** draws no hair layer and adds a scalp shine to the head.
- **Effects** never draw over the face area, except the thought bubble. Each effect takes `fxFrame` 0–3:
  - sparkles twinkle;
  - hearts and bubbles rise;
  - confetti and snow fall;
  - fireworks expand;
  - the thought bubble fills with dots.
- **Festival glitter** covers the figure but stays clear of the eyes, mouth, brows and glasses.

## Things that never change

These are built into the code:
- no facial hair;
- no drunk faces and no alcohol held by the avatar (the cup is a soft drink with a straw);
- the resting smile is two corners, then a line between them;
- costumes never hide the face;
- near-black parts lighten their outlines.

## The library

- **Hair (15):** short, long, bun, space buns (replaces quiff), curly, scruffy, mohawk, pigtails, bald, coily, braids, buzz cut, long wavy, fluffy and Elvis.
  - Short, scruffy, curly, bun and fluffy are hand-drawn maps in `HAND_HAIR`.
  - The rest are built in code.
- **Tops (7):** tee, hoodie, shirt, jacket, dress, jumpsuit and pyjamas.
- **Glasses:** round, square, browline, sunglasses and aviators, plus none.
- **Eyes (19):** open, happy, content, wide, puppy, heavy, shut, heart, star, look left, look right, look up, wink, thoughtful, concerned, sad, proud, neutral and tired.
  - The lids are drawn in the skin slot.
  - The iris is round, with whites on either side.
  - The right eye mirrors the lid shape only, so the gaze and highlights match.
- **Brows (8), mouths (13) and blush (two strengths):** listed in `pixel-maps.txt`.
- **Expression presets:** happy, thoughtful, concerned, excited, surprised, proud, neutral and tired.
- **Arm poses (13):** down, out, bent, sip, wave (two frames), up, point, chin, both up, plus `cross`, `strum` and `fret` for group and guitar poses.
- **Body poses:** standing, walking (4 frames), sitting, and jumping (crouch and air).
- **Hats (13):** cap, party hat, headphones, sun hat, bowler, cowboy hat, crown, flower crown, cat ears, bunny ears, nightcap, beanie and plain hood.
- **Costumes (10):** duck, dino, panda, teddy, astronaut, wizard, superhero, pirate, chef and explorer, plus Elvis.
- **Held items:**
  - mug, water bottle, pizza and balloon;
  - water glass, cup, food and check-in pin (reaction props);
  - coffee, camera, map, book, umbrella, guitar, binoculars, torch, skateboard and fishing rod;
  - wand and spoon (costume props).
- **Badge:** a chest pin and a held-up medal.
- **Modes:** day out, walk and festival.
- **Accessories:** scarf and backpack.
- **Effects (9):** sparkles, hearts, confetti, rainbow, fireworks, snow, bubbles, thought bubble and golden aura.

## Group poses (Crew)

The layouts are in `group/group-layouts.json`, and the drawing code is `LeitGroup.draw(canvas, size, name, { crew })`. Each pose is an arrangement, not a finished picture, and every member keeps their own look. For each member, a pose sets:
- `x`, `y`: offset in avatar pixels from the card centre and the ground line;
- `drawOrder`;
- the pose, arms, expression, props and effect they use;
- `hideArm`: the arm replaced by a link arm.

Rules:
- **Draw order:** the back row first, then from the outside of each row in toward the centre, so the middle person of a row is fully visible.
- **Two rows:** the front row always sits, and the back row stands at least 38 pixels higher, so every face in the back row stays visible.
- **Link arms** (hug, arms around, cosy and close, group hug): a sleeve runs from the giver's shoulder to the receiver's near shoulder, with the hand resting on it. It replaces the giver's inner arm and is drawn after the receiver.
- **High five:** the facing arms use the wave pose, so the hands meet on the centre line, with a small burst for the clap.
- **Scale on the 1080-wide card:** 8 per pixel for 2 people, 7 for 3, 6 for 4 to 6. Most poses with 5 or 6 people use two rows, so their cards are about 770 px tall.

| Size | Poses |
|---|---|
| 2 | side by side, high five, back to back, sitting together, cheering, sharing a moment |
| 3 | the thinking squad, lined up, group selfie, hug, on an adventure, celebrating |
| 4 | team photo, stacked, outdoor hang, celebration, cosy and close |
| 5 | standing chill, arms around, victory group, adventure crew, festival vibes |
| 6 | group hug, line up, jump shot, adventure, relaxed, night out |

Background scenery from the reference board (mountains, sun, moon, grass) belongs to the card behind the avatars, not to these layouts.

## Not in this round

- The laptop prop, and the study and laptop poses.
- Pets.
- Backgrounds.
- Groups of more than 6.
- Which badge unlocks which item.
