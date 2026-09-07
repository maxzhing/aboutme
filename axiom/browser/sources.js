import { getSource } from './store.js';

const MAX_TEXT_CHARS = 120000;

/**
 * Browser replacement for server/engine/sources.js.
 *
 * Same contract, minus the filesystem: binary sources were read into base64
 * when they were uploaded, so they go straight back up as document or image
 * blocks without a round trip through disk.
 */
export function sourceBlocks(sourceIds = [], learnerId) {
  const blocks = [];
  for (const sourceId of sourceIds) {
    const source = getSource(sourceId);
    if (!source || source.learner_id !== learnerId) continue;

    if (source.kind === 'pdf' && source.data) {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: source.data },
        title: source.name,
      });
    } else if (source.kind === 'image' && source.data) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: source.mime, data: source.data },
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
