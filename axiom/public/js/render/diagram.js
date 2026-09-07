import { h } from '../dom.js';
import { seriesColour } from './charts.js';

/**
 * Diagrams are rendered from a structured spec, never from model-authored SVG:
 * the model chooses what to show, this file decides how it looks. That keeps
 * markup out of the page and the visual language consistent across every
 * lesson.
 *
 * Marks follow the same rules as the charts — 2px connectors, nodes carrying a
 * 2px surface ring so overlaps stay readable, recessive chrome, and text in ink
 * tokens rather than the mark colour.
 */
const NS = 'http://www.w3.org/2000/svg';

let uid = 0;
const nextId = () => `ax${++uid}`;

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

function canvas(width, height) {
  return el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width: '100%',
    style: `max-height:${height}px`,
    role: 'img',
    preserveAspectRatio: 'xMidYMid meet',
  });
}

/** Shared defs: the arrowhead and a soft vertical wash for node fills. */
function defs(ids) {
  return el(
    'defs',
    {},
    el(
      'marker',
      { id: ids.arrow, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse' },
      el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--axis)' }),
    ),
    el(
      'linearGradient',
      { id: ids.wash, x1: '0', y1: '0', x2: '0', y2: '1' },
      el('stop', { offset: '0%', 'stop-color': 'var(--surface-3)' }),
      el('stop', { offset: '100%', 'stop-color': 'var(--surface-2)' }),
    ),
  );
}

function wrap(text, chars) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((`${line} ${word}`).trim().length > chars && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function label(text, x, y, opts = {}) {
  const {
    size = 12, weight = 500, fill = 'var(--ink)', anchor = 'middle', chars = 18, lineHeight = 14,
  } = opts;
  const lines = wrap(text, chars);
  const node = el('text', {
    x,
    y: y - ((lines.length - 1) * lineHeight) / 2,
    'text-anchor': anchor,
    'font-size': size,
    'font-weight': weight,
    fill,
    'font-family': 'var(--sans)',
    'letter-spacing': '-0.01em',
  });
  lines.forEach((line, i) => node.appendChild(el('tspan', { x, dy: i === 0 ? 0 : lineHeight }, line)));
  return node;
}

/* ------------------------------------------------------------------ flow */

function flowDiagram(spec, ids) {
  const nodes = spec.nodes.slice(0, 8);
  if (!nodes.length) return null;
  const boxW = 210;
  const boxH = 64;
  const gapY = 38;
  const width = 440;
  const height = nodes.length * (boxH + gapY) - gapY + 8;
  const svg = canvas(width, height);
  svg.appendChild(defs(ids));
  const x = (width - boxW) / 2;

  nodes.forEach((node, i) => {
    const y = i * (boxH + gapY);
    const colour = seriesColour(i);

    if (i < nodes.length - 1) {
      const edge = spec.edges.find((e) => e.from === node.id && e.to === nodes[i + 1].id);
      svg.appendChild(
        el('line', {
          x1: width / 2, y1: y + boxH + 4, x2: width / 2, y2: y + boxH + gapY - 5,
          stroke: 'var(--axis)', 'stroke-width': 2, 'stroke-linecap': 'round', 'marker-end': `url(#${ids.arrow})`,
        }),
      );
      if (edge?.label) {
        svg.appendChild(
          label(edge.label, width / 2 + 14, y + boxH + gapY / 2 + 3, {
            size: 10.5, weight: 500, fill: 'var(--ink-4)', anchor: 'start', chars: 22, lineHeight: 11,
          }),
        );
      }
    }

    svg.appendChild(el('rect', { x, y, width: boxW, height: boxH, rx: 13, fill: `url(#${ids.wash})`, stroke: 'var(--line-2)', 'stroke-width': 1 }));
    // A colour spine gives each step identity without tinting the whole card.
    svg.appendChild(el('rect', { x, y: y + 10, width: 3, height: boxH - 20, rx: 2, fill: colour }));
    svg.appendChild(
      label(node.label, x + 20, y + (node.detail ? boxH / 2 - 7 : boxH / 2 + 4), {
        size: 13, weight: 600, anchor: 'start', chars: 24, lineHeight: 15,
      }),
    );
    if (node.detail) {
      svg.appendChild(
        label(node.detail, x + 20, y + boxH / 2 + 14, {
          size: 11, weight: 400, fill: 'var(--ink-3)', anchor: 'start', chars: 32, lineHeight: 12,
        }),
      );
    }
  });
  return svg;
}

/* ----------------------------------------------------------------- cycle */

function cycleDiagram(spec, ids) {
  const nodes = spec.nodes.slice(0, 7);
  if (nodes.length < 2) return flowDiagram(spec, ids);
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 138;
  const svg = canvas(size, size);
  svg.appendChild(defs(ids));

  svg.appendChild(el('circle', { cx, cy, r: radius, fill: 'none', stroke: 'var(--grid)', 'stroke-width': 1 }));

  const points = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle };
  });

  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    const mid = point.angle + Math.PI / nodes.length;
    svg.appendChild(
      el('path', {
        d:
          `M ${point.x + 38 * Math.cos(point.angle + 0.42)} ${point.y + 38 * Math.sin(point.angle + 0.42)} ` +
          `Q ${cx + radius * 1.2 * Math.cos(mid)} ${cy + radius * 1.2 * Math.sin(mid)} ` +
          `${next.x + 38 * Math.cos(next.angle - 0.52)} ${next.y + 38 * Math.sin(next.angle - 0.52)}`,
        fill: 'none', stroke: 'var(--axis)', 'stroke-width': 2, 'stroke-linecap': 'round',
        'marker-end': `url(#${ids.arrow})`,
      }),
    );
  });

  points.forEach((point, i) => {
    const colour = seriesColour(i);
    svg.appendChild(el('circle', { cx: point.x, cy: point.y, r: 37, fill: 'var(--surface)', stroke: colour, 'stroke-width': 2 }));
    svg.appendChild(el('circle', { cx: point.x, cy: point.y, r: 37, fill: colour, opacity: 0.1 }));
    svg.appendChild(label(nodes[i].label, point.x, point.y + 4, { size: 11, weight: 600, chars: 12, lineHeight: 12 }));
  });
  return svg;
}

