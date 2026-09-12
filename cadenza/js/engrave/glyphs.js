/* Cadenza — the music glyph set.
 *
 * Rather than depending on a music font, every symbol is built here from
 * primitives: rotated ellipses for noteheads, calligraphic centrelines for the
 * clefs and curved rests, polygons for the accidentals.  Coordinates are in
 * staff spaces with the origin at each glyph's attachment point, so a glyph can
 * be dropped onto a staff with a plain translate.
 */

import {
  ellipsePath, circlePath, rectPath, ringPath, smoothPath, strokeOutline, spiralPoints, joinPaths, xform,
} from './geom.js';

const D = Math.PI / 180;

/* ------------------------------------------------------------- noteheads */
/* Origin sits at the left edge, vertically centred on the staff line/space. */

const HEAD_ANGLE = -20 * D;
const black = ellipsePath(0.59, 0, 0.605, 0.468, HEAD_ANGLE);
const halfOuter = ellipsePath(0.59, 0, 0.605, 0.468, HEAD_ANGLE);
const halfInner = ellipsePath(0.59, 0, 0.44, 0.196, -34 * D, true);
const wholeOuter = ellipsePath(0.83, 0, 0.83, 0.5, 0);
const wholeInner = ellipsePath(0.83, 0, 0.44, 0.215, -63 * D, true);

const breveBar = joinPaths(
  rectPath(0.0, -0.52, 0.1, 1.04),
  rectPath(1.56, -0.52, 0.1, 1.04),
);

/* ------------------------------------------------------------------ clefs */

/* Treble clef.  Traced as one calligraphic stroke: the tail below the staff,
 * up through the stem, around the upper loop, then inward to the spiral eye.
 * y = 0 is the G line. */
function buildGClef() {
  /* Tail, stem and upper loop as one calligraphic centreline... */
  const line = [
    [0.50, 2.18, 0.055], [0.24, 2.54, 0.14], [0.56, 2.88, 0.22], [1.06, 2.86, 0.235],
    [1.44, 2.50, 0.225], [1.60, 1.98, 0.215], [1.67, 1.34, 0.205], [1.70, 0.60, 0.20],
    [1.70, -0.22, 0.198], [1.72, -1.06, 0.20], [1.78, -1.90, 0.205], [1.86, -2.64, 0.215],
    [1.90, -3.26, 0.225], [1.82, -3.84, 0.245], [1.52, -4.26, 0.26], [1.06, -4.46, 0.265],
    [0.62, -4.30, 0.285], [0.34, -3.90, 0.315], [0.28, -3.38, 0.35], [0.40, -2.84, 0.385],
    [0.62, -2.30, 0.405], [0.80, -1.76, 0.415], [0.88, -1.22, 0.42], [0.84, -0.72, 0.418],
    [0.62, -0.34, 0.412],
  ];
  /* ...closing in a spiral whose eye sits on the G line. */
  const spiral = spiralPoints(1.10, 0.12, 1.02, 0.17, Math.PI * 0.94, -Math.PI * 1.18, 56, 0.41, 0.035);
  /* Widen slightly: drawn narrow, the loop and spiral read as a cursive f. */
  return strokeOutline(xform([...line, ...spiral], { sx: 1.2, sy: 0.97, sw: 1.05 }));
}

/* Bass clef: a heavy head with a sweeping tail, plus the two dots that
 * identify the F line.  y = 0 is the F line. */
const F_CLEF_LINE = [
  [0.30, -0.62, 0.50], [0.72, -0.98, 0.46], [1.20, -1.04, 0.40], [1.62, -0.86, 0.34],
  [1.86, -0.46, 0.30], [1.92, 0.04, 0.28], [1.84, 0.56, 0.27], [1.64, 1.10, 0.25],
  [1.32, 1.62, 0.22], [0.92, 2.06, 0.17], [0.50, 2.36, 0.11], [0.16, 2.52, 0.05],
];

/* C clef: mirrored hooks either side of a double bar.  y = 0 is the line the
 * clef names. */
function cClefHook(sign) {
  return [
    [0.72, sign * 0.04, 0.30], [1.06, sign * 0.20, 0.34], [1.34, sign * 0.56, 0.36],
    [1.46, sign * 1.06, 0.34], [1.40, sign * 1.52, 0.30], [1.16, sign * 1.82, 0.25],
    [0.86, sign * 1.88, 0.20], [0.62, sign * 1.72, 0.16], [0.52, sign * 1.46, 0.12],
  ];
}

