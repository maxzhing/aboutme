import { h } from '../dom.js';

/**
 * Diagrams are rendered from a structured spec rather than model-authored SVG:
 * the model chooses what to show, this file decides how it looks.
 */
const NS = 'http://www.w3.org/2000/svg';
const PALETTE = ['var(--accent)', 'var(--mint)', 'var(--violet)', 'var(--amber)', 'var(--cyan)', 'var(--rose)'];

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
  const node = el('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width: '100%',
    style: `max-height:${height}px;overflow:visible`,
    role: 'img',
  });
  return node;
}

/** Wrap text to a pixel width, returning tspan lines. */
function wrap(text, chars) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > chars && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function label(text, x, y, { size = 12, weight = 500, fill = 'var(--text)', anchor = 'middle', chars = 18, lineHeight = 14 } = {}) {
  const lines = wrap(text, chars);
  const node = el('text', {
    x,
    y: y - ((lines.length - 1) * lineHeight) / 2,
    'text-anchor': anchor,
    'font-size': size,
    'font-weight': weight,
    fill,
    'font-family': 'var(--sans)',
  });
  lines.forEach((line, i) => node.appendChild(el('tspan', { x, dy: i === 0 ? 0 : lineHeight }, line)));
  return node;
}

function arrowDefs() {
  return el(
    'defs',
    {},
    el(
      'marker',
      { id: 'ax-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
      el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--text-faint)' }),
    ),
  );
}

/* ------------------------------------------------------------------ layouts */

function flowDiagram(spec) {
  const nodes = spec.nodes.slice(0, 8);
  if (!nodes.length) return null;
  const boxW = 168;
  const boxH = 62;
  const gapY = 34;
  const height = nodes.length * (boxH + gapY);
  const svg = canvas(420, height);
  svg.appendChild(arrowDefs());

  nodes.forEach((node, i) => {
    const y = i * (boxH + gapY);
    const x = 126;
    svg.appendChild(
      el('rect', {
        x, y, width: boxW, height: boxH, rx: 12,
        fill: 'var(--surface-2)', stroke: PALETTE[i % PALETTE.length], 'stroke-width': 1.4, opacity: 0.96,
      }),
    );
    svg.appendChild(label(node.label, x + boxW / 2, y + (node.detail ? boxH / 2 - 7 : boxH / 2 + 4), { size: 13, weight: 600, chars: 22 }));
    if (node.detail) {
      svg.appendChild(label(node.detail, x + boxW / 2, y + boxH / 2 + 13, { size: 10.5, weight: 400, fill: 'var(--text-dim)', chars: 30, lineHeight: 12 }));
    }
    if (i < nodes.length - 1) {
      const edge = spec.edges.find((e) => e.from === node.id && e.to === nodes[i + 1].id);
      svg.appendChild(
        el('line', {
          x1: x + boxW / 2, y1: y + boxH, x2: x + boxW / 2, y2: y + boxH + gapY - 4,
          stroke: 'var(--text-faint)', 'stroke-width': 1.4, 'marker-end': 'url(#ax-arrow)',
        }),
      );
      if (edge?.label) {
        svg.appendChild(label(edge.label, x + boxW / 2 + 12, y + boxH + gapY / 2 + 3, { size: 10, fill: 'var(--text-faint)', anchor: 'start', chars: 22 }));
      }
    }
  });
  return svg;
}

