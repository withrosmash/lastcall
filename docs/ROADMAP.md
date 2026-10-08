# Sprell roadmap

What's left before launch, in rough order. Each item becomes its own spec and plan when we start it. Updated 2026-10-07.

## Now
- **Phone testing:** build 9b339c5 is Sprell (new app ID app.sprell): testers export from Leit, install Sprell, import (checklist steps 78 to 81), then run the rest (docs/testers/phone-checklist.md). Nearby places confirmed on the phone, 2026-10-07.
- **QA and red team review:** done 2026-10-07. 48 checked findings in https://claude.ai/artifact/53LTSwVLvRC54MdDd6NxBg (4 critical: import wipes history, full storage deletes adventures silently, auto-close at 0 minutes, no privacy policy). Owner's picks: fix all but S2, S6, C4 (now in), B4 later; P8, C6 skipped. Rounds: R1 safety net (shipped 1eefadb), R2 storage for years (spec first), R3 Android and store, R4 privacy and cards plus the privacy policy draft (owner gathering entity, email, address, ICO), R5 accuracy and badges (with mock-ups), R6 code health. Name: **Sprell** chosen 2026-10-07 (Norwegian, lively antics), wordmark direction Comfortaa-style rounded lower case; Claude Design brief design/BRIEF-ROUND-5.md. Before the rename: owner buys sprell.app (plus getsprell.app / getsprell.com) and gets a UK trademark check (classes 9, 41, 42); decide the app ID (suggested app.sprell); then a rename round (strings, wordmark, icons, store graphics, venue URL). **Rename shipped 2026-10-08 as 9b339c5.** Still to do: move the venue squares and web preview to sprell.app; optionally rename the GitHub repo; file the UK trademark. Tagline decided 2026-10-08: "Track the adventure. Relive it later." (replaces "Piece it together later", red team B4); owner bought sprell.app.

- **Company:** Sprell Limited, company number 17509243, incorporated 2026-10-08 (registered office in London E14). In the legal drafts; goes in the website footer and contact page. Next: D-U-N-S number for a Play organisation account.
- **Legal drafts:** privacy policy https://claude.ai/code/artifact/1b0d9927-2599-4e1c-8c6e-a4678d4434e0 and terms of use https://claude.ai/code/artifact/2d59a2f5-d2e6-49cc-ae57-804c4a570773, for the owner's lawyer.

## Waiting on the domain
- **Website:** built ourselves on Cloudflare Pages, not Wix or Squarespace. It needs a landing page, the privacy policy, the sign-up page and Crew invite pages, plus `/.well-known/` files for app links.
- **Own map:** Protomaps extract at the lighter detail (1.5 GB UK) on Cloudflare R2. See docs/research/2026-10-06-own-map-spike.md.
- **Venue squares move:** change `VENUES_BASE` in js/venues.js to the domain.
- **Crew:** see docs/superpowers/specs/2026-10-01-crew-design.md.

## Added by the owner, 2026-10-07
- **Data storage:**
  - what lives on the phone and what lives in the cloud;
  - backups and restore on a new phone;
  - deletion;
  - the UK GDPR basis for each.
  - Earlier advice: keep adventures (drink logs may count as health data) on the phone; accounts hold badges, settings and lifetime totals. The proposal was Supabase in its London region.
- **Sign-up page:**
  - first name, username, email, password;
  - an 18+ date-of-birth gate;
  - an unticked box for update emails;
  - Apple's rule that a login must do something real for the user.
- **Privacy policy:**
  - plain English, at a stable web address, required for Google Play;
  - it must match what the app really does: map tiles and venue lookups go online, and adventures stay on the phone.
- **Monitoring dashboard:**
  - account counts and usage, which needs consent even when anonymous;
  - app crashes;
  - the health of the weekly venue build and the map refresh.

## Then
- **Google Play:**
  - decide the app ID;
  - release AAB and upload key (the owner keeps the secret);
  - the data safety form;
  - the background location declaration and video;
  - a closed test with 12 testers for 14 days.
- **Accounts (M7), iOS (M8), store launch (M9).**

## Known deferred items
docs/audit/deferred-minors.md and the "Deferred minors" lines in the project status memory.
