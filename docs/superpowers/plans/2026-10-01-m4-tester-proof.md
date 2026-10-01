# M4: Proof from testers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Testers can screenshot one screen of their numbers and send it over, and the user has a short list of questions to ask them.

**Architecture:** `js/stats.js` is a pure `testerStats(state, now)`. The screen `numbersScreen` (in history.js) draws it from a Settings row "Your numbers". Card saves and shares are counted in `flags.cardsShared` from the existing `lc:card-exported` event, with `flags.cardsSince` set the first time it counts. `weekStart` moves into `state.js` so badges and stats share it.

**Spec:** the roadmap's M4 ("a simple on-phone count testers can screenshot and send you: outings recorded, repeat outings, cards shared, which modes they used"), agreed 2026-09-30.

## Global Constraints

- Nothing leaves the phone. The screen says so.
- No long dashes. Sentence case. "Adventure" comes through `t()`.
- New `js/stats.js` goes in SHELL, and CACHE bumps to `lastcall-v31`.
- **Counts:**
  - adventures (ended);
  - in the last 30 days;
  - weeks with an adventure;
  - average length;
  - each mode (an adventure counts for every mode it used);
  - switched mode;
  - on your own;
  - challenges;
  - badges (of the total);
  - cards saved or shared;
  - festivals.
- **Cards from before this build:** testers who exported a card before counting began show `flags.cardExported` as at least 1.

## Review Focus

1. **A brand-new install** (no adventures) shows zeros and no "since" line, without dividing by zero. (test)
2. **Old adventures without parts** count as Night out. (test)
3. **The last-30-days boundary** and weeks across New Year. (test)
4. **An adventure still running** isn't counted. (test)
5. **The screen fits one phone screenshot at 375×812.** (browser)

---

### Task 1: stats.js and the card counter
- [ ] Tests (`tests/stats.test.mjs`) covering the Review Focus items 1 to 4, mode counts with a switched adventure, and the card count fallback.
- [ ] Implement `testerStats`. Move `weekStart` to state.js. In app.js, the `lc:card-exported` handler increments `cardsShared` and sets `cardsSince`.
- [ ] Commit.

### Task 2: Your numbers screen
- [ ] A Settings row "Your numbers"; screen route `numbers`; layout of tiles plus mode rows; a footnote with the "since" date.
- [ ] Browser check in dark and light at 375×812.
- [ ] Commit.

### Task 3: Questions for testers
- [ ] `docs/testers/questions.md`: a message ready to paste, after a Humanizer pass.
- [ ] Commit.

### Task 4: Check and ship
- [ ] Word sweep, fresh reviewer, merge, push, CI, memory.