function cycleDiagram(spec) {
  const nodes = spec.nodes.slice(0, 7);
  if (nodes.length < 2) return flowDiagram(spec);
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 132;
  const svg = canvas(size, size);
  svg.appendChild(arrowDefs());

  const points = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle };
  });

  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    const midAngle = point.angle + (Math.PI * 2) / nodes.length / 2;
    const arcR = radius + 6;
    svg.appendChild(
      el('path', {
        d: `M ${point.x + 34 * Math.cos(point.angle + 0.4)} ${point.y + 34 * Math.sin(point.angle + 0.4)}
            Q ${cx + arcR * 1.16 * Math.cos(midAngle)} ${cy + arcR * 1.16 * Math.sin(midAngle)}
            ${next.x + 34 * Math.cos(next.angle - 0.5)} ${next.y + 34 * Math.sin(next.angle - 0.5)}`,
        fill: 'none', stroke: 'var(--text-faint)', 'stroke-width': 1.3, 'marker-end': 'url(#ax-arrow)', opacity: 0.75,
      }),
    );
  });

  points.forEach((point, i) => {
    svg.appendChild(el('circle', { cx: point.x, cy: point.y, r: 33, fill: 'var(--ink-800)', stroke: PALETTE[i % PALETTE.length], 'stroke-width': 1.6 }));
    svg.appendChild(label(nodes[i].label, point.x, point.y + 4, { size: 11, weight: 600, chars: 11, lineHeight: 12 }));
  });
  return svg;
}

function conceptMap(spec) {
  const nodes = spec.nodes.slice(0, 9);
  if (!nodes.length) return null;
  const size = 440;
  const cx = size / 2;
  const cy = 200;
  const svg = canvas(size, 400);
  const [root, ...rest] = nodes;
  const positions = new Map();
  positions.set(root.id, { x: cx, y: cy });

  rest.forEach((node, i) => {
    const angle = (i / Math.max(1, rest.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, { x: cx + 152 * Math.cos(angle), y: cy + 128 * Math.sin(angle) });
  });

  for (const edge of spec.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    svg.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: 'var(--line-strong)', 'stroke-width': 1.2 }));
    if (edge.label) {
      svg.appendChild(label(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 4, { size: 9.5, fill: 'var(--text-faint)', chars: 16, lineHeight: 10 }));
    }
  }
  if (!spec.edges.length) {
    for (const node of rest) {
      const to = positions.get(node.id);
      svg.appendChild(el('line', { x1: cx, y1: cy, x2: to.x, y2: to.y, stroke: 'var(--line-strong)', 'stroke-width': 1.2 }));
    }
  }

  nodes.forEach((node, i) => {
    const point = positions.get(node.id);
    const isRoot = i === 0;
    svg.appendChild(
      el('rect', {
        x: point.x - (isRoot ? 74 : 60), y: point.y - (isRoot ? 22 : 18),
        width: isRoot ? 148 : 120, height: isRoot ? 44 : 36, rx: 10,
        fill: isRoot ? 'var(--accent-glow)' : 'var(--ink-800)',
        stroke: isRoot ? 'var(--accent)' : 'var(--line-strong)', 'stroke-width': 1.3,
      }),
    );
    svg.appendChild(label(node.label, point.x, point.y + 4, { size: isRoot ? 12.5 : 11, weight: isRoot ? 650 : 500, chars: isRoot ? 18 : 16, lineHeight: 12 }));
  });
  return svg;
}

function timelineDiagram(spec) {
  const items = spec.items.slice(0, 9);
  if (!items.length) return null;
  const rowH = 72;
  const height = items.length * rowH + 10;
  const svg = canvas(460, height);
  svg.appendChild(el('line', { x1: 78, y1: 12, x2: 78, y2: height - 24, stroke: 'var(--line-strong)', 'stroke-width': 1.5 }));

  items.forEach((item, i) => {
    const y = 24 + i * rowH;
    svg.appendChild(el('circle', { cx: 78, cy: y, r: 6, fill: PALETTE[i % PALETTE.length] }));
    svg.appendChild(el('circle', { cx: 78, cy: y, r: 11, fill: 'none', stroke: PALETTE[i % PALETTE.length], opacity: 0.3, 'stroke-width': 1.4 }));
    svg.appendChild(label(item.when, 62, y + 4, { size: 11, weight: 650, anchor: 'end', fill: 'var(--text-dim)', chars: 12, lineHeight: 12 }));
    svg.appendChild(label(item.label, 100, y - (item.detail ? 4 : -4), { size: 12.5, weight: 600, anchor: 'start', chars: 40, lineHeight: 14 }));
    if (item.detail) {
      svg.appendChild(label(item.detail, 100, y + 16, { size: 11, weight: 400, anchor: 'start', fill: 'var(--text-dim)', chars: 48, lineHeight: 12 }));
    }
  });
  return svg;
}

