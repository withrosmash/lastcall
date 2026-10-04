# M6f: Phone notes, round 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner's round 4 notes (2026-10-04):
- Hold becomes Held.
- The icon gets a smaller wordmark.
- Festival cards get an Acts seen number.
- A "Show my avatar" switch.
- A gap after wide numbers.
- Aspirational becomes Lifetime.
- Drinks are white everywhere.

The venue search is waiting on the owner's choice of a places service; it isn't part of this plan.

**Spec:** the owner's notes and answers, 2026-10-04:
- **Icon:** the second option, the wordmark at 44% of the icon instead of 56%.
- **Avatar switch:**
  - In Settings, on by default.
  - When off, there's no avatar on the start, live or recap screens.
  - Cards start with the avatar set to None.
  - Unlocks still happen quietly; no unlock sheet.

## Global Constraints
- Copy rules: sentence case, no long dashes, "challenge" never "dare".
- Tracking isn't touched.
- Bump CACHE once, to `lastcall-v38`.

## Review Focus
1. **Avatar off:** every screen that showed it still lays out well without it (start, walkthrough excluded, live, recap, morning after). Nothing throws when the avatar is missing. (browser)
2. **Acts seen:** offered only when sets were logged. It counts distinct acts, matching the festival screen's Acts. (test)
3. **Number gap:** on both cards, a wide number never sits within 40 card px of the next one. (test)
4. **Drinks white:** no pink drink number left on any screen. Pink stays on the stop dots. (grep plus browser)

---

### Task 1: Small changes
- Customise: the Hold tab and the items-data group become Held.
- `scripts/icons.mjs`: the wordmark width goes from 0.56 to 0.44 everywhere it's 0.56 (adaptive foreground, round, monochrome, splash), the full-bleed icons drop from 0.6 to 0.48, and the maskable icon drops from 0.5 to 0.4. Update the icon test's span band to 0.4–0.52.
- Badges data: category "Aspirational" becomes "Lifetime", and anything that lists categories follows.
- Drinks white: remove `.tile__v--drinks`'s pink, and make the start screen's "1 drink" plain.

### Task 2: Cards
- `NUMBERS` gains `{ key: 'acts', label: 'Acts seen', group: 'B' }`, offered when the adventure has sets. The value is the count of distinct acts (`S.festivalActs`).
- Route card: a cell's x is `max(M + col × 150, previous cell's right edge + 48)`, using measured text. Photo card: a stacked row's pitch is at least the previous piece's width plus 48, from the last measured bounds.
- Tests: acts offered and counted; a pure `rowXs(widths, cols)` gives x positions with the 48 gap.

### Task 3: Show my avatar
- `prefs.showAvatar` (default true), with a Settings switch under Accessibility: "Show my avatar".
- When off:
  - start, live, recap and morning screens render no avatar canvas, and their layouts close up;
  - the card's face defaults to `none`;
  - `openUnlocks` is skipped.

### Task 4: Ship
Checklist steps, fresh reviewer, fix pass, merge, push, CI, memory.
