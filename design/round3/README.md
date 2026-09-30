# Leit · round 3 delivery

## wordmark/
Direction 2b, Norr: four spaced capitals with a fine square stroke, drawn as outlined fills.

- leit-wordmark-dark.svg: #FFFFFF, for dark grounds
- leit-wordmark-light.svg: #0A2419, for light grounds
- leit-wordmark-mono.svg: #000000
- leit-wordmark-mono-currentcolor.svg: for the app to tint

Cap height 52, stroke 4.5. Clear space is one cap height all round. Minimum size is an 8px cap height. On the share card foot it's mint #7EE0C0 on dark.

## badges/
Eighteen badges, dark and light (`name.svg`, `name-light.svg`), on the round 2 template. See badges/README.md for accents, glyphs and template values. The light accents are provisional.

First Night is renamed First Adventure. The name changes and the art stays.

## Before shipping
Every SVG carries a C2PA `<metadata>` block and an `xmlns:c2pa` attribute added on export. Strip both, for example with `npx svgo -r -f .`, which removes metadata by default.
