# M3 step 5: Mode glows and mode touches — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each mode has its own glow (chosen by the user) on the live screen, the recap, the festival screen and the share card. The avatar wears one small touch per mode. Unknown mode keys never crash.

**Architecture:**
- **Glow:** `js/glow.js` builds the glow gradient from colours, and each `MODES[k].glow` holds that mode's colours. `app.render` sets `--bloom-hero` and `--bloom-foot` on `#bloom` for screens that name a glow mode. `card.js` takes its bloom stops from the same colours.
- **Touches:** a new `touch` layer in `avatar.js` (z 1.25: above the top, under the arms and held items), driven by `look.touch`. `S.modeOf(k)` falls back to Night out for unknown keys.

**Spec:** `docs/superpowers/specs/2026-09-30-m2-modes-design.md` (build order step 5), plus the user's picks on 2026-09-30.

## Global Constraints

The user's glow picks:

| Mode | Name | Dark (g1, g2, g3, g4) | Light |
|---|---|---|---|
| day | Sunlight gold | `[236,178,64] [176,120,28] [124,82,18] [52,34,8]` | `[190,120,0]` |
| walk | Teal | `[72,196,196] [30,132,138] [18,88,94] [6,36,38]` | `[0,120,128]` |
| festival | Violet | `[168,112,240] [112,62,190] [74,38,126] [28,14,50]` | `[110,50,200]` |

- Night out keeps `NIGHT_GLOW` (identical to today's tokens).
- **Screens with a mode glow:**
  - live: the current part;
  - recap: the last part;
  - festival screen: festival.
  - Every other screen keeps the brand glow.
- **Touches:**
  - day: a camera on a neck strap;
  - walk: backpack straps and a sternum strap;
  - festival: a wristband on the left wrist (only when that arm is down) and glitter on the cheeks;
  - night: none.
  - `prefs.modeTouches` (default `true`); a Customise switch "Dress for the mode".
- **Where touches show:** the live avatar (current part), the recap avatar (last part) and the card avatar (last part).
- New `js/glow.js` goes in SHELL, and CACHE bumps to `lastcall-v30`.

## Review Focus

1. **Night out's glow is pixel-identical** to today's, in both themes. (test)
2. **Switching mode mid-adventure** changes the glow and the touch on the next render. (browser)
3. **Touch off** in Customise removes every touch from the live, recap and card avatars. (browser)
4. **An unknown mode key** in a part renders as Night out on the live, recap, card, history, badges and picker screens with no error. (test on `modeOf`, plus browser)
5. **Light theme** uses each mode's light colour, never the dark ramp. (test)

---

### Task 1: Glows

- [ ] Tests:
  - `bloomCss(NIGHT_GLOW)` equals the round 2 dark and light token strings, normalised;
  - every mode has a `glow` with 4 dark tones and 1 light tone;
  - `cardBloom(glow, theme)` returns 3 stops.
- [ ] Implement: `MODES[].glow`; `render` applies the glow for the screen's glow mode (`SCREENS[x].glow(ctx) → mode`); `card.js` route card and photo bloom use `cardBloom`/`photoBloom` from `glow.js` with the session's last part.
- [ ] Browser check: live on each mode, in dark and light. Commit `M3: each mode has its own glow`.

### Task 2: Mode touches

- [ ] Implement the `touch` drawing in `build()` and the `modeTouches` pref. Apply it in `liveAvatar`, the recap and the card look, and add the Customise switch.
- [ ] Browser: a still of each touch at 8× in several poses (idle, wave, sip, badge). Toggle off. Commit `M3: the avatar dresses for the mode`.

### Task 3: Unknown modes never crash

- [ ] Test `S.modeOf('moon-base') === MODES.night` and `partsOf` normalising unknown modes for reading. Swap the unguarded `MODES[...]` lookups for `modeOf`. Commit.

### Task 4: Check and ship

- [ ] Word sweep, fresh reviewer, fix pass, merge, push, CI, README, memory. Delete `design/glows.html` (the picks now live in `modes.js`).
