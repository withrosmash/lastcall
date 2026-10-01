# Small fixes saved for M6

Collected from the final reviews of M1 to M5 (2026-09-30 to 2026-10-01). Each one is small. Language items go through the Humanizer pass.

## Wording
1. "Session" still appears in three badge descriptions (Marathon, Early Doors, Sunrise Service) and on the end sheet ("You can't reopen a session").
2. The web manifest and package.json descriptions hard-code "adventure".
3. Snack on a walk shows "Food logged", and the timeline says "Food".
4. A finished short walk's recap says "Pace: Not yet", which reads as still waiting.
5. A festival review with one day left reads "1 days".
6. The festival screen's "Sets" tile counts different acts while each day counts sets, so the tile should say "Acts".
7. The switch sheet copy on modes without different buttons.
8. Explorer, Brunch Club and other badge criteria: a final read-through.
9. The start screen says "Kept on this phone, nowhere else.", which needs checking against what the map and venue lookup send (and against the privacy policy at the Google Play step).
10. A company-only switch toasts "Now a night out."

## Behaviour
11. Pace can flash an absurd value in the first minutes (there's no minimum time).
12. Live pace only refreshes on a re-render, not on the clock tick.
13. Weekly Walker files a switched adventure under the adventure's start week, not the walk part's.
14. The late morning-after rule misses a festival day that starts after midnight.
15. Back after "Delete festival" re-renders History once.
16. The festival days list follows tap order, and the default name depends on the order sessions are stored in.
17. The festival Steps tile shows 0 without a step sensor.
18. The festival map still shows Stops and Drop pin.
19. GPX export has no sets.
20. The act name field has no length limit.
21. Malformed imported festival entries can throw in badge evaluation.
22. Make a festival loses its picks on a background re-render.
23. Empty History has no Settings button, so there's no way to reach Your numbers.
24. A Day Into Night badge can be earned by a quick mode correction.

## Look
25. Walk backpack straps come out dark brown, not orange, after the outline pass.
26. There's no festival wristband on the dress.
27. Clear space below the start screen wordmark is 10px, not 15px.
28. On the route card, the date line sits half a cap height from the wordmark.
29. Your numbers has little spare height before safe-area insets, so check it on a phone.
30. "Average" on Your numbers shows "0m" against the usual "0h 00m" style. The Festival mode count sits beside the Festivals reviews tile.

## Code tidy
31. `modeOf` is exported and tested but unused.
32. `C.forest` in card.js is unused.
33. `body` is shadowed inside the day touch block in avatar.js.
34. The wordmark RECTS test only checks the bounding box.
35. An onboarding step keeps an unused eyebrow.
36. Tests to add: `dressedFor`, Explorer's `sessionId`, night-part stops not counting for Explorer, and `pick()` on old sessions.
