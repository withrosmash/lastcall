# M2: Modes, design spec

Agreed with the user in chat on 2026-09-30, one decision at a time. This is the authority the M3 build plan argues from.

## Intent

Leit is for any adventure, not only nights out. When you start, you pick a **mode**: Night out, Day out, Walk or Festival. The mode decides what the live screen offers, which challenges and badges apply, how the avatar is dressed and what colour the glow is. Night out stays the main mode, and today's app is exactly Night out.

**Success:** a tester can start a Day out and it feels made for a day out, with the right buttons, challenges, badges, outfit and recap. They can switch to Night out when the evening turns into one. Claude Design gets a brief it can work from without coming back to us with questions.

**Unchanged constraints:** it's a socialising app, not a drinking app. Nothing unlocks from drinking badges. The avatar is never shown drunk. No long dashes in copy, and labels stay in sentence case. The word for an adventure stays "adventure" (`js/words.js`). The tracking engine is not touched.

## Decisions

| # | Decision | User's call |
|---|---|---|
| 1 | Every mode has a drink button; the drink list changes with the mode. Drink badges only count in Night out | yes |
| 2 | You can switch mode partway through. It stays one adventure, with one route and one recap | yes |
| 3 | Festival: one adventure per day. You can pick several days to build a **festival review** | user's wording |
| 4 | Badges: a shared core, plus a set for each mode | yes |
| 5 | Challenges: one tagged pool, plus challenges that work on your own. "Challenge" stays the word, never "dare" | yes |
| 6 | Avatar: one small mode touch over the user's own look, which can be turned off | yes |
| 7 | Colour: the glow changes per mode. Buttons and text keep today's colours | yes |
| 8 | Built from one description per mode (approach 1) | yes |
| 9 | Kept out: summit and elevation badges, in-app photos, festival line-ups and stage maps | yes |
| 10 | Claude Design draws the wordmark and the new badges. Claude builds the screens, glows, icons and mode touches in the app with Impeccable | yes |

## The modes

`js/modes.js` exports `MODES`, one entry per mode, and every screen reads from it. There are no `if (mode === 'walk')` checks anywhere else.

