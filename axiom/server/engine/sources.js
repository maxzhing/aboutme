import fs from 'node:fs';
import { getSource } from '../store.js';

const MAX_TEXT_CHARS = 120000;

/**
 * Turn uploaded materials into content blocks for the model. PDFs and images go
 * up natively as document/image blocks; text formats are inlined.
 */
export function sourceBlocks(sourceIds = [], learnerId) {
  const blocks = [];
  for (const sourceId of sourceIds) {
    const source = getSource(sourceId);
    if (!source || source.learner_id !== learnerId) continue;

    if (source.kind === 'pdf' && source.path && fs.existsSync(source.path)) {
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: fs.readFileSync(source.path).toString('base64'),
        },
        title: source.name,
      });
    } else if (source.kind === 'image' && source.path && fs.existsSync(source.path)) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: source.mime,
          data: fs.readFileSync(source.path).toString('base64'),
        },
      });
    } else if (source.text) {
      blocks.push({
        type: 'text',
        text: `<source name="${source.name}">\n${source.text.slice(0, MAX_TEXT_CHARS)}\n</source>`,
      });
    }
  }
  return blocks;
}

/** A short prompt fragment naming the attached sources. */
export function sourceContext(sourceIds = [], learnerId) {
  const names = sourceIds
    .map((sourceId) => getSource(sourceId))
    .filter((s) => s && s.learner_id === learnerId)
    .map((s) => s.name);
  if (!names.length) return '';
  return [
    '<source_material>',
    `The learner attached: ${names.join(', ')}. Everything you teach or assess here must come`,
    'from that material. Do not introduce facts it does not contain; if it omits something',
    'important, say so explicitly rather than filling the gap silently.',
    '</source_material>',
  ].join('\n');
}