/* ---------------------------------------------------------- concept map */

function conceptMap(spec, ids) {
  const nodes = spec.nodes.slice(0, 9);
  if (!nodes.length) return null;
  const width = 460;
  const height = 400;
  const cx = width / 2;
  const cy = 198;
  const svg = canvas(width, height);
  svg.appendChild(defs(ids));

  const [root, ...rest] = nodes;
  const positions = new Map([[root.id, { x: cx, y: cy }]]);
  rest.forEach((node, i) => {
    const angle = (i / Math.max(1, rest.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, { x: cx + 158 * Math.cos(angle), y: cy + 132 * Math.sin(angle) });
  });

  const edges = spec.edges.length ? spec.edges : rest.map((n) => ({ from: root.id, to: n.id, label: '' }));
  for (const edge of edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    svg.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: 'var(--line-2)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    if (edge.label) {
      svg.appendChild(
        label(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 4, {
          size: 9.5, fill: 'var(--ink-4)', chars: 15, lineHeight: 10,
        }),
      );
    }
  }

  nodes.forEach((node, i) => {
    const point = positions.get(node.id);
    const isRoot = i === 0;
    const w = isRoot ? 158 : 126;
    const hgt = isRoot ? 48 : 40;
    svg.appendChild(
      el('rect', {
        x: point.x - w / 2, y: point.y - hgt / 2, width: w, height: hgt, rx: 12,
        fill: isRoot ? 'var(--brand-wash)' : `url(#${ids.wash})`,
        stroke: isRoot ? 'var(--brand)' : 'var(--line-2)',
        'stroke-width': isRoot ? 1.6 : 1,
      }),
    );
    svg.appendChild(
      label(node.label, point.x, point.y + 4, {
        size: isRoot ? 12.5 : 11, weight: isRoot ? 650 : 550, chars: isRoot ? 18 : 16, lineHeight: 12,
      }),
    );
  });
  return svg;
}

/* -------------------------------------------------------------- timeline */

function timelineDiagram(spec, ids) {
  const items = spec.items.slice(0, 9);
  if (!items.length) return null;
  const rowH = 78;
  const width = 480;
  const height = items.length * rowH + 12;
  const svg = canvas(width, height);
  svg.appendChild(defs(ids));

  svg.appendChild(el('line', { x1: 86, y1: 16, x2: 86, y2: height - 26, stroke: 'var(--grid)', 'stroke-width': 2, 'stroke-linecap': 'round' }));

  items.forEach((item, i) => {
    const y = 28 + i * rowH;
    const colour = seriesColour(i);
    svg.appendChild(el('circle', { cx: 86, cy: y, r: 6.5, fill: colour, stroke: 'var(--surface)', 'stroke-width': 2 }));
    svg.appendChild(label(item.when, 68, y + 4, { size: 11, weight: 650, anchor: 'end', fill: 'var(--ink-3)', chars: 13, lineHeight: 12 }));
    svg.appendChild(label(item.label, 108, y + (item.detail ? -3 : 4), { size: 13, weight: 600, anchor: 'start', chars: 38, lineHeight: 14 }));
    if (item.detail) {
      svg.appendChild(
        label(item.detail, 108, y + 17, { size: 11, weight: 400, anchor: 'start', fill: 'var(--ink-3)', chars: 46, lineHeight: 12 }),
      );
    }
  });
  return svg;
}

/* ------------------------------------------------------------------- bar */