| | Night out | Day out | Walk | Festival |
|---|---|---|---|---|
| key | `night` | `day` | `walk` | `festival` |
| Buttons | Add drink, Hydrate, Food, Check in, Challenge, Map | same as Night out | Hydrate, Snack, Check in, Challenge, Map; Drink is under More | Add drink, Hydrate, Food, Challenge, Map, **Saw a set** |
| Drink list | Pint, Wine, Spirit + mixer, Shot, Cider, Cocktail, Low/no (today's) | Coffee, Tea, Soft drink, Juice, Pint, Wine, Low/no | Coffee, Tea, Soft drink, Pint, Low/no | Pint, Cider, Cocktail can, Spirit + mixer, Low/no |
| Headline stats | as today | as today | steps, distance, pace | as today, plus sets seen |
| Badge set | `night` | `day` | `walk` | `festival` |
| Mode touch | none | camera on a neck strap | backpack (straps over the shoulders) | wristband, plus glitter on the cheeks |
| Morning-after screen | yes | no | no | yes, when the day ends after midnight |
| Glow | forest (today's) | warm, sunlight | fresh, sky or teal | electric, violet |

- **Glows:** the exact colours are chosen by the user from options shown live in the app, for dark and light. They must not clash with mint (main actions), pink (drinks) or amber (warnings).
- **Recent drinks:** remembered per mode. Today's list becomes Night out's.
- **Custom drinks:** a custom drink typed in any mode is still accepted.

## Starting, switching, company

- **Start:** "Start adventure" opens a picker. It has four mode tiles, each with its glow and a line icon, and a **With friends / On my own** switch.
  - It remembers the last mode and the last company, so a regular's start is still one tap.
  - The Skip-location route stays.
- **Live screen:** a small mode label at the top opens a **Switch mode** sheet. It offers the other modes and the company switch.
  - A switch takes effect from that moment: buttons, challenge pool, outfit and glow all change.
- **Data:** a session gains `parts: [{ t, mode, company }]`. The first entry is written at start, and each switch appends another.
  - Everything logged belongs to the part whose time range contains it.
  - Old sessions have no `parts` and read as `[{ t: startedAt, mode: 'night', company: 'group' }]`.
  - `storage.migrate` adds nothing. The fallback lives in one helper, `partsOf(session)`.
- **Recap and card:** a single-mode adventure shows its mode ("Day out"). A switched one lists the parts in order ("Day out, then Night out"). The recap title still comes from `phrase('recapTitle')`.

## Festival

- **Saw a set** opens a sheet: type the act's name, or tap one you've already logged at this festival.
  - It saves `sets: [{ t, name, lat, lng }]` on the session, using the latest fix, or no location if there isn't one.
  - Sets appear in the timeline and on the map as their own pins, separate from check-ins.
- **One adventure per festival day.** You end it when you head back to camp. Tracking never runs overnight.
- **Festival review:** in History, choose "Make a festival", tick two or more Festival adventures, and name it (default "Festival, <first day's date>").
  - Stored as `state.festivals: [{ id, name, sessionIds, createdAt }]`.
  - Its recap shows the days, total steps and distance, every set seen, badges earned across those days, and a combined card.
  - Deleting a review never deletes its days. A deleted day simply drops out of any review that included it.

## Badges

**Shared core** (25, counted in any mode):
- **Firsts:** First Night (renamed **First Adventure**, name only), On the Board, Cover Star, Cartographer, First Dare.
- **Getting around:** Marathon Not a Sprint, Pin Cushion, Homing Pigeon, Scenic Route, Snack Break, Two-Step, 10K, Big Stomp, Just Add Water.
- **Challenges:** Game On, No Notes, Chaos Agent.
- **Coming back:** Regular, Month in the Books, Anniversary.
- **Milestones:** Fifty Stops, Century Club, The Archivist, Ringleader, Long Haul.

**Night out set** (13 existing badges): French Exit, One and Done, Mixologist, Brand Loyal, Hydro Homie, Balanced Books, Metronome, Dry Run, Good Habits, Early Doors, Sunrise Service, Late Bite, Ghost.
- They are checked against the **Night out part** of an adventure: its time range, and only what was logged inside it.
- Their item unlocks don't change. Badges already earned are kept.

**New sets** (18). Each is checked against the part in its own mode:

| Day out | Walk | Festival |
|---|---|---|
| **Day Into Night**: switch from Day out to Night out | **Early Riser**: a walk started before 8am | **Front Row**: 5 sets in one day |
| **Tourist**: 6+ stops in one day out | **Trailblazer**: 15 km in one walk | **Headliner**: a set logged after 10pm |
| **Explorer**: 3 stops never pinned before (by name) | **Tea Break**: coffee or tea on a walk | **Stage Hopper**: sets logged from 3 spots at least 200m apart |
| **Brunch Club**: food before 11am | **Head Space**: a walk on your own | **Hydration Station**: 5 waters in a festival day |
| **Caffeine Trail**: 3 coffees in one day out | **Weekly Walker**: a walk in 4 weeks running | **Discovery**: 10 different acts across one festival review |
| **Sunday Best**: a day out on a Sunday | **Out and About**: 10 walks all-time | **Full Weekend**: a festival review of 3+ days |

- **Head Space** trusts the On my own switch. The switch's main job is choosing challenges, so people have a reason to set it honestly.
- **No new badge unlocks an avatar item** this round.
- **Placeholder art:** until Claude Design's art arrives, new badges show a plain disc with the badge's initials, the same as a missing image does today.

## Challenges

- **Tags:** every challenge gains `modes: [...]` and `group: true|false`.
  - `group: false` means it works on your own; it still shows when you're with friends.
  - **Picking:** at random from challenges that fit the current mode and, when you're on your own, only `group: false`.
- **The existing 26:**
  - **Venue-bound** (Night out, Day out): swap seats, order for each other, heist, thank whoever is working here.
  - **Need strangers around** (not Walk): the stranger photo, swapping photos with another group.
  - **Work on your own:** the serious photo, and the best photo in sixty seconds.
  - **Everything else:** any mode, with a group.
- **17 new challenges** (the list agreed in chat). They get a Humanizer pass before they ship.

| Challenge | Modes | On your own |
|---|---|---|
| Find something older than your grandparents and take its photo. | day, walk | yes |
| Take a photo of a door you'd like to live behind. | day, walk | yes |
| Spot five different birds before your next stop. Made-up names count. | walk, day | yes |
| Find the best view you can reach in ten minutes and look at it for a full minute before taking a photo. | walk, day | yes |
| Take a path you'd normally walk past and follow it for five minutes. | walk, day | yes |
| Say hello to the next five people you pass. | walk | yes |
| Find a bench with a plaque and read it properly. | walk, day | yes |
| Keep a leaf, a stone or a ticket stub to remember today by. | walk, day, festival | yes |
| Take a photo that makes this place look like a film set. | day, walk, festival | yes |
| Go the next five minutes without looking at your phone once. | walk, day | yes |
| Give the next dog you see a full name, middle name included. | walk, day | yes |
| Learn the chorus of a song by an act you've never heard of before their set ends. | festival | yes |
| Swap a recommendation with a stranger and go and see their pick. | festival | yes |
| Find the best outfit on site and tell its owner exactly why. | festival | yes |
| Get your group into the background of someone else's photo without them noticing. | festival, day | no |
| Start a chant for an act your group only just discovered. | festival | no |
| Race your group to find the oldest date written or carved on anything nearby. | walk, day | no |
- **Saved text:** the text stored with a completed challenge is its filled text (M1 behaviour, unchanged).

## Avatar

- **Mode touches** are a new layer in `js/avatar.js`, drawn after the look's own items. They never replace hat, held, glasses or costume.
  - Each touch has to be drawn for every pose the engine uses.
  - The touch follows the current part's mode.
- **Turning it off:** a `prefs.modeTouches` setting (default on), with a switch in Customise. It also covers the share card avatar.

## Who makes what

| Piece | Who | How |
|---|---|---|
| Leit wordmark, pronounced "late" (start screen, card, hand-off frame, store lockup; dark and light) | Claude Design | round 3 brief |
| 18 new badges, dark and light, on the existing template | Claude Design | round 3 brief |
| Mode picker, Switch mode sheet, Saw a set sheet, set timeline entries, festival review screens | Claude with Impeccable | built in the app on round 2 tokens and components |
| Four glows, dark and light | Claude with Impeccable | options shown live; the user picks |
| Mode line icons | Claude | in `js/icons.js` style |
| Mode touches | Claude | pixel art in the avatar engine |

- **PRODUCT.md:** Impeccable's `init` writes a short one at the repo root before the first design pass.
- **Precedence:** Claude Design's round 2 system still wins over Impeccable's defaults, and `design/README.md` records any place the build knowingly differs.

## Build order (M3)

1. Modes description, parts, starting, switching and company; Night out and Day out.
2. Challenges tagging and the new challenges; badge scoping (core, Night out set, Day out set).
3. Walk (buttons, More, pace, badges).
4. Festival (Saw a set, sets on the map and timeline, badges, festival review).
5. Glows and mode touches, with the user picking the glows.

The tester build ships after step 2 if the user wants early feedback.

## Edge cases

- **An adventure that is still running when the update installs:** it has no `parts`, so it reads as Night out. The first switch appends a part as normal.
- **Switching back and forth:** every switch is kept. A mode-set badge checks all parts in its mode together.
- **Saw a set with no GPS:** the set is saved without a location. It doesn't count towards Stage Hopper.
- **A festival review that includes a day that was later deleted:** the day is skipped. A review with fewer than two days left still shows, and can be deleted.
- **Imported old backups:** they read through `partsOf`, exactly like old sessions.
- **Exports:** GPX and the JSON backup gain `parts` and `sets` as ordinary fields. Older builds ignore them.

## Testing

- **`node --test` (pure modules, no DOM):**
  - `partsOf` fallback and part lookup by time;
  - slicing a session to one mode's parts;
  - every new badge rule, plus the Night out set being ignored outside Night out;
  - challenge filtering by mode and company;
  - festival review totals.
- **Browser pane:**
  - each mode's live screen, picker and switch sheet;
  - a switched adventure's recap and card;
  - a festival review built from three days;
  - old data still reading as Night out;
  - both themes.
- **Real phone:** a Day out that switches to Night out, and a festival day.
