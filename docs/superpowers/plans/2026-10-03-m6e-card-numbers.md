# M6e: Card numbers and phone notes, round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner's second round of phone notes (2026-10-03), all approved:
- a darker icon;
- the badges icon on the start screen;
- the doze-off only late or after a long adventure;
- pace as big as the time on the photo card;
- a 4:5 map zoomed in;
- white drinks numbers;
- every card number its own element, stacking from the bottom;
- Calmer avatar fully still.

**Architecture:**
- Card numbers come from one pure table and two pure layout functions in `js/card.js`: `numberRows()` for the route card and `photoStack()` for the photo card. Both are tested in node.
- Photo-card elements gain a `placed` flag. Until it's set, an element sits where `photoStack` puts it.
- The rest are small, separate edits.

**Spec:** the owner's notes and answers in conversation, 2026-10-03:
1. Icon: the darkest of the three greens, #114530.
3. Doze: only when the adventure ended between 1am and 6am, or lasted over 5 hours; otherwise a happy finish.
4. Photo card: Pace at the same size as the time, side by side.
5. 4:5 route card: the route framed down to the badges (trial already approved).
6. The drinks number is white on every card.
7. One switch per number: Distance, Steps, Pace, Time out, Stops, Drinks, Water, Food (only measured ones offered).
   - **Route card:** numbers stack up from the bottom. Time out and Pace are on the bottom row; Stops, Drinks, Water and Food are four to a row above them; Distance and Steps are above those. Empty rows disappear, and badges and stop names slide down.
   - **Photo card:** each number is its own draggable, resizable piece, stacked the same way until moved. A moved piece stays where it's put, and Tidy puts everything back.
8. Calmer avatar: no idle moves, no breathing bob, still effects; reactions still play.

## Global Constraints
- Copy rules:
  - sentence case;
  - no long dashes;
  - "challenge", never "dare".
- Tracking code is not touched.
- Bump CACHE once, to `lastcall-v37`. No new js files unless they're added to SHELL.
- The stop-names list (today's "Stops" switch) becomes "Stop names" (key `places`), so "Stops" can be the number.

## Review Focus
1. **Route card:** every combination of numbers on and off leaves no gap. The map still ends above stop names, and 9:16 still frames as before. (tests plus browser)
2. **Photo card:** a moved piece stays put when others are switched off. Tidy restores the stack, and 9:16 keeps pieces near their edge. (browser)
3. **Unmeasured numbers:** never offered and never drawn (no distance without a route, no steps without a counter, no pace off a walk). (test)
4. **Save for video:** one layer per number, each lined up with the card. (browser)
5. **Recap:** a short daytime adventure never dozes, and one that ended at 2am does. (test)

---

### Task 1: Small changes (1, 2, 3, 6, 8)
- Icon: set `FOREST` to #114530 in `scripts/icons.mjs`, regenerate, and update the icon test's corner colour.
- Start screen: a badges icon button beside the gear.
- `S.dozesOff(s)` in state.js. The recap plays `end` with the Sleepy mood only when it's true; otherwise it plays a new `finish` reaction (arms up, stars, then a content smile) with the Fresh mood.
  - Tests: ended at 02:00 dozes; a 1-hour afternoon walk doesn't; a 6-hour day does.
- Calm: export `idlePool(mood, calm)` and return `[]` when calm. createAvatar skips idle moves and breathing when calm.
  - Test: `idlePool` is empty when calm and non-empty otherwise.
- Drinks values white on the route card and the photo card.

### Task 2: Numbers as elements (4, 5, 7)
- `NUMBERS`: the table of key, label, value(ui) and the group A/B/C. `offered(session, sum)` gives the measured keys.
- `numberRows(keys)` returns rows from top to bottom of `{ key, col }`, with col in quarter-widths. Wide numbers take 2 columns (A and C groups) and narrow ones 1 (B). Groups pack in order A, B, C. Tests:
  - all on;
  - B off;
  - C off;
  - only pace;
  - an empty list gives `[]`.
- Route card:
  - x = M + col × 150, with row height 130;
  - the bottom row's top is h − M − 240 with the date on, h − M − 190 without;
  - the stack (badges, stop names) sits directly above the top row;
  - the 4:5 map frame goes down to the stack.
- `photoStack(keys, h)` returns `{ key: {x, y} }` from the bottom up: the date, then rows of narrow and A numbers three to a row (190 apart, 110 high), then Time out and Pace at size 96 (Pace 420 to the right, 148 high). Tests: positions climb with each row, and switching a row off moves the rows above it down.
- Photo card:
  - one element per number;
  - drag, resize and pinch set `placed`;
  - unplaced elements take `photoStack` positions every draw;
  - a Tidy chip clears `placed` and scale on the stacked elements.
- Video layers: one per number.
- Bump CACHE to v37.

### Task 3: Check and ship
- Browser checks for Review Focus 1, 2 and 4, on 4:5 and 9:16, dark and light.
- Add checklist steps for this round to the artifact and the repo file.
- Fresh final reviewer, fix pass, merge, push, CI, memory.
