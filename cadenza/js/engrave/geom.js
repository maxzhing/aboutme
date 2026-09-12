/* Cadenza — path construction helpers.
 *
 * All glyph geometry is expressed in staff spaces, with y increasing downward
 * (SVG convention).  The renderer scales by the current spatium, so a glyph
 * drawn here is resolution independent.
 */

const R = (n) => Math.round(n * 1000) / 1000;

/**
 * Closed path for an ellipse rotated by `theta` radians about its centre.
 * `reverse` winds the other way, which turns the shape into a hole when it is
 * combined with an enclosing path under the nonzero fill rule.
 */
export function ellipsePath(cx, cy, a, b, theta = 0, reverse = false) {
  const K = 0.5522847498307936; // circle-to-cubic constant
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const tx = (x, y) => [R(cx + x * cos - y * sin), R(cy + x * sin + y * cos)];
  let pts = [
    [a, 0], [a, b * K], [a * K, b], [0, b],
    [-a * K, b], [-a, b * K], [-a, 0],
    [-a, -b * K], [-a * K, -b], [0, -b],
    [a * K, -b], [a, -b * K], [a, 0],
  ];
  if (reverse) pts = pts.slice().reverse();
  pts = pts.map(([x, y]) => tx(x, y));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 3) {
    d += `C${pts[i][0]},${pts[i][1]} ${pts[i + 1][0]},${pts[i + 1][1]} ${pts[i + 2][0]},${pts[i + 2][1]}`;
  }
  return d + 'Z';
}

export function circlePath(cx, cy, r, reverse = false) {
  return ellipsePath(cx, cy, r, r, 0, reverse);
}

/** An annulus: outer ring plus a reversed inner ring that punches the hole. */
export function ringPath(cx, cy, rx, ry, t) {
  return ellipsePath(cx, cy, rx, ry, 0) + ellipsePath(cx, cy, rx - t, ry - t, 0, true);
}

export function rectPath(x, y, w, h) {
  return `M${R(x)},${R(y)}H${R(x + w)}V${R(y + h)}H${R(x)}Z`;
}

/** Closed path through points, smoothed with a Catmull-Rom spline. */
export function smoothPath(pts, closed = false, tension = 1) {
  if (pts.length < 2) return '';
  const p = pts.map(([x, y]) => [x, y]);
  const n = p.length;
  const at = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${R(p[0][0])},${R(p[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${R(c1[0])},${R(c1[1])} ${R(c2[0])},${R(c2[1])} ${R(p2[0])},${R(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/**
 * Turn a calligraphic centreline into a filled outline.
 * `pts` is a list of [x, y, width] samples; the pen is centred on the line and
 * held perpendicular to it, which is what gives the strokes of a clef their
 * thick-and-thin character.
 */
export function strokeOutline(pts, { capStart = 'round', capEnd = 'round' } = {}) {
  const n = pts.length;
  if (n < 2) return '';
  const normals = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    normals.push([-dy, dx]);
  }
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const [x, y, w] = pts[i];
    const [nx, ny] = normals[i];
    const h = w / 2;
    left.push([x + nx * h, y + ny * h]);
    right.push([x - nx * h, y - ny * h]);
  }
  right.reverse();
  /* Round caps: nudge in an extra point so the spline bulges over the end. */
  const capA = capStart === 'round' ? capPoints(pts[0], normals[0], -1) : [];
  const capB = capEnd === 'round' ? capPoints(pts[n - 1], normals[n - 1], 1) : [];
  const ring = [...left, ...capB, ...right, ...capA];
  return smoothPath(ring, true, 0.9);
}

function capPoints(pt, normal, dir) {
  const [x, y, w] = pt;
  const h = w / 2;
  const tx = normal[1] * dir;
  const ty = -normal[0] * dir;
  return [[x + tx * h * 1.02, y + ty * h * 1.02]];
}

/**
 * Sample a spiral — the backbone of a G clef.  The radius shrinks linearly
 * with angle (an Archimedean spiral), which is what a scribe's hand actually
 * produces; a logarithmic one collapses far too quickly to read as a clef.
 */
export function spiralPoints(cx, cy, r0, r1, a0, a1, steps, w0, w1) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const r = r0 + (r1 - r0) * t;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), w0 + (w1 - w0) * t]);
  }
  return out;
}

/** Scale/translate a list of centreline samples. */
export function xform(pts, { sx = 1, sy = 1, dx = 0, dy = 0, sw = 1 } = {}) {
  return pts.map(([x, y, w]) => [x * sx + dx, y * sy + dy, w === undefined ? undefined : w * sw]);
}

export function joinPaths(...paths) {
  return paths.filter(Boolean).join(' ');
}

/** Bounding box of a list of [x, y, w] samples, allowing for stroke width. */
export function boundsOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, w = 0] of pts) {
    x0 = Math.min(x0, x - w / 2); x1 = Math.max(x1, x + w / 2);
    y0 = Math.min(y0, y - w / 2); y1 = Math.max(y1, y + w / 2);
  }
  return { x0, y0, x1, y1 };
}
