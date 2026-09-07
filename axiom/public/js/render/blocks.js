import { h } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { renderDiagram } from './diagram.js';

const BLOCK_META = {
  concept: { icon: 'brain', label: 'Concept' },
  intuition: { icon: 'lightbulb', label: 'Intuition' },
  analogy: { icon: 'puzzle', label: 'Analogy' },
  example: { icon: 'zap', label: 'Worked example' },
  steps: { icon: 'layers', label: 'Method' },
  warning: { icon: 'alert', label: 'Watch out' },
  misconception: { icon: 'alert', label: 'Common mistake' },
  diagram: { icon: 'chart', label: 'Diagram' },
  code: { icon: 'file', label: 'Code' },
  table: { icon: 'library', label: 'Reference' },
  summary: { icon: 'check', label: 'In short' },
};

export function renderBlock(block) {
  if (!block) return null;
  const meta = BLOCK_META[block.kind] || BLOCK_META.concept;
  const parts = [];

  if (block.markdown?.trim()) parts.push(prose(block.markdown));

  if (block.kind === 'steps' && block.steps?.length) {
    parts.push(
      h(
        'ol.steps',
        {},
        ...block.steps.map((step, i) =>
          h(
            'li.step',
            {},
            h('span.step-num', {}, String(i + 1)),
            h('div', {}, h('b', {}, step.title), step.detail ? prose(step.detail) : null),
          ),
        ),
      ),
    );
  }

  if (block.diagram) {
    const figure = renderDiagram(block.diagram);
    if (figure) parts.push(figure);
  }

  if (block.code?.source) {
    parts.push(prose(['```' + (block.code.language || ''), block.code.source, '```'].join('\n')));
    if (block.code.explanation) parts.push(prose(block.code.explanation));
  }

  if (block.table?.columns?.length) {
    parts.push(
      h(
        'div',
        { style: { overflowX: 'auto' } },
        h(
          'table.cmp-table',
          {},
          h('thead', {}, h('tr', {}, ...block.table.columns.map((c) => h('th', {}, c)))),
          h(
            'tbody',
            {},
            ...(block.table.rows || []).map((row) =>
              h('tr', {}, ...block.table.columns.map((_, i) => h('td', {}, row[i] ?? ''))),
            ),
          ),
        ),
      ),
    );
  }

  if (!parts.length && !block.heading) return null;

  return h(
    `div.block.${block.kind || 'concept'}`,
    {},
    h('div.block-head', {}, icon(meta.icon, { size: 13 }), meta.label),
    block.heading ? h('h4', {}, block.heading) : null,
    ...parts,
  );
}

export function renderBlocks(blocks = []) {
  const nodes = blocks.map(renderBlock).filter(Boolean);
  return nodes.length ? h('div.stack', {}, ...nodes) : null;
}

export function renderMistakes(mistakes = []) {
  if (!mistakes.length) return null;
  return h(
    'div.stack',
    {},
    ...mistakes.map((m) =>
      h(
        'div.block.misconception',
        {},
        h('div.block-head', {}, icon('alert', { size: 13 }), 'Common mistake'),
        h('h4', {}, m.mistake),
        m.why ? prose(`**Why it happens.** ${m.why}`) : null,
        m.fix ? prose(`**The fix.** ${m.fix}`) : null,
      ),
    ),
  );
}
