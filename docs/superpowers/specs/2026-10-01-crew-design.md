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

## Answered (2026-10-01)

1. **Adding friends after the adventure:** yes, until the card is made and beyond. Friends can be added the next morning.
2. **During the adventure:** the crew roves around the live screen near your avatar, somewhere that makes sense in the layout. The exact placement comes from the first build.
3. **Group poses:** Claude draws a first set in the avatar engine, then we iterate with the user.
4. **Removing someone without accidents:** removal happens only from a Crew sheet (tap the crew), where each friend has a small Remove. A toast then offers Undo for five seconds. There's no swipe or long-press removal on the live screen. (Proposed; confirm when building.)
5. **The invite page** gets its own design pass.
6. **Crew badges:** one for each crew size from 2 to 6, so five badges. Names and art to be agreed: proposed Double Act (2), Three's Company (3), Fab Four (4), High Five (5), Full House (6). They unlock no items.

## Privacy

- **The link carries no personal data beyond the chosen name.** That name is stored only on the phones of the people it was sent to, and only for that adventure.
- **The privacy policy (Google Play step)** has to describe this.
- **Deleting an adventure** deletes its crew.