const C_CLEF = joinPaths(
  rectPath(0, -2.0, 0.20, 4.0),
  rectPath(0.30, -2.0, 0.10, 4.0),
  strokeOutline(cClefHook(-1), { capStart: 'flat' }),
  strokeOutline(cClefHook(1), { capStart: 'flat' }),
  circlePath(0.70, -1.86, 0.17),
  circlePath(0.70, 1.86, 0.17),
);

const PERC_CLEF = joinPaths(rectPath(0, -1.0, 0.30, 2.0), rectPath(0.52, -1.0, 0.30, 2.0));

/* ------------------------------------------------------------ accidentals */
/* Origin at the left edge, y = 0 on the notehead's line or space. */

/** A slanted thick bar, as used by sharps and naturals. */
function slantBar(x0, y0, x1, y1, thick) {
  return `M${x0},${y0 + thick}L${x1},${y1 + thick}L${x1},${y1}L${x0},${y0}Z`;
}

const SHARP = joinPaths(
  `M0.20,-0.86L0.20,1.30L0.34,1.24L0.34,-0.92Z`,
  `M0.62,-1.04L0.62,1.12L0.76,1.06L0.76,-1.10Z`,
  slantBar(0.00, 0.36, 0.96, 0.10, 0.30),
  slantBar(0.00, -0.32, 0.96, -0.58, 0.30),
);

const FLAT = joinPaths(
  `M0.10,-1.72L0.10,1.02L0.26,1.02L0.26,-1.72Z`,
  smoothPath([
    [0.26, 1.02], [0.50, 0.72], [0.72, 0.40], [0.78, 0.10], [0.70, -0.14],
    [0.50, -0.22], [0.32, -0.12], [0.26, 0.04],
    [0.26, -0.20], [0.40, -0.42], [0.64, -0.48], [0.86, -0.36], [0.96, -0.08],
    [0.92, 0.32], [0.70, 0.74], [0.38, 1.10], [0.26, 1.18],
  ], true, 0.85),
);

const NATURAL = joinPaths(
  `M0.10,-1.42L0.10,0.86L0.24,0.80L0.24,-1.42Z`,
  `M0.52,-0.80L0.52,1.48L0.66,1.48L0.66,-0.74Z`,
  slantBar(0.10, 0.30, 0.66, 0.10, 0.26),
  slantBar(0.10, -0.36, 0.66, -0.56, 0.26),
);

const DOUBLE_SHARP = (() => {
  const c = 0.50, t = 0.50, n = 0.32, w = 0.17;
  const pt = (x, y) => `${(c + x).toFixed(2)},${y.toFixed(2)}`;
  return `M${pt(n, -t)}L${pt(t, -t)}L${pt(t, -n)}L${pt(w, 0)}L${pt(t, n)}L${pt(t, t)}` +
    `L${pt(n, t)}L${pt(0, w)}L${pt(-n, t)}L${pt(-t, t)}L${pt(-t, n)}L${pt(-w, 0)}` +
    `L${pt(-t, -n)}L${pt(-t, -t)}L${pt(-n, -t)}L${pt(0, -w)}Z`;
})();

const DOUBLE_FLAT = joinPaths(FLAT, translatePath(FLAT, 0.74, 0));
const QUARTER_SHARP = joinPaths(
  `M0.34,-1.04L0.34,1.12L0.48,1.06L0.48,-1.10Z`,
  slantBar(0.06, 0.30, 0.78, 0.08, 0.28),
  slantBar(0.06, -0.34, 0.78, -0.56, 0.28),
);

/* ------------------------------------------------------------------ rests */

const WHOLE_REST = rectPath(0, 0, 1.30, 0.52);
const HALF_REST = rectPath(0, -0.52, 1.30, 0.52);

/* The quarter rest is a single calligraphic zigzag ending in a hook. */
const QUARTER_REST = strokeOutline([
  [0.62, -1.44, 0.10], [0.30, -0.92, 0.22], [0.62, -0.40, 0.26], [0.86, 0.02, 0.20],
  [0.44, 0.36, 0.17], [0.16, 0.76, 0.24], [0.36, 1.16, 0.30], [0.72, 1.38, 0.26],
  [0.52, 1.26, 0.20], [0.28, 1.22, 0.17], [0.20, 1.36, 0.14], [0.34, 1.56, 0.11],
], { capStart: 'flat' });

