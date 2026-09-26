# Design sources, in order of precedence

1. **`HANDOFF.md`** and **`../css/tokens/*.css`** — the current source of truth, from the Claude Design system package. Token files are copied in verbatim so a future design update is a file swap, not a merge.
2. **`screenshots/`** — the 13 screens and 3 share-card layouts as rendered by the design prototype. Use these to check the build against intent.
3. **`round2/`** — Claude Design's round 2 handoff (bloom, light mode, avatar art and items, moments, share card, extras). Start at `round2/README.md`; decisions in `round2/NOTES.md`. `round2/designs/avatar-draw.js` is the art source of truth; use `round2/designs/share-card.js` (the newer copy, with the light card).
4. **`BRIEF-ROUND-2.md`** — the second brief (September 2026): stronger forest bloom, light mode with a cobalt bloom, the avatar art pass and unlockable items. Overrides the original brief's "no light mode" rule.
5. **`AVATAR-MOTION.md`** — the avatar's grid, expressions, movements and rules.
6. **`BRIEF.md`** and **`handoff.html`** — the original brief and first-pass handoff written before the design system existed. Kept as history. Superseded; do not build from these.

## Where the build knowingly differs

- **Fake Android chrome is not implemented.** The prototype draws a status bar (1:42, signal, wifi, battery) and a gesture pill. Those are drawn by the OS on a real device; the build uses safe-area insets instead.
- **Icons are inlined, not loaded from the Lucide CDN.** The app boots offline from a service worker, so a remote icon fetch would be the one thing on screen that fails. Same glyphs, same 24px grid and 1.5px stroke — see `js/icons.js`.
- **No `backdrop-filter` on the bottom sheet.** The panel fill `#0D0D0D` is opaque, so `--blur-sheet` has nothing to act on, and it forced a compositing layer that let the screen beneath bleed through. Consistent with the system's own rule: blur only where something is genuinely behind it.
- **Map tiles are Esri Dark Gray Canvas, not offline tiles.** The brief asks for bundled offline tiles and no cross-origin imagery; that needs packaged map data and is still open. Standard OSM raster was tried first and rejected — it is light, fights the true-black ground, and left the stats strip unreadable. CARTO `dark_all` was used until September 2026, when it began stamping "API KEY REQUIRED" over keyless tiles. Esri's canvas is keyless and CORS-enabled (so the share card can draw it), but greyer than CARTO and has no data past zoom 16. Share cards with a map carry a small Esri/OpenStreetMap credit in the top corner.
- **There is a settings screen.** The system fixes the hydration threshold at 5 with no way to change it; the client asked for it to be configurable, so `Settings → Reminders` offers 3/4/5/6/8 or Never, built from the existing Chip component and reached from History.
- **The amber WarningBanner has a second use.** The system reserves amber for hydration alone. It is also used when Android's battery optimisation is on, because Samsung's Device Care will stop the foreground service and silently end a night mid-record — a consequence at least as serious as being behind on water, and exactly the shape the component exists for. It still only appears when something is genuinely wrong, never at rest.
