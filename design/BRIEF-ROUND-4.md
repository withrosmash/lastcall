# Leit: Claude Design brief, round 4 (avatar, Style B)

Leit is an adventure app for nights out, days out, walks and festivals. Its heart is a pixel avatar that comes along with you: it reacts when you log things, dresses for the kind of adventure, earns items from badges, and stars in the share card. The owner made a concept board for a richer version of the character ("Style B"). This round turns that board into production pixel art that the app's animation engine can use.

The concept boards are in `design/round4/reference/`:
- 1-customise-and-expressions.webp
- 2-style-a-vs-b-poses-group.webp
- 3-unlockable-items.webp
- 4-group-poses.webp

They are concept images, not source art. Their pixels aren't on a consistent grid, so please redraw everything on the grid below rather than tracing them.

Your round 2 avatar hand-back (`design/round2/avatar/`: pixel-maps.txt, png/, contact-sheet.png, avatar-draw.js) is the format to follow again. The app's engine (`js/avatar.js`) is built on it.

## 1. The character, Style B

- **Look:** Style B on board 2: the same chibi character and proportions as today, with more texture in the hair, softer shading on clothes and skin, warmer colour, and bigger, more expressive eyes. It must still read clearly when small.
- **Grid:** 48 × 64 pixels (today's is 32 × 43). Hard pixels only: no anti-aliasing, no partial transparency, no gradients.
- **Sizes it must work at:**
  - 3 pixels per grid pixel on the live screen (about 144 px wide);
  - 10 per pixel on the share card;
  - 2 per pixel in wardrobe tiles;
  - on black and on the light ground (#EEF2F8).
- **Map walker:** a separate small sprite, 16 × 22, with 4 walking frames (mirrored for walking left). It is shown on the history map.

## 2. The rules the art must follow, or the engine can't use it

**Recolourable slots.** Every pixel of skin, hair, eyes, cheeks, top, bottoms and shoes is drawn in a slot, never a fixed colour. Users can pick any colour for any slot. Use the round 2 slot letters:

| Letter | Slot |
|---|---|
| S | skin |
| H | hair and brows |
| E | eyes |
| C | cheeks |
| T | top |
| B | bottoms |
| F | shoes |

Style B needs more tones per slot than round 2. Please use four:

| Tone | Written as | Example for H |
|---|---|---|
| base | uppercase letter | `H` |
| shade | lowercase letter | `h` |
| deep shade | the letter with a dot | `h.` |
| highlight | the round 2 symbols | `* + ~ ^ = - _` |

Say in the README how you'd like each tone derived from the slot colour (for example, shade ×0.82). The engine computes them, so a pale pink hoodie and a black one both look right.

Fixed colours (white of the eyes, metal, items) are fine, listed under each map as in round 2.

**Separate parts that move.** The engine animates by moving parts, so draw each one as its own layer, aligned to the 48 × 64 grid:
- hair back;
- body (neck, top, bottoms);
- head;
- face: eyes, brows, mouth and blush, each as separate sets;
- hair front;
- left foot and right foot, separately;
- arms, as separate pose sprites (see 3);
- glasses;
- hat, hood or ears;
- held item;
- the mode touch layer;
- effects.

**Mark these points on the grid** so props and arms line up:
- the neck;
- each shoulder;
- each hand, in every arm pose;
- the head centre;
- the eye centres.

**Things that never change**
- **No facial hair.**
- **The avatar is never shown drunk.** No woozy faces, and no alcohol held by the avatar.
- **The resting smile is the traditional shape:** the corners, then a line between them. The owner picked this after testing the alternatives.
- **Glasses are free to choose. Sunglasses are earned.** There's also a no-glasses option.
- **Bald is a hairstyle,** as now.
- **Costumes and hoods never hide the face.**
- **Near-black parts must stay readable on black,** as in round 2.

## 3. What to draw

### Priority 1: the character and everything it has today, in Style B

- **Hair (10):**
  - today's: short, long, bun, quiff, curly, scruffy, mohawk, pigtails, bald, and Elvis (costume only);
  - plus 4 new ones from board 1: coily/afro, braids, buzz cut, long wavy.
- **Tops (7):** t-shirt, hoodie, shirt, jacket, dress, jumpsuit (Elvis), pyjamas.
- **Glasses (5):** round, square, browline, sunglasses, aviators (Elvis).
- **Expressions.** Today's eye, mouth and brow sets, in Style B:
  - **eyes:** open, happy, content, wide, puppy, heavy, shut, heart, star, look left, look right, look up, wink;
  - **mouths:** smile, cat, open, ooh, wide, flat, small;
  - **brows:** soft, raised;
  - **blush:** two strengths.

  Plus the new ones from boards 1 and 2: Thoughtful, Concerned, Sad / empathetic, Proud / celebrating, Neutral / listening. Each needs eyes, brows and mouth that combine freely.
- **Arm poses:** down, out, bent (holding), sip, wave (two frames), up. Plus new: pointing, hand on chin (thinking), both arms up (jump or celebrate).
- **Body poses:** standing; walking (4 frames); sitting (new); jumping (new, a crouch frame and an air frame).
- **Today's items, redrawn:**
  - **hats:** cap, party hat, headphones, bucket hat, cowboy hat, crown, cat ears, nightcap;
  - **hoods:** panda, dinosaur, duck;
  - **costume:** Elvis;
  - **held:** mug (two-handed), water bottle, pizza slice, balloon;
  - **shoes:** trainers;
  - **badge medal:** a pin version on the chest, and a held-up version.
- **Reaction props,** held in the right hand: water glass, cup, food, and a check-in map pin.
- **Mode touches**, worn over any outfit and never replacing it:
  - Day out: camera on a neck strap;
  - Walk: backpack straps with a chest strap;
  - Festival: wristband plus glitter on the cheekbones (keep the glitter clear of glasses frames).
- **Map walker:** the character, plus how hoods, crown and party hat look at 16 × 22.

### Priority 2: the new wardrobe from board 3

- **Accessories:** beanie, scarf, flower crown, bunny ears, plain hood, backpack (worn, not the walk straps), round glasses as an item variant if you want it.
- **Costumes:** Astronaut, Wizard, Superhero, Pirate, Chef, Explorer, and Pyjamas (an onesie, as on the board), alongside Elvis, Duck and Dinosaur.
- **Props (held):** coffee cup, camera, map, book, umbrella, guitar, binoculars, torch, skateboard, fishing rod.

### Priority 3: effects and group poses

- **Effects** (a layer around the avatar, like today's sparkles): sparkles, hearts, confetti, rainbow, fireworks, snow, bubbles, thought bubble, golden aura. No flames, please. They read as danger at this size.
- **Group poses for 2 to 6 avatars** (board 4). These are for a coming feature, Crew, where friends share their avatars for one adventure. The share card shows a group shot. Each person can wear a different look, so draw the poses as arrangements, not finished pictures:
  - where each avatar stands (offsets and overlap order);
  - which arm or body pose each one uses;
  - any extra arm sprites that link people (arm round a shoulder, a high-five pair).

  The poses, by group size:

  | Size | Poses |
  |---|---|
  | 2 | side by side, high five, back to back, sitting together, cheering, sharing a moment |
  | 3 | lined up, group selfie, hug, on an adventure, celebrating |
  | 4 | team photo, stacked, outdoor hang, celebration, cosy and close |
  | 5 | standing chill, arms around, victory group, adventure crew, festival vibes |
  | 6 | group hug, line up, jump shot, adventure, night out |

  They need to fit the share card: 1080 wide, avatars at about 6 to 8 per pixel.

## 4. Not in this round

- The laptop prop and the study and laptop poses.
- Pets.
- Backgrounds.
- Groups bigger than 6.
- Which badge unlocks which item: the app decides, and nothing will unlock from a drinking badge.

## 5. Please send

- **`pixel-maps.txt`:** every layer, in the round 2 notation extended with the four tones, with its key, layer and anchor points.
- **`png/`:** every layer at 1× in default colours, transparent.
- **`contact-sheet.png`:** everything at 4× on black, and once on #EEF2F8.
- **`avatar-draw.js`:** drawing code that is the source of truth for shapes and layer order, as in round 2.
- **A README:**
  - the tone rules;
  - the layer order;
  - the anchors;
  - layer rules, such as what hides hair or covers the eyes;
  - the group pose layouts.
- **Delivery order:** priority 1 first if that's quicker. The app can switch to Style B once priority 1 is in.
- **Clean files:** strip the C2PA metadata from SVGs and PNGs before sending, as last round.