/** Flagged rests: a slanted stem carrying one blob-and-hook per beam. */
function flagRest(count) {
  const bottom = 1.10;
  const top = bottom - 0.30 - count * 0.82;
  const xTop = 1.02;
  const xBottom = 0.30;
  const stemX = (y) => xTop + ((xBottom - xTop) * (y - top)) / (bottom - top);
  const pts = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const y = top + ((bottom - top) * i) / steps;
    pts.push([stemX(y), y, 0.145 - 0.035 * (i / steps)]);
  }
  let d = strokeOutline(pts, { capStart: 'flat' });
  for (let i = 0; i < count; i++) {
    const y = top + 0.22 + i * 0.82;
    const sx = stemX(y);
    d = joinPaths(d, circlePath(sx - 0.60, y + 0.12, 0.235));
    d = joinPaths(d, strokeOutline([
      [sx - 0.60, y + 0.12, 0.16], [sx - 0.30, y - 0.06, 0.15],
      [sx - 0.04, y - 0.12, 0.14], [sx + 0.04, y - 0.06, 0.13],
    ], { capStart: 'flat', capEnd: 'flat' }));
  }
  return d;
}

/* ------------------------------------------------------------------ flags */

/** Stem flags, drawn hanging from (0, 0) at the stem tip, pointing right. */
function flagShape(index, down) {
  const s = down ? -1 : 1;
  const y0 = index * 0.88 * s;
  const pts = [
    [0.0, y0, 0.30],
    [0.34, y0 + 0.40 * s, 0.34],
    [0.62, y0 + 0.94 * s, 0.30],
    [0.70, y0 + 1.52 * s, 0.22],
    [0.56, y0 + 2.02 * s, 0.14],
    [0.30, y0 + 2.34 * s, 0.07],
  ];
  return strokeOutline(pts, { capStart: 'flat' });
}

function flags(count, down) {
  let d = '';
  for (let i = 0; i < count; i++) d = joinPaths(d, flagShape(i, down));
  return d;
}

/* --------------------------------------------------------- articulations */

const STACCATO = circlePath(0, 0, 0.17);
const STACCATISSIMO = `M-0.17,-0.50L0.17,-0.50L0.0,0.42Z`;
const TENUTO = rectPath(-0.44, -0.06, 0.88, 0.12);
const ACCENT = joinPaths(
  `M-0.62,-0.42L0.62,-0.02L0.62,0.10L-0.62,-0.24Z`,
  `M-0.62,0.42L0.62,0.02L0.62,-0.10L-0.62,0.24Z`,
);
const MARCATO = joinPaths(
  `M-0.42,0.42L0.0,-0.50L0.10,-0.50L-0.28,0.42Z`,
  `M0.42,0.42L0.0,-0.50L-0.10,-0.50L0.28,0.42Z`,
);
const FERMATA = joinPaths(
  smoothPath([
    [-1.04, 0], [-0.96, -0.60], [-0.56, -1.02], [0, -1.16], [0.56, -1.02],
    [0.96, -0.60], [1.04, 0], [0.84, 0], [0.74, -0.50], [0.40, -0.82],
    [0, -0.92], [-0.40, -0.82], [-0.74, -0.50], [-0.84, 0],
  ], true, 0.7),
  circlePath(0, -0.30, 0.17),
);
const FERMATA_BELOW = flipY(FERMATA);
const BREATH = strokeOutline([[0.06, -0.70, 0.10], [-0.02, -0.30, 0.16], [-0.20, 0.10, 0.10]]);
const CAESURA = joinPaths(
  `M-0.10,0.60L0.42,-0.70L0.58,-0.70L0.06,0.60Z`,
  `M0.34,0.60L0.86,-0.70L1.02,-0.70L0.50,0.60Z`,
);

/* Ornaments */
const MORDENT = zigzag(2, true);
const MORDENT_LOWER = joinPaths(zigzag(2, true), rectPath(-0.07, -0.12, 0.14, 0.92));
const TURN = joinPaths(
  strokeOutline([
    [-0.90, 0.18, 0.13], [-0.70, -0.16, 0.15], [-0.34, -0.24, 0.16], [-0.06, -0.02, 0.15],
    [0.06, 0.20, 0.14], [0.30, 0.30, 0.15], [0.62, 0.22, 0.16], [0.86, -0.10, 0.14],
    [0.92, -0.30, 0.12],
  ]),
);
const TRILL = TEXT_TR();
const ARPEGGIO_UNIT = strokeOutline([
  [0.00, 0.00, 0.16], [0.26, 0.22, 0.16], [0.26, 0.62, 0.16], [0.00, 0.84, 0.16],
  [-0.02, 1.00, 0.16],
], { capStart: 'flat', capEnd: 'flat' });

