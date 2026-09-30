# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A Capacitor app: the interface is one HTML/CSS/JS web app with its own design language (not Material), shipped as an Android APK today and iOS later. Native pieces are a custom plugin (tracking notification, quick log from the shade, steps, saving to the gallery, system bar colours).

## Users

People in the UK who go out with friends, and sometimes on their own, and want to remember and share the adventure afterwards. Today that's a group of testers who sideload builds. There is no age gate (the owner's decision, 2026-09-30); the store age rating is settled at launch.

## Product Purpose

Leit records any adventure automatically: a night out, a day out, a walk or a festival day. It keeps the route, stops and steps, alongside a pixel companion that reacts to what you do, challenges to try, badges to earn, and a card to share the next day. Success is people using it again on their second, third and tenth outing, and sharing the cards.

## Positioning

A companion, a game and a record in one, private on the phone. It is not a drinking app, not a fitness app and has no social feed. Other apps record routes (Strava, Relive), log check-ins (Swarm) or put a character on your walks (Pikmin Bloom). None of them combine the automatic record of any outing with a character, challenges and a share card.

## Operating Context

It's used one-handed, on the move: at 2am in a bar, in daylight on a walk, in a muddy field at a festival. One tap starts an adventure and tracking runs in the background with the phone locked. Drinks and water can be logged from the notification shade. The next morning brings the recap, the share card and the rewindable map.

## Capabilities and Constraints

- Everything stays on the phone; there are no accounts yet (planned later, for restoring data on a new phone).
- Modes (Night out, Day out, Walk, Festival) are described once in `js/modes.js`; an adventure can switch modes partway through.
- The word for an adventure comes from `js/words.js` ("adventure").
- Reliable tracking beats everything: nothing may risk the background tracking.
- Never framed around drinking. Nothing unlocks from drink badges. The avatar is never shown drunk.
- Copy: no long dashes, sentence-case labels, "challenge" (never "dare").

## Brand Commitments

- Name: Leit, pronounced like "late".
- Wordmark: "Norr" by Claude Design (`design/round3/wordmark/`).
- Claude Design's round 2 system (tokens, avatar, badges, screens) is the design authority. `design/README.md` records every place the build knowingly differs.
- Voice: warm, playful and dry. Short sentences.

## Evidence on Hand

No real user numbers, reviews or testimonials yet. None may be invented.

## Product Principles

1. Tracking reliability first.
2. Fun, not guilt: no nagging, no shaming, no drinking scoreboard.
3. Private by default: the record belongs to the person who made it.
4. One thumb, two seconds: logging anything is a single tap.
5. The companion makes it yours: the avatar is the emotional centre.

## Accessibility & Inclusion

Readable at night in a dark room and in bright daylight, with dark and light themes. Usable one-handed with large tap targets. Screen reader labels on controls.
