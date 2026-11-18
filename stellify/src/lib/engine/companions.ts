import type { AppState, PetState } from '../types';

/**
 * Companions. Every student starts with an egg; studying (finishing lessons and earning XP) warms it
 * until it hatches into a random companion. Each hatch brings a new egg, so students can collect the set.
 * All art is flat colour (no gradients), drawn in components/Pet.
 */
export type Rarity = 'common' | 'rare' | 'legendary';
export interface Species {
  id: string;
  name: string;
  kind: string;
  rarity: Rarity;
  blurb: string;
  /** body, belly/face patch, darker shade (ears, feet, outline), cheek, accent */
  colors: { body: string; belly: string; dark: string; cheek: string; accent: string };
}

export const SPECIES: Species[] = [
  { id: 'mochi', name: 'Mochi', kind: 'bunny', rarity: 'common', blurb: 'A soft, round bunny who hops a little higher every time an idea clicks.', colors: { body: '#FFF4EA', belly: '#FFFFFF', dark: '#F2B8A2', cheek: '#FF9EAF', accent: '#FF8FA3' } },
  { id: 'pip', name: 'Pip', kind: 'frog', rarity: 'common', blurb: 'A cheerful frog who leaps from lily pad to lily pad, one lesson at a time.', colors: { body: '#7BD88F', belly: '#E8FFD9', dark: '#3FA45B', cheek: '#FF9E9E', accent: '#2F8A4A' } },
  { id: 'ember', name: 'Ember', kind: 'fox kit', rarity: 'common', blurb: 'A clever little fox with a warm, fluffy tail and a nose for patterns.', colors: { body: '#FF8C42', belly: '#FFF3E6', dark: '#C85A1A', cheek: '#FFB0A0', accent: '#3B2A20' } },
  { id: 'sunny', name: 'Sunny', kind: 'chick', rarity: 'common', blurb: 'A sunny chick who chirps whenever you get one right.', colors: { body: '#FFD23F', belly: '#FFF1A8', dark: '#F29E1F', cheek: '#FFA38A', accent: '#FF8A1F' } },
  { id: 'toffee', name: 'Toffee', kind: 'bear cub', rarity: 'common', blurb: 'A cozy bear cub who loves long study sessions and honey breaks.', colors: { body: '#C98A5B', belly: '#F4D9B8', dark: '#8E5A34', cheek: '#F2A08A', accent: '#5A3720' } },
  { id: 'bao', name: 'Bao', kind: 'panda', rarity: 'rare', blurb: 'A calm panda who never rushes and never forgets a formula.', colors: { body: '#FFFFFF', belly: '#F3F4F6', dark: '#2A2D34', cheek: '#FFB3C0', accent: '#2A2D34' } },
  { id: 'kumo', name: 'Kumo', kind: 'penguin', rarity: 'rare', blurb: 'A cool penguin who slides through hard questions without slipping.', colors: { body: '#2E4A7D', belly: '#FFFFFF', dark: '#1D3157', cheek: '#FF9FB0', accent: '#FFA62B' } },
  { id: 'coral', name: 'Coral', kind: 'axolotl', rarity: 'rare', blurb: 'A smiley axolotl who can regrow anything, including confidence.', colors: { body: '#FFA6C1', belly: '#FFE1EA', dark: '#F06292', cheek: '#FF7FA6', accent: '#E04882' } },
  { id: 'skye', name: 'Skye', kind: 'cloud kitten', rarity: 'rare', blurb: 'A kitten made of sky who floats over every obstacle.', colors: { body: '#8FD3FF', belly: '#FFFFFF', dark: '#4AA8E8', cheek: '#FFA8C5', accent: '#2C8AD0' } },
  { id: 'moss', name: 'Moss', kind: 'baby dragon', rarity: 'legendary', blurb: 'A rare baby dragon with tiny wings and a big, brave heart.', colors: { body: '#2EC4A6', belly: '#D8FFF2', dark: '#178F79', cheek: '#FF9FA0', accent: '#FFD166' } },
];
export const speciesById = (id?: string) => SPECIES.find((s) => s.id === id);
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
const WEIGHT: Record<Rarity, number> = { common: 0.6, rare: 0.32, legendary: 0.08 };

/** How much study each egg needs. Egg k is the (k+1)-th egg a student opens. */
export const EGG_NEEDS = [
  { lessons: 1, xp: 60 }, { lessons: 2, xp: 200 }, { lessons: 3, xp: 300 }, { lessons: 3, xp: 400 }, { lessons: 4, xp: 500 },
  { lessons: 4, xp: 600 }, { lessons: 5, xp: 700 }, { lessons: 5, xp: 800 }, { lessons: 6, xp: 900 }, { lessons: 6, xp: 1000 },
];
export const totalLessons = (s: Pick<AppState, 'activity'>) => Object.values(s.activity).reduce((n, d) => n + (d.lessons ?? 0), 0);
export const collectionOf = (p: PetState) => p.collection ?? (p.species ? [{ id: p.species, at: 0 }] : []);
/** null when every companion has been collected */
export function eggOf(s: Pick<AppState, 'pet' | 'activity'>) {
  const col = collectionOf(s.pet);
  if (col.length >= SPECIES.length) return null;
  const k = col.length;
  const need = EGG_NEEDS[Math.min(k, EGG_NEEDS.length - 1)];
  // an egg without a stored baseline (students from before eggs existed) counts all past study
  const base = s.pet.egg ?? { xp0: 0, lessons0: 0, pattern: 0 };
  const lessons = Math.max(0, totalLessons(s) - base.lessons0), xp = Math.max(0, s.pet.xp - base.xp0);
  const pct = Math.min(1, (Math.min(lessons, need.lessons) / need.lessons) * 0.5 + (Math.min(xp, need.xp) / need.xp) * 0.5);
  return { index: k, need, lessons: Math.min(lessons, need.lessons), xp: Math.min(xp, need.xp), pct, ready: lessons >= need.lessons && xp >= need.xp, pattern: base.pattern };
}

/** Pick a random companion the student does not have yet, weighted by rarity. */
export function rollSpecies(owned: string[], rand: () => number = secureRandom): Species {
  const pool = SPECIES.filter((s) => !owned.includes(s.id));
  const list = pool.length ? pool : SPECIES;
  const total = list.reduce((t, s) => t + WEIGHT[s.rarity], 0);
  let r = rand() * total;
  for (const s of list) { r -= WEIGHT[s.rarity]; if (r < 0) return s; }
  return list[list.length - 1];
}
export function secureRandom(): number {
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 2 ** 32; } catch { return Math.random(); }
}
/** the name to show: the student's own name for it, or the species name, or "your egg" */
export const petName = (p: PetState) => (p.species ? (p.name && p.name !== 'Lumi' ? p.name : speciesById(p.species)?.name ?? 'Your companion') : 'your egg');
export const EGG_PATTERNS = [
  { shell: '#FFF6E5', spot: '#FF9EAF', band: '#FFD23F' },
  { shell: '#EFFAF3', spot: '#7BD88F', band: '#2EC4A6' },
  { shell: '#EEF7FF', spot: '#8FD3FF', band: '#FF8C42' },
  { shell: '#FFF1F4', spot: '#FFA6C1', band: '#8FD3FF' },
];