function barDiagram(spec) {
  const series = spec.series.slice(0, 10);
  if (!series.length) return null;
  const width = 440;
  const rowH = 34;
  const height = series.length * rowH + 16;
  const max = Math.max(...series.map((s) => Math.abs(s.value)), 1);
  const svg = canvas(width, height);
  const labelW = 118;

  series.forEach((entry, i) => {
    const y = i * rowH + 8;
    const barW = Math.max(2, ((width - labelW - 56) * Math.abs(entry.value)) / max);
    svg.appendChild(label(entry.label, labelW - 10, y + 15, { size: 11.5, anchor: 'end', fill: 'var(--text-dim)', chars: 18, lineHeight: 12 }));
    svg.appendChild(el('rect', { x: labelW, y: y + 4, width: width - labelW - 46, height: 16, rx: 5, fill: 'var(--ink-700)' }));
    svg.appendChild(el('rect', { x: labelW, y: y + 4, width: barW, height: 16, rx: 5, fill: PALETTE[i % PALETTE.length], opacity: 0.9 }));
    svg.appendChild(label(String(entry.value), labelW + barW + 8, y + 16, { size: 11, anchor: 'start', fill: 'var(--text-soft)', chars: 8 }));
  });
  return svg;
}

function functionGraph(spec) {
  const points = spec.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length < 2) return null;
  const width = 440;
  const height = 300;
  const pad = 42;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (width - pad * 2);
  const sy = (y) => height - pad - ((y - minY) / (maxY - minY || 1)) * (height - pad * 2);
  const svg = canvas(width, height);

  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (height - pad * 2)) / 4;
    svg.appendChild(el('line', { x1: pad, y1: y, x2: width - pad, y2: y, stroke: 'var(--line)', 'stroke-width': 1 }));
  }
  if (minY < 0 && maxY > 0) {
    svg.appendChild(el('line', { x1: pad, y1: sy(0), x2: width - pad, y2: sy(0), stroke: 'var(--line-strong)', 'stroke-width': 1.3 }));
  }
  if (minX < 0 && maxX > 0) {
    svg.appendChild(el('line', { x1: sx(0), y1: pad, x2: sx(0), y2: height - pad, stroke: 'var(--line-strong)', 'stroke-width': 1.3 }));
  }

  const path = points
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ');
  svg.appendChild(el('path', { d: path, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));

  for (const point of points) {
    if (!point.label) continue;
    svg.appendChild(el('circle', { cx: sx(point.x), cy: sy(point.y), r: 3.6, fill: 'var(--accent-bright)' }));
    svg.appendChild(label(point.label, sx(point.x), sy(point.y) - 10, { size: 10, fill: 'var(--text-dim)', chars: 16 }));
  }

  svg.appendChild(label(spec.x_label || 'x', width / 2, height - 10, { size: 11, fill: 'var(--text-faint)', chars: 30 }));
  const yLabel = label(spec.y_label || 'y', 0, 0, { size: 11, fill: 'var(--text-faint)', chars: 30 });
  yLabel.setAttribute('transform', `translate(14 ${height / 2}) rotate(-90)`);
  svg.appendChild(yLabel);
  return svg;
}

function comparisonTable(spec) {
  if (!spec.columns.length) return null;
  return h(
    'div',
    { style: { overflowX: 'auto' } },
    h(
      'table',
      { class: 'cmp-table' },
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
  let body;
  try {
    body = build(spec);
  } catch {
    body = null;
  }
  if (!body) return null;

  return h(
    'figure',
    { class: 'diagram' },
    spec.title ? h('figcaption.diagram-title', {}, spec.title) : null,
    h('div.diagram-body', {}, body),
    spec.caption ? h('figcaption.diagram-caption', {}, spec.caption) : null,
  );
}