function zigzag(peaks, tall) {
  const pts = [];
  const w = 0.50;
  const h = tall ? 0.56 : 0.44;
  let x = -w * peaks;
  pts.push([x, h * 0.5, 0.16]);
  for (let i = 0; i < peaks; i++) {
    pts.push([x + w * 0.5, -h * 0.5, 0.18]);
    pts.push([x + w, h * 0.5, 0.16]);
    x += w;
  }
  for (let i = 0; i < peaks; i++) {
    pts.push([x + w * 0.5, -h * 0.5, 0.15]);
    pts.push([x + w, h * 0.5, 0.13]);
    x += w;
  }
  return strokeOutline(pts.slice(0, peaks * 2 + 1), { capStart: 'flat', capEnd: 'flat' });
}

function TEXT_TR() {
  /* A compact italic "tr" drawn as strokes. */
  const t = joinPaths(
    strokeOutline([[0.08, -0.90, 0.10], [0.16, -0.30, 0.13], [0.20, 0.20, 0.14], [0.34, 0.44, 0.12], [0.52, 0.44, 0.10]], { capStart: 'flat' }),
    strokeOutline([[-0.10, -0.36, 0.11], [0.46, -0.40, 0.11]], { capStart: 'flat', capEnd: 'flat' }),
  );
  const r = joinPaths(
    strokeOutline([[0.66, -0.40, 0.12], [0.76, 0.10, 0.14], [0.80, 0.44, 0.13]], { capStart: 'flat' }),
    strokeOutline([[0.72, -0.16, 0.11], [0.90, -0.38, 0.12], [1.12, -0.42, 0.11], [1.24, -0.30, 0.10]], { capStart: 'flat' }),
  );
  return joinPaths(t, r);
}

/* -------------------------------------------------------------- dynamics */
/* Bold italic letterforms, drawn as calligraphic strokes on a 1-space x-height.
 * Origin is the baseline at the left edge. */

/* The pen is held at a steep angle, so downstrokes are heavy and the joins
 * thin — the contrast is what makes these read as dynamics rather than text. */
const DYN_P = joinPaths(
  strokeOutline([
    [0.10, 1.22, 0.11], [0.24, 0.86, 0.20], [0.38, 0.40, 0.28], [0.50, -0.06, 0.30],
    [0.58, -0.40, 0.26],
  ], { capStart: 'round' }),
  strokeOutline([
    [0.40, 0.34, 0.20], [0.52, -0.14, 0.26], [0.72, -0.46, 0.28], [1.00, -0.54, 0.26],
    [1.22, -0.38, 0.24], [1.24, -0.08, 0.24], [1.08, 0.18, 0.24], [0.80, 0.30, 0.22],
    [0.54, 0.26, 0.18],
  ], { capStart: 'flat' }),
);

const DYN_F = joinPaths(
  strokeOutline([
    [0.06, 1.14, 0.10], [0.24, 0.80, 0.18], [0.42, 0.24, 0.27], [0.58, -0.36, 0.31],
    [0.74, -0.92, 0.28], [0.96, -1.26, 0.20], [1.20, -1.30, 0.12],
  ], { capStart: 'round' }),
  strokeOutline([[0.06, -0.10, 0.13], [0.96, -0.20, 0.13]], { capStart: 'round', capEnd: 'round' }),
);

const DYN_M = joinPaths(
  strokeOutline([[0.10, 0.44, 0.22], [0.16, 0.06, 0.26], [0.22, -0.34, 0.22]], { capStart: 'round' }),
  strokeOutline([
    [0.16, -0.16, 0.20], [0.34, -0.50, 0.24], [0.60, -0.54, 0.24], [0.70, -0.24, 0.24],
    [0.74, 0.14, 0.24], [0.78, 0.44, 0.22],
  ], { capStart: 'flat' }),
  strokeOutline([
    [0.70, -0.20, 0.20], [0.88, -0.50, 0.24], [1.14, -0.54, 0.24], [1.24, -0.24, 0.24],
    [1.28, 0.14, 0.24], [1.32, 0.44, 0.22],
  ], { capStart: 'flat' }),
);

