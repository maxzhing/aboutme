/* Cadenza — pieces that go somewhere and come back changed.
 *
 * Everything the composer wrote until now was one character from beginning to
 * end: a tempo, a texture, a key, sixteen bars, done.  That is a piece of
 * music the way a paragraph is a novel.  What makes the big Romantic forms
 * feel large is not length but *contrast* — a lyrical idea, something violent
 * that interrupts it, the idea returning altered by what happened to it, and
 * an ending that does not simply restore the opening.
 *
 * So a form here is a list of sections, each with its own tempo, key, texture,
 * loudness and pace.  They share a time signature, because the bar lengths are
 * what the engraver lays notes into and changing them mid-piece is a different
 * job; everything else is free to change, which is more than enough for the
 * music to have a shape.
 *
 * The last section's key is the key the piece ends in, and it need not be the
 * one it started in.  A piece that opens serenely in a major key and is
 * finally overwhelmed by the storm that keeps interrupting it — ending in the
 * minor, in the wrong key, unresolved — is a real and very Romantic thing for
 * a piece to do, and it is the kind of shape this could not previously express
 * at all.
 */

/* Where a section sits relative to the key the piece opened in.
 *
 * Named relationships rather than raw semitones, because the same number of
 * semitones means different things from a major and a minor tonic: three down
 * from a major tonic is its relative minor and shares its key signature, while
 * three down from a minor tonic is a genuinely distant key.  A form that says
 * what it means harmonically survives being started in either mode. */
export const RELATIONS = {
  home: (t, m) => ({ tonic: t, mode: m }),
  parallel: (t, m) => ({ tonic: t, mode: m === 'minor' ? 'major' : 'minor' }),
  relative: (t, m) => (m === 'minor'
    ? { tonic: (t + 3) % 12, mode: 'major' }
    : { tonic: (t + 9) % 12, mode: 'minor' }),
  subdominant: (t, m) => ({ tonic: (t + 5) % 12, mode: m }),
  dominant: (t, m) => ({ tonic: (t + 7) % 12, mode: m }),
  /* The key the interruption arrives in: a third away, and always minor.
   * From a major tonic that is the mediant — F major against A minor, which
   * is the pairing the second Chopin ballade is built on — and from a minor
   * tonic the subdominant minor, which is as dark a step in the other
   * direction. */
  storm: (t, m) => (m === 'minor'
    ? { tonic: (t + 5) % 12, mode: 'minor' }
    : { tonic: (t + 4) % 12, mode: 'minor' }),
};

export function sectionKey(tonic, mode, relation) {
  const how = RELATIONS[relation] || RELATIONS.home;
  const got = how(((tonic % 12) + 12) % 12, mode);
  return { tonic: ((got.tonic % 12) + 12) % 12, mode: got.mode };
}

/* A section says only what it changes.
 *
 * Tempo, key and loudness are the form's business, and every section names
 * them.  Texture, pace and how decorated the line is are the *character's*
 * business, so a section leaves them out and the character's own choice
 * stands — that is why asking for a Classical piece in ballade form gives an
 * Alberti bass that is twice interrupted, rather than a piece with no
 * Classical left in it.  The interrupting sections are the exception: they
 * have to sound like an interruption, so they name their own. */
export const FORMS = {
  /* Lyrical, interrupted, interrupted again, and lost to it.
   *
   * The shape of a ballade: a slow idea stated whole, a fast one that breaks
   * in from a third away, the slow one returning unable to continue as it
   * was, and the fast one taking the piece over and keeping it.  The last
   * section closes, so the piece ends in the storm's key rather than its
   * own. */
  ballade: [
    {
      name: 'Andantino', share: 0.34, tempo: 1, key: 'home',
      colour: 0.8, arc: ['p', 'mp', 'mf', 'mp'],
    },
    {
      name: 'Presto con fuoco', share: 0.18, tempo: 2.2, key: 'storm',
      texture: 'filigree', busy: 'lively', complexity: 'complex',
      colour: 1, ornament: 0.12, arc: ['f', 'ff', 'ff'],
    },
    {
      name: 'Tempo I', share: 0.30, tempo: 1, key: 'home',
      colour: 0.95, arc: ['p', 'mp', 'f'],
    },
    {
      name: 'Agitato', share: 0.18, tempo: 2.2, key: 'storm',
      texture: 'filigree', busy: 'lively', complexity: 'complex',
      colour: 1, ornament: 0.15, arc: ['ff', 'ff', 'f', 'p'], closes: true,
    },
  ],

  /* Out and back: a middle section in another key, then the opening again. */
  ternary: [
    {
      name: '', share: 0.4, tempo: 1, key: 'home',
      texture: null, busy: null, arc: ['mf', 'mp', 'mf'],
    },
    {
      name: 'Meno mosso', share: 0.25, tempo: 0.8, key: 'subdominant',
      texture: 'sustained', busy: 'calm', arc: ['p', 'pp', 'p'],
    },
    {
      name: 'Tempo I', share: 0.35, tempo: 1, key: 'home',
      texture: null, busy: null, arc: ['mf', 'f', 'mf', 'p'], closes: true,
    },
  ],

  /* One idea, faster and louder each time it returns. */
  driving: [
    { name: '', share: 0.3, tempo: 1, key: 'home', arc: ['mp', 'mf'] },
    { name: 'Più mosso', share: 0.3, tempo: 1.3, key: 'home', arc: ['mf', 'f'] },
    {
      name: 'Presto', share: 0.4, tempo: 1.6, key: 'parallel',
      busy: 'lively', arc: ['f', 'ff', 'fff'], closes: true,
    },
  ],
};

export const formById = (id) => FORMS[id] || null;

/**
 * Turn a form and a length into the actual sections, in bars.
 *
 * Every section is a whole number of four-bar phrases, because a section that
 * stops halfway through a phrase does not sound like a section — it sounds
 * like a mistake.  What is left over after rounding goes to whichever sections
 * came closest to earning another phrase.
 */
export function layOutForm(formId, totalBars, phraseBars = 4) {
  const spec = FORMS[formId];
  if (!spec) return null;
  const phrases = Math.round(totalBars / phraseBars);
  /* A form needs room to be one.  You cannot state an idea, be interrupted,
   * return to it and be overwhelmed inside sixteen bars — at that length the
   * sections would be one phrase each, and what came out would read as four
   * unrelated fragments rather than a shape.  Below two phrases a section the
   * piece stays single, which is what it was before and is the right answer
   * for something short. */
  if (phrases < spec.length * 2) return null;
  /* Largest remainder: give every section the whole phrases its share earns,
   * then hand the leftovers to whichever sections were closest to another one.
   * Rounding each share on its own and then trimming the largest flattens the
   * proportions until every section is the same length, which is the one thing
   * a form must not be. */
  const exact = spec.map((s) => phrases * s.share);
  const counts = exact.map((v) => Math.max(1, Math.floor(v)));
  let left = phrases - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (left > 0 && order.length) {
    counts[order[k % order.length].i]++;
    left--;
    k++;
  }
  while (left < 0) {
    let at = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[at]) at = i;
    if (counts[at] <= 1) break;
    counts[at]--;
    left++;
  }

  let bar = 0;
  return spec.map((s, i) => {
    const bars = counts[i] * phraseBars;
    const from = bar;
    bar += bars;
    return { ...s, index: i, from, bars, phrases: counts[i], last: i === spec.length - 1 };
  });
}