function barDiagram(spec) {
  const series = spec.series.slice(0, 10);
  if (!series.length) return null;
  const width = 460;
  const rowH = 36;
  const height = series.length * rowH + 14;
  const max = Math.max(...series.map((s) => Math.abs(s.value)), 1);
  const svg = canvas(width, height);
  const labelW = 130;
  const plot = width - labelW - 52;

  series.forEach((entry, i) => {
    const y = i * rowH + 9;
    const barW = Math.max(3, (plot * Math.abs(entry.value)) / max);
    svg.appendChild(label(entry.label, labelW - 12, y + 15, { size: 11.5, anchor: 'end', fill: 'var(--ink-3)', chars: 18, lineHeight: 12 }));
    svg.appendChild(el('rect', { x: labelW, y: y + 3, width: plot, height: 18, rx: 4, fill: 'var(--grid)' }));
    svg.appendChild(
      el('path', {
        d: `M${labelW},${y + 3} H${labelW + barW - 4} A4,4 0 0 1 ${labelW + barW},${y + 7}
            V${y + 17} A4,4 0 0 1 ${labelW + barW - 4},${y + 21} H${labelW} Z`,
        fill: seriesColour(i),
      }),
    );
    svg.appendChild(label(String(entry.value), labelW + barW + 9, y + 16, { size: 11, anchor: 'start', fill: 'var(--ink-3)', chars: 9 }));
  });
  return svg;
}

/* -------------------------------------------------------- function graph */

function functionGraph(spec, ids) {
  const points = spec.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length < 2) return null;
  const width = 460;
  const height = 300;
  const pad = 46;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (width - pad * 2);
  const sy = (y) => height - pad - ((y - minY) / (maxY - minY || 1)) * (height - pad * 2);
  const svg = canvas(width, height);

  const fill = el('linearGradient', { id: ids.fill, x1: '0', y1: '0', x2: '0', y2: '1' });
  fill.appendChild(el('stop', { offset: '0%', 'stop-color': 'var(--s1)', 'stop-opacity': 0.22 }));
  fill.appendChild(el('stop', { offset: '100%', 'stop-color': 'var(--s1)', 'stop-opacity': 0 }));
  svg.appendChild(el('defs', {}, fill));

  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (height - pad * 2)) / 4;
    svg.appendChild(el('line', { x1: pad, y1: y, x2: width - pad, y2: y, stroke: 'var(--grid)', 'stroke-width': 1 }));
  }
  if (minY < 0 && maxY > 0) svg.appendChild(el('line', { x1: pad, y1: sy(0), x2: width - pad, y2: sy(0), stroke: 'var(--axis)', 'stroke-width': 1.5 }));
  if (minX < 0 && maxX > 0) svg.appendChild(el('line', { x1: sx(0), y1: pad, x2: sx(0), y2: height - pad, stroke: 'var(--axis)', 'stroke-width': 1.5 }));

  const ordered = points.slice().sort((a, b) => a.x - b.x);
  const line = ordered.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

  svg.appendChild(
    el('path', {
      d: `${line} L ${sx(ordered.at(-1).x)} ${sy(minY)} L ${sx(ordered[0].x)} ${sy(minY)} Z`,
      fill: `url(#${ids.fill})`, stroke: 'none',
    }),
  );
  svg.appendChild(el('path', { d: line, fill: 'none', stroke: 'var(--s1)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

  for (const point of points) {
    if (!point.label) continue;
    svg.appendChild(el('circle', { cx: sx(point.x), cy: sy(point.y), r: 4.5, fill: 'var(--s1)', stroke: 'var(--surface)', 'stroke-width': 2 }));
    svg.appendChild(label(point.label, sx(point.x), sy(point.y) - 12, { size: 10.5, fill: 'var(--ink-3)', chars: 16 }));
  }

  svg.appendChild(label(spec.x_label || 'x', width / 2, height - 12, { size: 11, fill: 'var(--ink-4)', chars: 30 }));
  const yLabel = label(spec.y_label || 'y', 0, 0, { size: 11, fill: 'var(--ink-4)', chars: 30 });
  yLabel.setAttribute('transform', `translate(16 ${height / 2}) rotate(-90)`);
  svg.appendChild(yLabel);
  return svg;
}

/* ------------------------------------------------------------ comparison */

function comparisonTable(spec) {
  if (!spec.columns.length) return null;
  return h(
    'div',
    { style: { overflowX: 'auto', width: '100%' } },
    h(
      'table.cmp-table',
      {},
      h('thead', {}, h('tr', {}, ...spec.columns.map((c) => h('th', {}, c)))),
      h('tbody', {}, ...spec.rows.map((row) => h('tr', {}, ...spec.columns.map((_, i) => h('td', {}, row[i] ?? ''))))),
    ),
  );
}

const RENDERERS = {
  flow: flowDiagram,
  cycle: cycleDiagram,
  concept_map: conceptMap,
  timeline: timelineDiagram,
  bar: barDiagram,
  function_graph: functionGraph,
  comparison: comparisonTable,
};

export function renderDiagram(spec) {
  if (!spec || !spec.type) return null;
  const build = RENDERERS[spec.type] || flowDiagram;
  const ids = { arrow: nextId(), wash: nextId(), fill: nextId() };
  let body;
  try {
    body = build(spec, ids);
  } catch {
    body = null;
  }
  if (!body) return null;

  return h(
    'figure.diagram',
    {},
    spec.title ? h('figcaption.diagram-title', {}, spec.title) : null,
    h('div.diagram-body', {}, body),
    spec.caption ? h('figcaption.diagram-caption', {}, spec.caption) : null,
  );
}
