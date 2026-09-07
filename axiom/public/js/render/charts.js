import { h, clear } from '../dom.js';
import { icon } from '../icons.js';

/**
 * Chart components.
 *
 * Colour here is assigned by the job it does, not by taste:
 *   · mastery 0-5 is ordered magnitude  → one-hue ordinal ramp (--m0..--m5)
 *   · concept identity                  → the validated categorical order (--s1..--s8)
 *   · good / warning / serious / critical → the reserved status palette, always
 *     shipped with an icon or a label so state never rides on colour alone.
 *
 * Marks follow one spec everywhere: bars capped at 24px with a 4px rounded
 * data-end and a square baseline, a 2px surface gap between touching marks,
 * 2px lines, markers of at least 8px carrying a 2px surface ring, hairline
 * recessive gridlines, and selective direct labels rather than a number on
 * every mark.
 */

const NS = 'http://www.w3.org/2000/svg';
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
export const MASTERY_STEPS = ['var(--m0)', 'var(--m1)', 'var(--m2)', 'var(--m3)', 'var(--m4)', 'var(--m5)'];
export const MASTERY_LABELS = ['Not introduced', 'Introduced', 'Developing', 'Competent', 'Strong', 'Mastered'];

const BAR_MAX = 24;
const GAP = 2; // the surface gap that does the separating

export const seriesColour = (index) => SERIES[index % SERIES.length];
export const masteryColour = (level) => MASTERY_STEPS[Math.max(0, Math.min(5, Math.round(level)))];

function el(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child != null) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function svgRoot(width, height, { label } = {}) {
  return el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width: '100%',
    style: `max-height:${height}px`,
    role: 'img',
    'aria-label': label || '',
    preserveAspectRatio: 'xMinYMid meet',
  });
}

/**
 * A bar whose data-end is rounded 4px and whose baseline end stays square.
 * Drawn as a path so the two ends can differ.
 */
function barPath(x, y, w, hgt, r, horizontal) {
  const radius = Math.max(0, Math.min(r, horizontal ? w : hgt));
  if (horizontal) {
    return `M${x},${y} H${x + w - radius} A${radius},${radius} 0 0 1 ${x + w},${y + radius}
            V${y + hgt - radius} A${radius},${radius} 0 0 1 ${x + w - radius},${y + hgt} H${x} Z`;
  }
  return `M${x},${y + hgt} V${y + radius} A${radius},${radius} 0 0 1 ${x + radius},${y}
          H${x + w - radius} A${radius},${radius} 0 0 1 ${x + w},${y + radius} V${y + hgt} Z`;
}

/* ------------------------------------------------------------------ tooltip */

let tipNode;

function showTip(event, html) {
  if (!tipNode) {
    tipNode = h('div.viz-tip');
    document.body.appendChild(tipNode);
  }
  tipNode.innerHTML = html;
  tipNode.style.display = 'block';
  moveTip(event);
}

function moveTip(event) {
  if (!tipNode) return;
  const pad = 14;
  const rect = tipNode.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
  tipNode.style.left = `${Math.max(8, x)}px`;
  tipNode.style.top = `${Math.max(8, y)}px`;
}

function hideTip() {
  if (tipNode) tipNode.style.display = 'none';
}

/** Attach the hover layer to a mark. Hit target is the mark plus padding. */
function hoverable(node, html) {
  node.classList.add('viz-mark');
  node.addEventListener('pointerenter', (event) => showTip(event, html));
  node.addEventListener('pointermove', moveTip);
  node.addEventListener('pointerleave', hideTip);
  node.addEventListener('pointercancel', hideTip);
  return node;
}

/* ------------------------------------------------------------------ shell */

function vizShell({ title, note, body, legendItems, table }) {
  const root = h('figure.viz');
  if (title || note) {
    root.appendChild(
      h('figcaption.viz-head', {}, title ? h('span.viz-title', {}, title) : null, note ? h('span.viz-note', {}, note) : null),
    );
  }
  root.appendChild(body);
  if (legendItems?.length) root.appendChild(legend(legendItems));
  if (table) root.appendChild(tableToggle(table));
  return root;
}

/** Identity is never colour-alone: every multi-series chart carries a legend. */
export function legend(items) {
  return h(
    'div.viz-legend',
    {},
    ...items.map((item) =>
      h(
        'span.viz-legend-item',
        {},
        h('span.viz-swatch', { style: { background: item.colour } }),
        h('span', {}, item.label),
      ),
    ),
  );
}

