// The wardrobe: every item, and the badge that unlocks it. `badge: null` is
// free from install. The owner approved this table on 2026-10-01, with
// everything in from launch. Nothing unlocks from a drinking badge, and
// unlocks are never stored: they're read from the badges already earned.
// No imports, so node can test it.

export const ITEMS = [
  { group: 'Hats' },
  { id: 'beanie', slot: 'hat', name: 'Beanie', badge: null },
  { id: 'hood', slot: 'hat', name: 'Hood', badge: null },
  { id: 'catears', slot: 'hat', name: 'Cat ears', badge: null },
  { id: 'cap', slot: 'hat', name: 'Cap', badge: 'early-doors' },
  { id: 'party', slot: 'hat', name: 'Party hat', badge: 'game-on' },
  { id: 'headphones', slot: 'hat', name: 'Headphones', badge: 'no-notes' },
  { id: 'sunhat', slot: 'hat', name: 'Sun hat', badge: 'ringleader' },
  { id: 'cowboy', slot: 'hat', name: 'Cowboy hat', badge: 'long-haul' },
  { id: 'bowler', slot: 'hat', name: 'Bowler hat', badge: 'regular' },
  { id: 'flowercrown', slot: 'hat', name: 'Flower crown', badge: 'sunday-best' },
  { id: 'bunnyears', slot: 'hat', name: 'Bunny ears', badge: 'front-row' },
  { id: 'nightcap', slot: 'hat', name: 'Nightcap', badge: 'sunrise-service' },
  { id: 'crown', slot: 'hat', name: 'Crown', badge: 'chaos-agent' },
  { group: 'Costumes' },
  { id: 'panda', slot: 'costume', name: 'Panda', badge: 'snack-break' },
  { id: 'dino', slot: 'costume', name: 'Dinosaur', badge: 'big-stomp' },
  { id: 'duck', slot: 'costume', name: 'Duck', badge: 'just-add-water' },
  { id: 'teddy', slot: 'costume', name: 'Teddy', badge: 'dry-run' },
  { id: 'explorer', slot: 'costume', name: 'Explorer', badge: 'explorer' },
  { id: 'chef', slot: 'costume', name: 'Chef', badge: 'brunch-club' },
  { id: 'superhero', slot: 'costume', name: 'Superhero', badge: 'marathon' },
  { id: 'pirate', slot: 'costume', name: 'Pirate', badge: 'fifty-stops' },
  { id: 'wizard', slot: 'costume', name: 'Wizard', badge: 'archivist' },
  { id: 'astronaut', slot: 'costume', name: 'Astronaut', badge: 'century-club' },
  { id: 'elvis', slot: 'costume', name: 'Elvis', badge: 'pin-cushion' },
  { group: 'Held' },
  { id: 'mug', slot: 'held', name: 'Mug', badge: null },
  { id: 'book', slot: 'held', name: 'Book', badge: null },
  { id: 'bottle', slot: 'held', name: 'Water bottle', badge: 'hydro-homie' },
  { id: 'coffee', slot: 'held', name: 'Coffee', badge: 'caffeine-trail' },
  { id: 'pizza', slot: 'held', name: 'Pizza slice', badge: 'late-bite' },
  { id: 'balloon', slot: 'held', name: 'Balloon', badge: 'anniversary' },
  { id: 'map', slot: 'held', name: 'Map', badge: 'on-the-board' },
  { id: 'camera', slot: 'held', name: 'Camera', badge: 'cover-star' },
  { id: 'binoculars', slot: 'held', name: 'Binoculars', badge: 'tourist' },
  { id: 'umbrella', slot: 'held', name: 'Umbrella', badge: 'tea-break' },
  { id: 'torch', slot: 'held', name: 'Torch', badge: 'trailblazer' },
  { id: 'skateboard', slot: 'held', name: 'Skateboard', badge: 'two-step' },
  { id: 'rod', slot: 'held', name: 'Fishing rod', badge: 'weekly-walker' },
  { id: 'guitar', slot: 'held', name: 'Guitar', badge: 'discovery' },
  { group: 'Extras' },
  { id: 'scarf', slot: 'extra', name: 'Scarf', badge: null },
  { id: 'backpack', slot: 'extra', name: 'Backpack', badge: null },
  { id: 'trainers', slot: 'shoes', name: 'Trainers', badge: 'ten-k' },
  { group: 'Effects' },
  { id: 'sparkles', slot: 'effect', name: 'Sparkles', badge: null },
  { id: 'confetti', slot: 'effect', name: 'Confetti', badge: 'first-night' },
  { id: 'hearts', slot: 'effect', name: 'Hearts', badge: 'good-habits' },
  { id: 'rainbow', slot: 'effect', name: 'Rainbow', badge: 'scenic-route' },
  { id: 'fireworks', slot: 'effect', name: 'Fireworks', badge: 'headliner' },
  { id: 'snow', slot: 'effect', name: 'Snow', badge: 'out-and-about' },
  { id: 'bubbles', slot: 'effect', name: 'Bubbles', badge: 'full-weekend' },
  { id: 'thought', slot: 'effect', name: 'Thought bubble', badge: 'head-space' },
  { id: 'aura', slot: 'effect', name: 'Golden aura', badge: 'early-riser' },
];

// Sunglasses live in the Glasses tab but unlock like an item.
export const SUNGLASSES_BADGE = 'first-dare';

/** An effect's animation frame (0 to 3) at a 12fps tick: still when calm or reduced. */
export function fxFrame(tick, { calm = false, reduced = false } = {}) {
  return calm || reduced ? 0 : Math.floor(tick / 3) % 4;
}
