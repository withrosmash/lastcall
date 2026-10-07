# Leit roadmap

What's left before launch, in rough order. Each item becomes its own spec and plan when we start it. Updated 2026-10-07.

## Now
- **Phone testing:** the owner is working through the checklist on build 387ae9b (docs/testers/phone-checklist.md). Nearby places confirmed on the phone, 2026-10-07.
- **QA and red team review:** proposed 2026-10-07 (name, brand, function, code, security, privacy, store policy).

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