/** Every chart ships an equivalent table — the non-visual read of the data. */
export function tableToggle({ columns, rows, label = 'Show the numbers' }) {
  const host = h('div');
  let open = false;
  const button = h(
    'button.btn.sm.ghost',
    {
      type: 'button',
      onClick: () => {
        open = !open;
        button.lastChild.textContent = open ? 'Hide the numbers' : label;
        clear(host);
        if (open) {
          host.appendChild(
            h(
              'table.viz-table',
              {},
              h('thead', {}, h('tr', {}, ...columns.map((c) => h('th', {}, c)))),
              h('tbody', {}, ...rows.map((row) => h('tr', {}, ...row.map((cell) => h('td', {}, String(cell)))))),
            ),
          );
        }
      },
    },
    icon('library', { size: 12 }),
    document.createTextNode(label),
  );
  return h('div', { style: { display: 'grid', gap: '8px', justifyItems: 'start' } }, button, host);
}

/* ------------------------------------------------------------- stat tiles */

/**
 * label · value · a neutral supporting line · an optional status flag.
 *
 * `delta` is descriptive text and stays in ink. `status` is the reserved
 * palette and therefore always ships with an icon as well as its colour —
 * state never rides on colour alone. A count is not a delta, so it never
 * gets a direction arrow.
 */
export function statTile({ label, value, delta, status, trend, wide = false }) {
  const STATUS_ICON = { good: 'checkCircle', warning: 'alert', critical: 'alert' };
  return h(
    `div.stat${wide ? '.is-wide' : ''}`,
    {},
    h('span.stat-label', {}, label),
    h('span.stat-value', {}, String(value)),
    delta ? h('span.stat-delta', {}, delta) : null,
    status
      ? h(
          'span',
          { class: `stat-delta is-${status.kind}` },
          icon(STATUS_ICON[status.kind] || 'info', { size: 12 }),
          status.text,
        )
      : null,
    trend?.length > 1 ? h('div.stat-spark', {}, sparkline(trend)) : null,
  );
}

/** 12-point trend line: de-emphasised history, accent on the current point. */
export function sparkline(values, { width = 132, height = 30, colour = 'var(--brand)' } = {}) {
  const points = values.slice(-12);
  if (points.length < 2) return h('div');
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const x = (i) => i * step;
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6);

  const svg = svgRoot(width, height, { label: 'Recent trend' });
  const path = points.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  svg.appendChild(
    el('path', {
      d: `${path} L ${width} ${height} L 0 ${height} Z`,
      fill: colour,
      opacity: 0.1,
      stroke: 'none',
    }),
  );
  svg.appendChild(
    el('path', { d: path, fill: 'none', stroke: colour, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55 }),
  );
  // Current point: >=8px marker with a 2px surface ring.
  svg.appendChild(el('circle', { cx: x(points.length - 1), cy: y(points.at(-1)), r: 4, fill: colour, stroke: 'var(--surface)', 'stroke-width': 2 }));
  return svg;
}

/* ---------------------------------------------------------------- meters */

/**
 * Mastery meter. The fill is the ordinal step for the level; the track is a
 * lighter step of the same ramp, so state reads across the whole bar.
 */
export function masteryMeter(level, label, { detail } = {}) {
  const clamped = Math.max(0, Math.min(5, level));
  return h(
    'div.meter',
    {},
    h(
      'div.meter-top',
      {},
      h('b', {}, label),
      h('span', {}, detail || `${MASTERY_LABELS[Math.round(clamped)]} · ${clamped}/5`),
    ),
    h(
      'div.meter-track',
      { role: 'meter', 'aria-valuenow': clamped, 'aria-valuemin': 0, 'aria-valuemax': 5, 'aria-label': `${label} mastery` },
      h('div.meter-fill', { style: { width: `${(clamped / 5) * 100}%`, background: masteryColour(clamped) } }),
    ),
  );
}

/** Five ordinal steps. Filled steps take the ramp colour for the level reached. */
export function masteryPips(level) {
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  return h(
    'span.pips',
    { title: `${MASTERY_LABELS[clamped]} (${clamped} of 5)`, 'aria-label': `${MASTERY_LABELS[clamped]}, ${clamped} of 5` },
    ...Array.from({ length: 5 }, (_, i) =>
      h('span.pip', { style: i < clamped ? { background: masteryColour(clamped) } : {} }),
    ),
  );
}

