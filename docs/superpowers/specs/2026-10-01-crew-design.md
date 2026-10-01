# Crew: sharing avatars for one adventure (draft spec)

**Status:** agreed in principle with the user on 2026-10-01. Building waits for M6 and the domain (getleit.app or getleit.com), because tappable links need it. This is a draft: the open questions below get settled before the build plan.

## Intent

When friends go out together, each can share their avatar with the others for that adventure, with no accounts, no servers and no connection between phones. At the end you get a group shot on the share card, and the next day the crew walks your route on the recap map. Every invite also shows Leit to friends who don't have it yet.

## Agreed

- **What's shared:** only the avatar look and a first name or nickname typed by the sender. The look is encoded in the link (about 80 characters). Nothing else is sent, and no location is involved.
- **One-way and local:** a friend's avatar is stored on your phone, attached to one adventure only. Nothing is shared back. Your history never leaves your phone.
- **Inviting:** an "Invite your crew" action, available when you start With friends and at any time during the adventure. It opens the phone's share sheet (WhatsApp and other apps) with a link.
- **Receiving:**
  - **With Leit installed:** the link opens Leit, which asks "Add <name> to tonight?".
  - **Without Leit:** a small web page at the domain shows the avatar and a "Get Leit" button.
- **Group shot:** the share card gets a group shot of the crew, capped at 6 avatars, with group poses (for example arms round shoulders, a jump, everyone waving, a pyramid for big groups).
- **Names on the card:** an optional element, off by default, that you switch on yourself. It is not preset.
- **Recap map:** the crew walks your route with you. It's presented lightly as "your crew", not as where each person actually was.
- **Limits:** up to 6 avatars per adventure, including yours.

## Depends on

- **The domain:** links must be `https` to be tappable in WhatsApp. Android App Links need `/.well-known/assetlinks.json` on that domain; iOS Universal Links (later) need the same.
- **The final Android app ID:** decided at the Google Play step, because App Links verify the app's package and signing key.

## Open questions (settle before the plan)

1. Can a friend be added after the adventure ends, for example the next morning when the card gets made? (Likely yes, until the card is made.)
2. Where do crew avatars show during the adventure: next to yours on the live screen, a crew row, or only at the end?
3. Who draws the group poses: Claude Design (a small brief) or the avatar engine, as with the mode touches?
4. Can a crew member be removed from an adventure? (Likely yes.)
5. Does the invite page have its own design pass (it's the first thing a non-user sees)?
6. Is there a badge for going out as a crew? (It would unlock no items.)

## Privacy

- **The link carries no personal data beyond the chosen name.** That name is stored only on the phones of the people it was sent to, and only for that adventure.
- **The privacy policy (Google Play step)** has to describe this.
- **Deleting an adventure** deletes its crew.