const DYN_S = strokeOutline([
  [0.72, -0.34, 0.13], [0.48, -0.54, 0.20], [0.20, -0.48, 0.24], [0.14, -0.22, 0.24],
  [0.36, -0.04, 0.24], [0.66, 0.12, 0.24], [0.68, 0.36, 0.22], [0.42, 0.50, 0.18],
  [0.12, 0.40, 0.12],
], { capStart: 'round', capEnd: 'round' });

const DYN_Z = joinPaths(
  strokeOutline([[0.10, -0.42, 0.17], [0.70, -0.46, 0.17]], { capStart: 'round', capEnd: 'round' }),
  strokeOutline([[0.68, -0.44, 0.20], [0.14, 0.34, 0.22]], { capStart: 'flat', capEnd: 'flat' }),
  strokeOutline([[0.08, 0.36, 0.17], [0.72, 0.32, 0.17]], { capStart: 'round', capEnd: 'round' }),
);

const DYN_R = joinPaths(
  strokeOutline([[0.10, -0.44, 0.24], [0.18, -0.04, 0.26], [0.24, 0.44, 0.22]], { capStart: 'round' }),
  strokeOutline([
    [0.16, -0.20, 0.20], [0.36, -0.50, 0.24], [0.62, -0.56, 0.20], [0.76, -0.44, 0.15],
  ], { capStart: 'flat' }),
);

/* ------------------------------------------------------------------ misc */

const SEGNO = joinPaths(
  strokeOutline([
    [1.14, -0.94, 0.10], [0.86, -1.12, 0.15], [0.50, -1.08, 0.19], [0.30, -0.84, 0.21],
    [0.38, -0.56, 0.22], [0.70, -0.36, 0.23], [1.04, -0.14, 0.23], [1.20, 0.16, 0.22],
    [1.10, 0.48, 0.20], [0.78, 0.64, 0.16], [0.44, 0.58, 0.11],
  ]),
  `M0.14,0.72L1.36,-1.12L1.52,-1.00L0.30,0.84Z`,
  circlePath(0.28, -1.16, 0.155),
  circlePath(1.26, 0.72, 0.155),
);

const CODA = joinPaths(
  ringPath(0.80, 0, 0.72, 0.58, 0.15),
  rectPath(0.72, -1.02, 0.16, 2.04),
  rectPath(-0.06, -0.08, 1.72, 0.16),
);

const PEDAL = joinPaths(
  strokeOutline([[0.08, 0.30, 0.13], [0.14, -0.10, 0.16], [0.18, -0.50, 0.14]], { capStart: 'flat' }),
  strokeOutline([[0.14, -0.44, 0.14], [0.40, -0.60, 0.16], [0.62, -0.44, 0.15], [0.56, -0.20, 0.14], [0.30, -0.12, 0.12]], { capStart: 'flat', capEnd: 'flat' }),
  strokeOutline([[0.80, -0.30, 0.12], [0.98, -0.44, 0.14], [1.16, -0.36, 0.14], [1.12, -0.18, 0.13], [0.92, -0.10, 0.12], [0.82, 0.06, 0.13], [0.94, 0.18, 0.13], [1.16, 0.16, 0.12]], { capStart: 'flat', capEnd: 'flat' }),
  strokeOutline([[1.34, -0.44, 0.13], [1.40, 0.00, 0.14], [1.44, 0.32, 0.13]], { capStart: 'flat' }),
  strokeOutline([[1.38, -0.28, 0.12], [1.58, -0.46, 0.13], [1.78, -0.34, 0.12]], { capStart: 'flat' }),
);
const PEDAL_UP = joinPaths(
  ringPath(0.52, -0.30, 0.50, 0.50, 0.12),
  rectPath(0.46, -0.92, 0.12, 1.24),
  rectPath(0.02, -0.36, 1.00, 0.12),
);

/* ------------------------------------------------------------------ digits */
/* Time-signature numerals: heavy, slightly condensed, centred on x = 0 with
 * y = 0 at the vertical centre of the digit. */