/* -------------------------------------------------------------- bar chart */

/**
 * Horizontal bars. `rows` is [{ label, value, max?, colour?, note? }].
 * Direct labels are selective: the value sits at the data-end, the category on
 * the left, and nothing else competes.
 */
export function barChart(rows, options = {}) {
  const {
    title,
    note,
    labelWidth = 132,
    valueWidth = 52,
    width = 520,
    max = Math.max(...rows.map((r) => r.max ?? r.value), 1),
    colour = 'var(--s1)',
    format = (v) => String(v),
    tip = (row) => `<b>${row.label}</b><span>${format(row.value)}</span>`,
    legendItems,
    table = true,
  } = options;

  const rowHeight = BAR_MAX + 12;
  const height = Math.max(rowHeight, rows.length * rowHeight);
  const plotWidth = Math.max(60, width - labelWidth - valueWidth);
  const svg = svgRoot(width, height, { label: title || 'Bar chart' });

  rows.forEach((row, i) => {
    const y = i * rowHeight + 6;
    const barH = Math.min(BAR_MAX, rowHeight - 12);
    const value = Math.max(0, row.value);
    const rowMax = row.max ?? max;
    const w = rowMax > 0 ? Math.max(GAP, (value / rowMax) * plotWidth) : 0;

    svg.appendChild(
      el(
        'text',
        {
          x: labelWidth - 12, y: y + barH / 2 + 4, 'text-anchor': 'end',
          class: 'viz-axis-label', fill: 'var(--ink-3)', 'font-size': 12,
        },
        row.label.length > 20 ? `${row.label.slice(0, 19)}…` : row.label,
      ),
    );
    // Track first, then the fill: the 2px surface gap is the track showing through.
    svg.appendChild(el('rect', { x: labelWidth, y, width: plotWidth, height: barH, rx: 4, fill: 'var(--grid)' }));
    const bar = el('path', { d: barPath(labelWidth, y, w, barH, 4, true), fill: row.colour || colour });
    svg.appendChild(hoverable(bar, tip(row)));
    svg.appendChild(
      el(
        'text',
        { x: labelWidth + plotWidth + 10, y: y + barH / 2 + 4, class: 'viz-value', 'font-size': 11.5 },
        format(row.value),
      ),
    );
  });

  return vizShell({
    title,
    note,
    body: h('div', {}, svg),
    legendItems,
    table: table && rows.length
      ? { columns: ['Item', 'Value'], rows: rows.map((r) => [r.label, format(r.value)]) }
      : null,
  });
}

/* ------------------------------------------------- mastery distribution */

/**
 * How the learner's concepts are distributed across the six mastery levels.
 * Ordered magnitude, so it uses the ordinal ramp, and level 0 is the neutral
 * "no data yet" step rather than a colour on the scale.
 */
