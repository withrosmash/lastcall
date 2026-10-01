# M6a: Audit fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 21 findings from `docs/audit/2026-10-01-impeccable-audit.md`, with the owner's decisions of 2026-10-01.

**Spec:** the audit's "Proposed fixes for the owner", plus these decisions:
- **Screen-reader fixes:** no mode needed, but an Accessibility section in Settings with Bigger text and Calmer avatar.
- **Check in with location off:** name the stop anyway.
- **Settings and badges:** a gear and a badges icon in the top corner of the start and live screens.
- **Text size:** follow the phone's setting, with no pinch zoom.
- **Zeros:** a stat the phone couldn't measure is hidden rather than shown as 0, including as a card option.

## Global Constraints

- Round 2 tokens stay the authority. Contrast fixes use the system's own `--faint` / `--muted-up` / `--text` roles before adding new values.
- Copy rules: no long dashes, sentence case, "challenge" never "dare", "adventure" via `t()`.
- Tracking code is not touched.
- Bump CACHE once to `lastcall-v33`, and add any new js file to SHELL.

## Review Focus

1. **Contrast is measured, not assumed:** each fixed text style at 4.5:1 or more on its real background, in both themes, including over the gold, teal and violet glows. (browser)
2. **TalkBack:** no live region on `<main>`; sheets labelled, focused, with the screen behind inert; focus restored on close. (browser plus code)
3. **Hidden stats:** location off or no step counter shows no zero tiles and no zero card options, and the card has no empty half. (browser)
4. **Name the stop anyway** with location off still counts as a stop for badges, and the map ignores stops without a position. (test plus browser)
5. **Text zoom:** follows the phone's font scale (native), and Bigger text multiplies it. No layout breaks at 130%. (browser at 130%)

---

### Task 1: Contrast and small targets (#1, #2, #5, #11 tiny text, #13, #14, #18, #21)
### Task 2: Screen reader (#3, #4, #9, #10, #15, #19)
### Task 3: Hide what wasn't measured (#6, #16)
### Task 4: Check in without location (#7)
### Task 5: Settings, badges and empty History (#12), plus the Accessibility section (Bigger text, Calmer avatar)
### Task 6: Text follows the phone (#11), and the map library loads only when needed (#20)
### Task 7: "Session" leftovers (#17)
### Task 8: Check and ship (re-audit contrast, sweep, fresh reviewer, merge, push)
