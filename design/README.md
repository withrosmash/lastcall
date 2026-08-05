# Design sources, in order of precedence

1. **`HANDOFF.md`** and **`../css/tokens/*.css`** — the current source of truth, from the Claude Design system package. Token files are copied in verbatim so a future design update is a file swap, not a merge.
2. **`screenshots/`** — the 13 screens and 3 share-card layouts as rendered by the design prototype. Use these to check the build against intent.
3. **`BRIEF.md`** and **`handoff.html`** — the original brief and first-pass handoff written before the design system existed. Kept as history. Superseded; do not build from these.

## Where the build knowingly differs

- **Fake Android chrome is not implemented.** The prototype draws a status bar (1:42, signal, wifi, battery) and a gesture pill. Those are drawn by the OS on a real device; the build uses safe-area insets instead.
- **Icons are inlined, not loaded from the Lucide CDN.** The app boots offline from a service worker, so a remote icon fetch would be the one thing on screen that fails. Same glyphs, same 24px grid and 1.5px stroke — see `js/icons.js`.
- **No `backdrop-filter` on the bottom sheet.** The panel fill `#0D0D0D` is opaque, so `--blur-sheet` has nothing to act on, and it forced a compositing layer that let the screen beneath bleed through. Consistent with the system's own rule: blur only where something is genuinely behind it.
- **Map tiles are CARTO `dark_all`, not offline tiles.** The brief asks for bundled offline tiles and no cross-origin imagery; that needs packaged map data and is still open. Standard OSM raster was tried first and rejected — it is light, fights the true-black ground, and left the stats strip unreadable.
- **No separate settings screen.** The hydration threshold is fixed at the system's value of 5. Export and import both live on History.