export function masteryDistribution(counts, { total } = {}) {
  const sum = total ?? counts.reduce((a, b) => a + b, 0);
  const width = 520;
  const columnW = Math.min(BAR_MAX, Math.floor(width / 6) - 18);
  const height = 168;
  const base = height - 30;
  const max = Math.max(...counts, 1);
  const svg = svgRoot(width, height, { label: 'Concepts by mastery level' });

  // Integer ticks only, de-duplicated: a count axis has no fractional values.
  const tickStep = Math.max(1, Math.ceil(max / 4));
  for (let value = 0; value <= max; value += tickStep) {
    const y = base - (value / max) * (base - 20);
    svg.appendChild(el('line', { x1: 30, y1: y, x2: width - 8, y2: y, stroke: 'var(--grid)', 'stroke-width': 1 }));
    svg.appendChild(el('text', { x: 22, y: y + 4, 'text-anchor': 'end', class: 'viz-value', 'font-size': 10.5 }, String(value)));
  }
  svg.appendChild(el('line', { x1: 30, y1: base, x2: width - 8, y2: base, stroke: 'var(--axis)', 'stroke-width': 1 }));

  const slot = (width - 46) / 6;
  counts.forEach((count, level) => {
    const x = 34 + level * slot + (slot - columnW) / 2;
    const barH = max > 0 ? Math.max(count ? 3 : 0, (count / max) * (base - 20)) : 0;
    if (barH > 0) {
      const bar = el('path', {
        d: barPath(x, base - barH, columnW, barH, 4, false),
        fill: masteryColour(level),
        // Level 0 is the absence of data, so its step recedes toward the
        // surface; a hairline keeps it legible without promoting it.
        stroke: level === 0 ? 'var(--axis)' : 'none',
        'stroke-width': level === 0 ? 1 : 0,
      });
      svg.appendChild(
        hoverable(
          bar,
          `<b>${MASTERY_LABELS[level]}</b><span>${count} concept${count === 1 ? '' : 's'}${sum ? ` · ${Math.round((count / sum) * 100)}%` : ''}</span>`,
        ),
      );
    }
    svg.appendChild(
      el('text', { x: x + columnW / 2, y: base + 15, 'text-anchor': 'middle', class: 'viz-axis-label', 'font-size': 11 }, String(level)),
    );
    if (count > 0) {
      svg.appendChild(
        el('text', { x: x + columnW / 2, y: base - barH - 7, 'text-anchor': 'middle', class: 'viz-value', 'font-size': 11.5 }, String(count)),
      );
    }
  });
  svg.appendChild(
    el('text', { x: width / 2, y: height - 4, 'text-anchor': 'middle', class: 'viz-axis-label', 'font-size': 10.5 }, 'Mastery level (0 = not introduced, 5 = mastered)'),
  );

  return vizShell({
    title: 'Where your concepts sit',
    note: `${sum} tracked`,
    body: h('div', {}, svg),
    table: {
      columns: ['Level', 'Meaning', 'Concepts'],
      rows: counts.map((c, i) => [i, MASTERY_LABELS[i], c]),
    },
  });
}

/* --------------------------------------------------------- concept field */

/**
 * A concept field: one dot per concept, radius by attempts, fill by mastery
 * step, ringed in the surface colour so overlaps stay readable. Position is
 * deterministic (subject band × mastery) rather than random, so the picture is
 * stable between renders.
 */
export function conceptField(concepts, { onSelect } = {}) {
  if (!concepts.length) return null;
  const width = 560;
  const height = 252;
  const padX = 54;
  const padY = 26;
  const maxAttempts = Math.max(...concepts.map((c) => c.attempts || 0), 1);

  const svg = svgRoot(width, height, { label: 'Concepts by mastery and practice' });

  for (let level = 0; level <= 5; level++) {
    const x = padX + (level / 5) * (width - padX - 20);
    svg.appendChild(el('line', { x1: x, y1: padY - 12, x2: x, y2: height - padY, stroke: 'var(--grid)', 'stroke-width': 1 }));
    svg.appendChild(el('text', { x, y: height - padY + 16, 'text-anchor': 'middle', class: 'viz-axis-label', 'font-size': 10.5 }, String(level)));
  }
  svg.appendChild(el('text', { x: (width + padX) / 2, y: height - 3, 'text-anchor': 'middle', class: 'viz-axis-label', 'font-size': 10.5 }, 'Mastery level'));
  const yLabel = el('text', { class: 'viz-axis-label', 'font-size': 10.5, 'text-anchor': 'middle' }, 'Attempts');
  yLabel.setAttribute('transform', `translate(13 ${(height - padY) / 2}) rotate(-90)`);
  svg.appendChild(yLabel);

  concepts.slice(0, 60).forEach((concept, i) => {
    const level = Math.max(0, Math.min(5, concept.mastery_level || 0));
    const jitter = ((i * 37) % 11) - 5;
    const x = padX + (level / 5) * (width - padX - 20) + jitter;
    const attempts = concept.attempts || 0;
    const y = height - padY - (attempts / maxAttempts) * (height - padY * 2 - 10) - 8;
    const r = Math.max(5, Math.min(13, 5 + Math.sqrt(attempts) * 2.2));

    const dot = el('circle', {
      cx: Math.max(padX, Math.min(width - 24, x)),
      cy: Math.max(padY, y),
      r,
      fill: masteryColour(level),
      stroke: 'var(--surface)',
      'stroke-width': 2,
      style: onSelect ? 'cursor:pointer' : '',
    });
    hoverable(
      dot,
      `<b>${concept.name}</b><span>${MASTERY_LABELS[level]} · ${attempts} attempt${attempts === 1 ? '' : 's'}` +
        `${concept.attempts ? ` · ${Math.round(((concept.correct ?? 0) / concept.attempts) * 100)}% correct` : ''}</span>`,
    );
    if (onSelect) dot.addEventListener('click', () => onSelect(concept));
    svg.appendChild(dot);
  });

  return vizShell({
    title: 'Concept field',
    note: 'dot size = practice volume',
    body: h('div', {}, svg),
    legendItems: [1, 3, 5].map((level) => ({ colour: masteryColour(level), label: MASTERY_LABELS[level] })),
    table: {
      columns: ['Concept', 'Level', 'Attempts', 'Accuracy'],
      rows: concepts
        .slice(0, 60)
        .map((c) => [
          c.name,
          MASTERY_LABELS[Math.max(0, Math.min(5, c.mastery_level || 0))],
          c.attempts || 0,
          c.attempts ? `${Math.round(((c.correct ?? 0) / c.attempts) * 100)}%` : '—',
        ]),
    },
  });
}