const DIGITS = {
  0: joinPaths(
    smoothPath([[0, -1.00], [0.42, -0.80], [0.56, -0.26], [0.56, 0.26], [0.42, 0.80], [0, 1.00], [-0.42, 0.80], [-0.56, 0.26], [-0.56, -0.26], [-0.42, -0.80]], true, 0.9),
    smoothPath([[0, -0.66], [-0.22, -0.50], [-0.28, -0.14], [-0.28, 0.14], [-0.22, 0.50], [0, 0.66], [0.22, 0.50], [0.28, 0.14], [0.28, -0.14], [0.22, -0.50]], true, 0.9),
  ),
  1: joinPaths(
    rectPath(-0.17, -0.86, 0.36, 1.72),
    `M-0.17,-0.62L-0.52,-0.40L-0.52,-0.66L-0.10,-1.00L0.19,-1.00L0.19,-0.62Z`,
    rectPath(-0.50, 0.70, 0.98, 0.30),
  ),
  2: joinPaths(
    smoothPath([
      [-0.54, -0.56], [-0.40, -0.90], [-0.02, -1.04], [0.36, -0.92], [0.54, -0.58],
      [0.44, -0.20], [0.14, 0.12], [-0.20, 0.44], [-0.30, 0.66], [0.56, 0.66],
      [0.56, 1.00], [-0.60, 1.00], [-0.60, 0.70], [-0.24, 0.24], [0.08, -0.10],
      [0.22, -0.44], [0.10, -0.70], [-0.12, -0.74], [-0.26, -0.60], [-0.26, -0.42],
    ], true, 0.75),
  ),
  3: joinPaths(
    smoothPath([
      [-0.52, -0.74], [-0.24, -1.00], [0.16, -1.04], [0.50, -0.84], [0.52, -0.50],
      [0.26, -0.20], [0.02, -0.12], [0.30, -0.06], [0.58, 0.20], [0.56, 0.66],
      [0.24, 1.00], [-0.22, 1.04], [-0.54, 0.84], [-0.58, 0.52], [-0.28, 0.44],
      [-0.16, 0.66], [0.06, 0.74], [0.24, 0.58], [0.22, 0.26], [-0.04, 0.10],
      [-0.22, 0.08], [-0.22, -0.20], [-0.02, -0.24], [0.18, -0.40], [0.16, -0.64],
      [-0.02, -0.74], [-0.20, -0.66], [-0.26, -0.46],
    ], true, 0.75),
  ),
  4: joinPaths(
    `M0.10,-1.00L0.46,-1.00L0.46,1.00L0.10,1.00L0.10,0.34L-0.60,0.34L-0.60,0.02L0.02,-1.00Z
     M0.10,0.02L-0.30,0.02L0.10,-0.62Z`,
  ),
  5: joinPaths(
    smoothPath([
      [-0.46, -1.00], [0.52, -1.00], [0.52, -0.68], [-0.18, -0.68], [-0.22, -0.30],
      [0.06, -0.38], [0.44, -0.20], [0.58, 0.24], [0.42, 0.76], [0.00, 1.02],
      [-0.42, 0.94], [-0.58, 0.62], [-0.28, 0.48], [-0.10, 0.68], [0.12, 0.68],
      [0.24, 0.42], [0.18, 0.06], [-0.10, -0.04], [-0.34, 0.06], [-0.50, 0.02],
    ], true, 0.75),
  ),
  6: joinPaths(
    smoothPath([
      [0.42, -0.88], [0.16, -1.04], [-0.24, -0.96], [-0.50, -0.60], [-0.58, 0.04],
      [-0.48, 0.64], [-0.14, 1.02], [0.26, 1.02], [0.54, 0.74], [0.58, 0.30],
      [0.36, -0.06], [-0.02, -0.16], [-0.24, -0.04], [-0.24, -0.44], [-0.06, -0.70],
      [0.20, -0.62],
    ], true, 0.8),
    ellipsePath(0.06, 0.42, 0.28, 0.32, 0, true),
  ),
  7: joinPaths(
    `M-0.56,-1.00L0.56,-1.00L0.56,-0.72L-0.02,1.00L-0.40,1.00L0.18,-0.68L-0.56,-0.68Z`,
  ),
  8: joinPaths(
    smoothPath([[0, -1.04], [0.42, -0.86], [0.48, -0.50], [0.24, -0.16], [0.54, 0.14], [0.56, 0.66], [0.20, 1.02], [-0.20, 1.02], [-0.56, 0.66], [-0.54, 0.14], [-0.24, -0.16], [-0.48, -0.50], [-0.42, -0.86]], true, 0.85),
    ellipsePath(0, -0.58, 0.20, 0.22, 0, true),
    ellipsePath(0, 0.48, 0.26, 0.28, 0, true),
  ),
  9: joinPaths(
    smoothPath([
      [-0.40, 0.88], [-0.14, 1.04], [0.24, 0.96], [0.50, 0.60], [0.58, -0.04],
      [0.48, -0.64], [0.14, -1.02], [-0.26, -1.02], [-0.54, -0.74], [-0.58, -0.30],
      [-0.36, 0.06], [0.02, 0.16], [0.24, 0.04], [0.24, 0.44], [0.06, 0.70],
      [-0.20, 0.62],
    ], true, 0.8),
    ellipsePath(-0.06, -0.42, 0.28, 0.32, 0, true),
  ),
};

