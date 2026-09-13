/* Cadenza — what is being transcribed.
 *
 * Asking first costs one click and saves the engine from a guess it cannot
 * make well.  Told that this is a string quartet, it knows to look for four
 * lines and to put them on four staves; told nothing, its only honest option is
 * to pour everything onto a grand staff and hope.
 *
 * The list below is what a musician would recognise, not a database of every
 * instrument: the common solos, the common ensembles by size, and the orchestra
 * by section.  Anything not on it is reachable through "Other", which opens the
 * full catalogue the rest of the application already uses.
 */

import { INSTRUMENTS, getInstrument } from '../core/instruments.js';

/** A line of music the engine can look for, and where it would sit. */
const part = (id, opts = {}) => {
  const inst = getInstrument(id);
  return {
    id,
    name: inst.name,
    range: inst.range || [21, 108],
    staves: inst.staves || 1,
    polyphonic: (inst.staves || 1) > 1 || id === 'guitar' || id === 'harp',
    /* How many notes this instrument can sound at once.  A violin can stop two
     * strings together and, briefly, three; a flute cannot. */
    chordSize: opts.chordSize !== undefined ? opts.chordSize
      : (inst.staves > 1 ? 8 : (inst.family === 'Strings' ? 2 : 1)),
    ...opts,
  };
};

export const TARGETS = [
  {
    group: 'Solo',
    tip: 'One player.',
    items: [
      { id: 'piano', label: 'Piano', parts: ['piano'], hands: true },
      { id: 'violin', label: 'Violin', parts: ['violin'] },
      { id: 'viola', label: 'Viola', parts: ['viola'] },
      { id: 'cello', label: 'Cello', parts: ['cello'] },
      { id: 'flute', label: 'Flute', parts: ['flute'] },
      { id: 'solo-other', label: 'Other', pick: 1 },
    ],
  },
  {
    group: 'Ensemble',
    tip: 'Two or more players, one staff each — a piano among them gets two.',
    items: [
      { id: 'duet', label: 'Duet', pick: 2, presets: ['violin+piano', 'violin+cello', 'flute+piano', 'cello+piano', 'violin+viola'] },
      { id: 'trio', label: 'Trio', pick: 3, presets: ['piano-trio', 'string-trio', 'flute-trio'] },
      { id: 'quartet', label: 'Quartet', pick: 4, presets: ['string-quartet', 'piano-quartet'] },
      { id: 'chamber', label: 'Chamber ensemble', pick: 'any', presets: ['wind-quintet', 'brass-quintet', 'string-quintet'] },
      { id: 'ensemble-other', label: 'Other', pick: 'any' },
    ],
  },
  {
    group: 'Orchestra',
    tip: 'Written in sections, in score order, with each line on its own staff.',
    items: [
      { id: 'orchestral-movement', label: 'Orchestral movement', sections: true,
        parts: ['flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet',
          'violin', 'violin2', 'viola', 'cello', 'contrabass'] },
      { id: 'full-orchestral-score', label: 'Full orchestral score', sections: true,
        parts: ['piccolo', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet',
          'trombone', 'tuba', 'timpani', 'percussion',
          'violin', 'violin2', 'viola', 'cello', 'contrabass'] },
    ],
  },
];

/** Ready-made line-ups, so the common cases are one click and not four. */
export const PRESETS = {
  'violin+piano': { label: 'Violin + Piano', parts: ['violin', 'piano'] },
  'violin+cello': { label: 'Violin + Cello', parts: ['violin', 'cello'] },
  'violin+viola': { label: 'Violin + Viola', parts: ['violin', 'viola'] },
  'flute+piano': { label: 'Flute + Piano', parts: ['flute', 'piano'] },
  'cello+piano': { label: 'Cello + Piano', parts: ['cello', 'piano'] },
  'piano-trio': { label: 'Piano trio — violin, cello, piano', parts: ['violin', 'cello', 'piano'] },
  'string-trio': { label: 'String trio — violin, viola, cello', parts: ['violin', 'viola', 'cello'] },
  'flute-trio': { label: 'Flute, cello and piano', parts: ['flute', 'cello', 'piano'] },
  'string-quartet': { label: 'String quartet', parts: ['violin', 'violin2', 'viola', 'cello'] },
  'piano-quartet': { label: 'Piano quartet — violin, viola, cello, piano', parts: ['violin', 'viola', 'cello', 'piano'] },
  'wind-quintet': { label: 'Wind quintet', parts: ['flute', 'oboe', 'clarinet', 'horn', 'bassoon'] },
  'brass-quintet': { label: 'Brass quintet', parts: ['trumpet', 'cornet', 'horn', 'trombone', 'tuba'] },
  'string-quintet': { label: 'String quintet', parts: ['violin', 'violin2', 'viola', 'cello', 'contrabass'] },
};

/** The orchestra by section, for the picker. */
export const SECTIONS = [
  { name: 'Woodwinds', parts: ['piccolo', 'flute', 'oboe', 'englishhorn', 'clarinet', 'bassclarinet', 'bassoon', 'contrabassoon'] },
  { name: 'Brass', parts: ['horn', 'trumpet', 'cornet', 'trombone', 'basstrombone', 'tuba'] },
  { name: 'Percussion', parts: ['timpani', 'percussion', 'snaredrum', 'bassdrum', 'cymbals', 'glockenspiel', 'xylophone', 'marimba'] },
  { name: 'Keyboard & harp', parts: ['harp', 'celesta', 'piano'] },
  { name: 'Strings', parts: ['violin', 'violin2', 'viola', 'cello', 'contrabass'] },
];

/** Everything the catalogue offers, for the "Other" pickers. */
export const ALL_PARTS = INSTRUMENTS.filter((i) => i.pitched !== false).map((i) => ({
  id: i.id, name: i.name, family: i.family, range: i.range || [21, 108],
}));

export function findTarget(id) {
  for (const g of TARGETS) for (const t of g.items) if (t.id === id) return { ...t, group: g.group };
  return null;
}

/**
 * Work out the score layout a choice implies.
 *
 * Returns { parts, hands, layers, label } where `parts` are the instruments in
 * score order, `hands` says whether a keyboard part should be split into two,
 * and `layers` is how many independent lines the engine should try to find —
 * which is what stops a string quartet being read as a piano piece.
 */
export function resolveTarget(choice) {
  const { targetId, parts: chosen = null, preset = null } = choice || {};
  const target = findTarget(targetId) || findTarget('piano');
  let ids = chosen;
  if (!ids && preset && PRESETS[preset]) ids = PRESETS[preset].parts;
  if (!ids) ids = target.parts || ['piano'];

  const parts = ids.map((id) => part(id));
  const layers = parts.reduce((sum, p) => sum + (p.staves > 1 ? 2 : 1), 0);
  return {
    targetId: target.id,
    label: target.label,
    group: target.group,
    parts,
    hands: parts.some((p) => p.staves > 1),
    layers,
    orchestral: !!target.sections,
    polyphonic: parts.some((p) => p.chordSize > 2),
  };
}

/** The score-order rank of a line-up, so parts come out in the usual order. */
export function inScoreOrder(ids) {
  const order = ALL_PARTS.map((p) => p.id);
  return [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