/* -------------------------------------------------------------- score ring */

/** The hero figure for a graded paper. Sans, proportional figures, one per view. */
export function scoreRing(score, max, { size = 104 } = {}) {
  const ratio = max ? Math.max(0, Math.min(1, score / max)) : 0;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const colour = ratio >= 0.8 ? 'var(--good)' : ratio >= 0.5 ? 'var(--warning)' : 'var(--critical)';

  const svg = svgRoot(size, size, { label: `Score ${score} out of ${max}` });
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));

  svg.appendChild(el('circle', { cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: 'var(--grid)', 'stroke-width': 8 }));
  svg.appendChild(
    el('circle', {
      cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: colour, 'stroke-width': 8,
      'stroke-linecap': 'round', 'stroke-dasharray': circumference,
      'stroke-dashoffset': circumference * (1 - ratio),
      style: 'transition: stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)',
    }),
  );

  return h(
    'div.score-ring',
    { style: { width: `${size}px`, height: `${size}px` } },
    svg,
    h('div.value', {}, h('b', {}, `${Math.round(ratio * 100)}%`), h('span', {}, `${score}/${max}`)),
  );
}

/* ------------------------------------------------------------ difficulty */

/** Which items were right, in the order they were asked, sized by difficulty. */
export function itemStrip(items) {
  if (!items.length) return null;
  const width = 520;
  const height = 74;
  const slot = Math.min(34, (width - 12) / items.length);
  const svg = svgRoot(width, height, { label: 'Result by question' });

  items.forEach((item, i) => {
    const x = 6 + i * slot;
    const w = Math.max(6, slot - GAP);
    const barH = 14 + (Math.max(1, Math.min(5, item.difficulty || 3)) - 1) * 9;
    const y = height - 22 - barH;
    const colour = item.correct ? 'var(--good)' : 'var(--critical)';
    const bar = el('path', { d: barPath(x, y, w, barH, 4, false), fill: colour, opacity: item.correct ? 1 : 0.9 });
    svg.appendChild(
      hoverable(bar, `<b>Question ${i + 1}</b><span>Difficulty ${item.difficulty} · ${item.correct ? 'correct' : 'missed'}</span>`),
    );
    if (items.length <= 20) {
      svg.appendChild(el('text', { x: x + w / 2, y: height - 6, 'text-anchor': 'middle', class: 'viz-axis-label', 'font-size': 10 }, String(i + 1)));
    }
  });

  return vizShell({
    title: 'Result by question',
    note: 'bar height = difficulty',
    body: h('div', {}, svg),
    legendItems: [
      { colour: 'var(--good)', label: 'Correct' },
      { colour: 'var(--critical)', label: 'Missed' },
    ],
    table: {
      columns: ['Question', 'Difficulty', 'Result'],
      rows: items.map((item, i) => [i + 1, item.difficulty, item.correct ? 'Correct' : 'Missed']),
    },
  });
}

/** Small helper for a labelled progress row used outside chart contexts. */
export function barRow(label, value, total, colour = 'var(--s1)') {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return h(
    'div.meter',
    {},
    h('div.meter-top', {}, h('b', {}, label), h('span', {}, `${value}/${total}`)),
    h('div.meter-track', {}, h('div.meter-fill', { style: { width: `${pct}%`, background: colour } })),
  );
}

export { hideTip };
