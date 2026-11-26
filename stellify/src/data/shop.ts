import type { PetSlot } from '@/lib/types';

export interface ShopItem { id: string; slot: PetSlot; name: string; price: number; desc: string; minLevel?: number }

/** Everything is bought with Stardust earned by studying. No real money, no random boxes. */
export const SHOP: ShopItem[] = [
  { id: 'hat-cap', slot: 'hat', name: 'Graduation Cap', price: 60, desc: 'For the scholar who shows up.' },
  { id: 'hat-beanie', slot: 'hat', name: 'Cozy Beanie', price: 40, desc: 'Late-night study warmth.' },
  { id: 'hat-wizard', slot: 'hat', name: 'Star Wizard Hat', price: 140, desc: 'Algebra is a kind of magic.', minLevel: 5 },
  { id: 'hat-crown', slot: 'hat', name: 'Comet Crown', price: 400, desc: 'Reserved for the persistent.', minLevel: 15 },
  { id: 'hat-headphones', slot: 'hat', name: 'Focus Headphones', price: 90, desc: 'Lo-fi beats to solve quadratics to.' },
  { id: 'face-glasses', slot: 'face', name: 'Round Glasses', price: 50, desc: 'Sees the trap answer coming.' },
  { id: 'face-shades', slot: 'face', name: 'Eclipse Shades', price: 110, desc: 'Too bright to look at directly.', minLevel: 5 },
  { id: 'face-monocle', slot: 'face', name: 'Monocle', price: 160, desc: 'Indubitably precise.', minLevel: 10 },
  { id: 'neck-scarf', slot: 'neck', name: 'Aurora Scarf', price: 70, desc: 'Woven from northern lights.' },
  { id: 'neck-bowtie', slot: 'neck', name: 'Bow Tie', price: 60, desc: 'Test-day formal.' },
  { id: 'neck-medal', slot: 'neck', name: 'Gold Medal', price: 220, desc: 'For hard-won progress.', minLevel: 10 },
  { id: 'back-cape', slot: 'back', name: 'Night Cape', price: 180, desc: 'A hero of the hard questions.', minLevel: 5 },
  { id: 'back-pack', slot: 'back', name: 'Explorer Pack', price: 90, desc: 'Carries formulas and snacks.' },
  { id: 'back-wings', slot: 'back', name: 'Stardust Wings', price: 500, desc: 'Earned, never bought with money.', minLevel: 20 },
  { id: 'habitat-nook', slot: 'habitat', name: 'Study Nook', price: 0, desc: 'A quiet desk under a lamp.' },
  { id: 'habitat-observatory', slot: 'habitat', name: 'Observatory', price: 150, desc: 'A dome open to the night sky.' },
  { id: 'habitat-library', slot: 'habitat', name: 'Grand Library', price: 200, desc: 'Shelves to the ceiling.', minLevel: 5 },
  { id: 'habitat-summit', slot: 'habitat', name: 'Mountain Summit', price: 320, desc: 'Above the clouds at dawn.', minLevel: 10 },
  { id: 'habitat-station', slot: 'habitat', name: 'Orbital Station', price: 600, desc: 'Studying with a view of Earth.', minLevel: 20 },
  { id: 'effect-sparkle', slot: 'effect', name: 'Sparkle Trail', price: 120, desc: 'A gentle shimmer of starlight.' },
  { id: 'effect-aura', slot: 'effect', name: 'Focus Aura', price: 260, desc: 'A calm halo of concentration.', minLevel: 10 },
  { id: 'effect-orbit', slot: 'effect', name: 'Tiny Moons', price: 380, desc: 'Three moons in friendly orbit.', minLevel: 15 },
];
export const SHOP_ITEM = Object.fromEntries(SHOP.map((i) => [i.id, i])) as Record<string, ShopItem>;
export const SLOT_NAME: Record<PetSlot, string> = { hat: 'Hats', face: 'Eyewear', neck: 'Accessories', back: 'Outfits', habitat: 'Habitats', effect: 'Special effects' };