const COMMON_TIME = joinPaths(
  smoothPath([
    [0.62, -0.62], [0.20, -0.78], [-0.24, -0.54], [-0.40, 0.00], [-0.24, 0.54],
    [0.20, 0.78], [0.62, 0.62], [0.62, 0.90], [0.14, 1.04], [-0.44, 0.74],
    [-0.66, 0.00], [-0.44, -0.74], [0.14, -1.04], [0.62, -0.90],
  ], true, 0.8),
);
const CUT_TIME = joinPaths(COMMON_TIME, rectPath(-0.09, -1.34, 0.18, 2.68));

/* ---------------------------------------------------------------- helpers */

function translatePath(d, dx, dy) {
  return d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (m, x, y) =>
    `${Math.round((parseFloat(x) + dx) * 1000) / 1000},${Math.round((parseFloat(y) + dy) * 1000) / 1000}`);
}

function flipY(d) {
  return d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (m, x, y) => `${x},${-parseFloat(y)}`);
}

/* ---------------------------------------------------------------- exports */

export const GLYPHS = {
  /* noteheads: `w` is the advance used for spacing and stem attachment */
  noteheadBlack: { d: black, w: 1.18, sx: 1.18 },
  noteheadHalf: { d: halfOuter + ' ' + halfInner, w: 1.18, sx: 1.18 },
  noteheadWhole: { d: wholeOuter + ' ' + wholeInner, w: 1.66, sx: 1.66 },
  noteheadBreve: { d: wholeOuter + ' ' + wholeInner + ' ' + breveBar, w: 1.66 },
  noteheadX: {
    d: joinPaths(
      strokeOutline([[0.06, -0.46, 0.17], [1.12, 0.46, 0.17]], { capStart: 'flat', capEnd: 'flat' }),
      strokeOutline([[0.06, 0.46, 0.17], [1.12, -0.46, 0.17]], { capStart: 'flat', capEnd: 'flat' }),
    ), w: 1.18,
  },
  noteheadDiamond: {
    d: `M0.59,-0.5L1.18,0L0.59,0.5L0,0Z M0.59,-0.30L0.94,0L0.59,0.30L0.24,0Z`,
    w: 1.18, rule: 'evenodd',
  },

  gClef: { d: buildGClef(), w: 2.7 },
  fClef: {
    d: joinPaths(
      circlePath(0.52, -0.52, 0.52),
      strokeOutline(F_CLEF_LINE, { capStart: 'flat' }),
      circlePath(2.46, -0.5, 0.19),
      circlePath(2.46, 0.5, 0.19),
    ), w: 2.8,
  },
  cClef: { d: C_CLEF, w: 2.0 },
  percClef: { d: PERC_CLEF, w: 1.1 },

  accidentalSharp: { d: SHARP, w: 0.96 },
  accidentalFlat: { d: FLAT, w: 1.0 },
  accidentalNatural: { d: NATURAL, w: 0.76 },
  accidentalDoubleSharp: { d: DOUBLE_SHARP, w: 1.04 },
  accidentalDoubleFlat: { d: DOUBLE_FLAT, w: 1.74 },
  accidentalQuarterSharp: { d: QUARTER_SHARP, w: 0.84 },

  restWhole: { d: WHOLE_REST, w: 1.30 },
  restHalf: { d: HALF_REST, w: 1.30 },
  restQuarter: { d: QUARTER_REST, w: 1.08 },
  restEighth: { d: flagRest(1), w: 1.10 },
  rest16th: { d: flagRest(2), w: 1.18 },
  rest32nd: { d: flagRest(3), w: 1.26 },
  rest64th: { d: flagRest(4), w: 1.34 },
  rest128th: { d: flagRest(5), w: 1.42 },
  restBreve: { d: rectPath(0, -0.5, 0.5, 1.0), w: 0.5 },

  articStaccato: { d: STACCATO, w: 0.34 },
  articStaccatissimo: { d: STACCATISSIMO, w: 0.34 },
  articTenuto: { d: TENUTO, w: 0.88 },
  articAccent: { d: ACCENT, w: 1.24 },
  articMarcato: { d: MARCATO, w: 0.84 },
  fermata: { d: FERMATA, w: 2.08 },
  fermataBelow: { d: FERMATA_BELOW, w: 2.08 },
  breathMark: { d: BREATH, w: 0.5 },
  caesura: { d: CAESURA, w: 1.1 },

  ornamentTrill: { d: TRILL, w: 1.34 },
  ornamentMordent: { d: MORDENT, w: 1.76 },
  ornamentMordentLower: { d: MORDENT_LOWER, w: 1.76 },
  ornamentTurn: { d: TURN, w: 1.9 },
  arpeggio: { d: ARPEGGIO_UNIT, w: 0.52, h: 1.0 },

  dynamicP: { d: DYN_P, w: 1.34 },
  dynamicF: { d: DYN_F, w: 1.42 },
  dynamicM: { d: DYN_M, w: 1.42 },
  dynamicS: { d: DYN_S, w: 0.84 },
  dynamicZ: { d: DYN_Z, w: 0.84 },
  dynamicR: { d: DYN_R, w: 0.86 },

  segno: { d: SEGNO, w: 1.6 },
  coda: { d: CODA, w: 1.72 },
  pedal: { d: PEDAL, w: 1.9 },
  pedalUp: { d: PEDAL_UP, w: 1.1 },

  timeSigCommon: { d: COMMON_TIME, w: 1.4 },
  timeSigCut: { d: CUT_TIME, w: 1.4 },
};

