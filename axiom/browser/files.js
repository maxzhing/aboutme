import express from './express.js';
import { llm } from '../server/llm/index.js';
import { renderPrompt, systemPrompt } from './prompts.js';
import { sourceSchema } from '../server/schemas/index.js';
import { coerce } from '../server/engine/validate.js';
import { sourceBlocks } from './sources.js';
import { saveSource, getSource, updateSourceSummary, deleteSource, ensureLearner, logEvent } from './store.js';
import { logger } from '../server/util/log.js';

const log = logger('files');
export const files = express.Router();

files.use((req, res, next) => {
  req.learnerId = String(req.get('x-learner-id') || 'me').slice(0, 64);
  ensureLearner(req.learnerId);
  next();
});

/**
 * Uploads. The transport shim has already read each file in the browser, so
 * this only has to record them. Nothing is sent anywhere at upload time — a
 * document reaches the model only when a request actually cites it.
 */
files.post('/sources', (req, res) => {
  const incoming = req.files || [];
  if (!incoming.length) {
    return res.status(400).json({ error: req.uploadWarning || 'No files were uploaded.' });
  }
  const saved = incoming.map((file) => saveSource(req.learnerId, file));
  logEvent(req.learnerId, 'sources_uploaded', { count: saved.length });
  res.json({
    sources: saved.map((s) => ({ id: s.id, name: s.name, kind: s.kind, bytes: s.bytes, mime: s.mime })),
    warning: req.uploadWarning || null,
  });
});

files.delete('/sources/:id', (req, res) => {
  deleteSource(req.learnerId, req.params.id);
  res.json({ ok: true });
});

// Read the document and work out what can usefully be built from it.
files.post('/sources/:id/analyze', async (req, res) => {
  const source = getSource(req.params.id);
  if (!source || source.learner_id !== req.learnerId) return res.status(404).json({ error: 'Not found' });

  try {
    const { object } = await llm().run({
      label: 'source-analysis',
      system: [{ text: systemPrompt(), cache: true }],
      messages: [
        {
          role: 'user',
          content: [
            ...sourceBlocks([source.id], req.learnerId),
            { type: 'text', text: renderPrompt('source', { note: String(req.body?.note || '').slice(0, 1000) || '(none)' }) },
          ],
        },
      ],
      schema: sourceSchema,
      effort: 'medium',
      maxTokens: 8000,
    });
    const analysis = coerce(object, sourceSchema);
    updateSourceSummary(source.id, analysis.summary);
    res.json({ analysis, source: { id: source.id, name: source.name, kind: source.kind } });
  } catch (err) {
    log.warn(`source analysis failed: ${err.message}`);
    res.status(err.status || 500).json({ error: err.message, retryable: Boolean(err.retryable) });
  }
});
