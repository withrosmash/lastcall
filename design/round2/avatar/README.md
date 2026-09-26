# Last Call avatar hand-back (round 2)

## What's here
- `pixel-maps.txt`: every layer as a text pixel map, with its key and draw layer.
- `png/`: every layer as a PNG at 1× (32 x 43, or 12 x 16 for the map sprite), transparent, drawn in the default colours.
- `contact-sheet.png`: every layer at 4× on black, for a quick look.
- `avatar-draw.js`: the drawing code for everything in the designs. It is the source of truth for shapes, colours and layer order, and the maps are generated from it.
- `share-card.js`: the share card with the avatar, the two layouts in two sizes, and the Save for video export.

## Colour slots
| Slot | Letter | Default | Notes |
|---|---|---|---|
| Skin | S | #E8B48F | Also hands, neck, mouth (x0.48) and eyelids (x0.74) |
| Hair and brows | H | #3B2A20 | Brows use x0.82. Cat ears use this slot |
| Eyes | E | #4A7A5C | Dark top of the eye is the eye colour mixed 72% toward #120E16 |
| Cheeks | C | #F08A8A | |
| Top | T | #21764F | Cap, pyjamas and sleep cap use this slot. The pyjama bottoms follow it too |
| Bottoms | B | #2D3A4F | Bucket hat uses this slot |
| Shoes | F | #EDEDED | |

Derived tones: outline x0.58 on any edge against empty space or a lower layer, shade x0.86 on skin under hair or a hat, highlight mixed 32% toward white. When a part's colour is near black (luminance under 0.12), its outline mixes 32% toward #969696 instead, so it still reads on the black ground.

## Draw order (low to high)
hair back → shoes → bottoms → neck → top → arms → head → face → hair front → glasses → hat, hood or ears → held item, badge, sparkles

## Layer rules
- **Brims** (cap, bucket hat, cowboy hat, sleep cap) remove hair above the brim row. Hair below it still shows.
- **Hoods** (duck, dinosaur, panda) replace all hair layers.
- **Costumes** (Elvis) swap hair, glasses, top and bottoms for fixed colours.
- **Sunglasses** hide the eyes. For hearts, stars, surprised and puppy, they move 8 rows up onto the head.
- **Poses**: arms up and wave redraw the arms beside the head. The mug holds both hands in front.
- **Map sprite**: 12 x 16, four walk frames, mirrored for walking left. Hoods, crown and party hat show at this size, and other hats don't.

## Items and unlocks
See `NOTES.md` in the project for the badge list. Nothing unlocks from a drinking badge.