for (let i = 0; i <= 9; i++) GLYPHS['timeSig' + i] = { d: DIGITS[i], w: 1.25 };

export const FLAG_GLYPHS = {
  up: (n) => flags(n, false),
  down: (n) => flags(n, true),
};

export function glyph(name) {
  return GLYPHS[name] || null;
}

/** Dynamics are composed from their letters. */
export const DYNAMIC_LETTERS = { p: 'dynamicP', f: 'dynamicF', m: 'dynamicM', s: 'dynamicS', z: 'dynamicZ', r: 'dynamicR' };

export const DYNAMIC_MARKS = [
  { id: 'pppp', label: 'pppp', velocity: 12 }, { id: 'ppp', label: 'ppp', velocity: 20 },
  { id: 'pp', label: 'pp', velocity: 33 }, { id: 'p', label: 'p', velocity: 49 },
  { id: 'mp', label: 'mp', velocity: 64 }, { id: 'mf', label: 'mf', velocity: 80 },
  { id: 'f', label: 'f', velocity: 96 }, { id: 'ff', label: 'ff', velocity: 112 },
  { id: 'fff', label: 'fff', velocity: 122 }, { id: 'ffff', label: 'ffff', velocity: 127 },
  { id: 'sf', label: 'sf', velocity: 110, accent: true },
  { id: 'sfz', label: 'sfz', velocity: 118, accent: true },
  { id: 'fp', label: 'fp', velocity: 100, thenSoft: true },
  { id: 'sffz', label: 'sffz', velocity: 124, accent: true },
  { id: 'rfz', label: 'rfz', velocity: 112, accent: true },
];

export const DYNAMIC_BY_ID = Object.fromEntries(DYNAMIC_MARKS.map((d) => [d.id, d]));

export const ARTICULATIONS = [
  { id: 'staccato', glyph: 'articStaccato', label: 'Staccato', key: 'S', inside: true },
  { id: 'staccatissimo', glyph: 'articStaccatissimo', label: 'Staccatissimo', inside: true },
  { id: 'tenuto', glyph: 'articTenuto', label: 'Tenuto', key: 'T', inside: true },
  { id: 'accent', glyph: 'articAccent', label: 'Accent', key: 'V', inside: true },
  { id: 'marcato', glyph: 'articMarcato', label: 'Marcato', inside: false },
  { id: 'fermata', glyph: 'fermata', label: 'Fermata', key: 'F', inside: false, above: true },
];

export const ORNAMENTS = [
  { id: 'trill', glyph: 'ornamentTrill', label: 'Trill' },
  { id: 'mordent', glyph: 'ornamentMordent', label: 'Mordent' },
  { id: 'mordentLower', glyph: 'ornamentMordentLower', label: 'Lower mordent' },
  { id: 'turn', glyph: 'ornamentTurn', label: 'Turn' },
];
