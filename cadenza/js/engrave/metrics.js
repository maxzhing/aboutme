/* Cadenza — engraving constants, in staff spaces.
 *
 * These follow the proportions given in Ross and Gould; they are what makes
 * output read as engraved rather than merely drawn.
 */

export const M = {
  staffLine: 0.11,
  stem: 0.12,
  stemLength: 3.5,
  stemShort: 2.5,
  beam: 0.5,
  beamGap: 0.25,
  ledger: 0.13,
  ledgerExtend: 0.32,
  barlineThin: 0.14,
  barlineThick: 0.5,
  barlineGap: 0.36,
  repeatDotR: 0.16,
  tieThick: 0.22,
  slurThick: 0.20,
  hairpinThick: 0.12,
  bracketThick: 0.45,
  staffHeight: 4,

  /* spacing */
  noteGap: 0.5,          // minimum ink-free gap between adjacent columns
  accidentalGap: 0.22,
  dotWidth: 0.5,
  dotR: 0.14,
  leadingPad: 0.9,       // after clef/key/time, before first note
  measurePadLeft: 0.7,
  measurePadRight: 1.1,
  clefGap: 0.6,
  keyGap: 0.3,
  keyAccWidth: 0.94,
  keyAccWidthFlat: 0.84,
  timeGap: 0.6,

  /* vertical */
  staffGap: 7.5,         // between staves of different parts
  graceStaffGap: 5.5,    // between staves of the same instrument
  systemGap: 10,
  articGap: 0.55,
  articStep: 0.9,
  dynamicY: 5.0,         // below the staff top line
  lyricY: 6.4,
  lyricLine: 1.6,
  hairpinY: 5.0,
  tempoY: -2.6,
  chordY: -2.0,
  tupletY: 1.2,

  /* text sizes, in staff spaces */
  titleSize: 5.2,
  subtitleSize: 2.6,
  composerSize: 2.3,
  partNameSize: 1.9,
  tempoSize: 2.1,
  expressionSize: 2.0,
  lyricSize: 1.85,
  chordSize: 2.1,
  fingeringSize: 1.55,
  rehearsalSize: 2.4,
  measureNumSize: 1.5,
  tupletSize: 1.7,
};

export const PAGE_SIZES = {
  letter: { w: 215.9, h: 279.4, name: 'US Letter' },
  a4: { w: 210, h: 297, name: 'A4' },
  legal: { w: 215.9, h: 355.6, name: 'US Legal' },
  tabloid: { w: 279.4, h: 431.8, name: 'Tabloid' },
  a3: { w: 297, h: 420, name: 'A3' },
};

export const MARGINS = { top: 14, bottom: 14, left: 14, right: 14, titleBlock: 22 };

/**
 * Ideal horizontal distance for a note of `ticks` duration.
 * Growth is sublinear, so a whole note takes roughly twice the room of a
 * quarter rather than four times — the convention every engraver uses.
 */
export function idealSpace(ticks, tpq = 960) {
  if (ticks <= 0) return 0;
  return 3.15 * Math.pow(ticks / tpq, 0.55) + 1.15;
}

export const TEXT_FONT = 'Georgia, "Times New Roman", "Nimbus Roman", serif';
export const TEXT_FONT_SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Rastral size for a given number of staves.  Engravers reduce the staff as a
 * score grows so that a system still fits the page; these are the usual steps.
 */
export function suggestSpatium(staffCount) {
  if (staffCount <= 2) return 1.85;
  if (staffCount <= 4) return 1.7;
  if (staffCount <= 6) return 1.55;
  if (staffCount <= 9) return 1.35;
  if (staffCount <= 13) return 1.2;
  if (staffCount <= 18) return 1.05;
  return 0.95;
}
