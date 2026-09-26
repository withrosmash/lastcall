# Last Call round 2: open notes

## Customise screen: done
Files: `Customise Board.dc.html`, `Customise Screen.dc.html`, `avatar-draw.js` (stand-in art, replaced by the art pass).

## Light mode: done
Frosted glass (4a) and a soft shadow under the primary button (4c). Both are already in `tokens/colors-light.css`.
Component changes still to make: the primary Button reads `--mint-fill`, and StatTile, Field and the map strip drop their uppercase transform.

## Avatar reference: done
`Avatar Reference.dc.html`: every head item on every hair style (5a), and all 14 expressions at phone and watch size (5b). Sunglasses push up onto the head for big reactions.

## Unlock and morning after: done
`Moments.dc.html`. The unlock animation plays once, then you page through all the new badges. The morning after has pyjamas, a sleep cap, a mug and messy hair.

## Share card and route: done
`Share and Route.dc.html`, `share-card.js`.
- Route and Your photo layouts, each in feed 4:5 and story 9:16. Optional title of up to 24 characters.
- Route card: Esri dark map. Stats rows are Distance and Steps, then Stops, Drinks, Water and Food, then Time out.
- Your photo: every element can be added and moved (title, time out, stats, water, food, date, route, avatar). Pinch to resize; the avatar resizes in whole-pixel steps. No flip.
- Save for video: one see-through PNG per element, full frame or cropped.
- Walking the route: a 12 x 16 map sprite with a four-frame walk, driven by the history slider.

## Developer hand-back: done
`handback/`: pixel maps as text with slot keys and layers, 1× PNGs for all 44 layers, a contact sheet, a README with the slot and layer rules, plus `avatar-draw.js` and `share-card.js`.

## Piece 4: in review
`Extras.dc.html`: Appearance settings with Dark and Light only (8a), light Route card (8b, `theme: 'light'` in share-card.js), first launch in four steps (8c), and three app icon directions and a notification icon (8d, A recommended), and the splash hand-off (8e). The system splash shows a default face, then the app's first frame swaps in the user's own avatar. First-launch copy works on both platforms.
Still to do: add Dark and Light card chips to the card builder.

## To do: badges and challenges for the extra items
Rule: nothing unlocks from a drinking badge.

New badges the item list depends on (not in the original badge set):
- **Long Haul**: walk 50 km, all time. Unlocks the cowboy hat.
- **Nine Lives**: nine nights out. Unlocks the cat ears.
- **Just Add Water**: 50 waters, all time. Unlocks the duck.
- **Left the Building**: five stops in one night. Unlocks Elvis.
- **Snack Break**: log food three times in one night. Unlocks the panda.
- **Big Stomp**: 20,000 steps in one night. Unlocks the dinosaur.
- **Late Bite**: log food after midnight. Unlocks the pizza slice.
- **Anniversary**: one year since your first night out. Unlocks the balloon.

From the brief (already proposed): First Dare (sunglasses), Game On (party hat), No Notes (headphones), Ringleader (bucket hat), Chaos Agent (crown, hidden), 10K (trainers), Hydro Homie (water bottle), Early Doors (cap).

## To do: items available from download
Some items are free from install, alongside hair, glasses frames and tops. Decide which. Candidates: cat ears, one held item, one hat.

## Removed
- Lava lamp.
