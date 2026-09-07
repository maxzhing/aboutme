import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import Busboy from 'busboy';
import { config } from '../config.js';
import { id } from '../util/ids.js';
import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { sourceSchema } from '../schemas/index.js';
import { coerce } from '../engine/validate.js';
import { sourceBlocks } from '../engine/sources.js';
import { saveSource, getSource, updateSourceSummary, ensureLearner, logEvent } from '../store.js';
import { logger } from '../util/log.js';

const log = logger('files');
export const files = express.Router();

const TEXT_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/json', 'application/x-latex', 'text/x-tex',
]);
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function kindFor(mime, name) {
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (IMAGE_MIMES.has(mime)) return 'image';
  if (TEXT_MIMES.has(mime) || /\.(txt|md|csv|json|tex|html?)$/i.test(name)) return 'text';
  return null;
}

files.use((req, res, next) => {
  req.learnerId = String(req.get('x-learner-id') || 'me').slice(0, 64);
  ensureLearner(req.learnerId);
  next();
});

files.post('/sources', (req, res) => {
  let busboy;
  try {
    busboy = Busboy({ headers: req.headers, limits: { fileSize: config.maxUploadBytes, files: 6 } });
  } catch {
    return res.status(400).json({ error: 'Expected a multipart upload.' });
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });
  const saved = [];
  const pending = [];
  let failed = null;

  busboy.on('file', (field, stream, info) => {
    const { filename, mimeType } = info;
    const kind = kindFor(mimeType, filename || '');
    if (!kind) {
      stream.resume();
      failed ||= `Unsupported file type: ${filename} (${mimeType}). Upload a PDF, image, or text file.`;
      return;
    }

    const safeName = path.basename(filename || 'upload').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const target = path.join(config.uploadDir, `${id('src')}-${safeName}`);
    const out = fs.createWriteStream(target);
    let bytes = 0;
    let truncated = false;

    stream.on('data', (chunk) => {
      bytes += chunk.length;
    });
    stream.on('limit', () => {
      truncated = true;
    });

    pending.push(
      new Promise((resolve) => {
        out.on('close', () => {
          if (truncated) {
            fs.rmSync(target, { force: true });
            failed ||= `${safeName} is larger than ${Math.round(config.maxUploadBytes / 1048576)} MB.`;
            return resolve();
          }
          const record = saveSource(req.learnerId, {
            name: safeName,
            mime: mimeType,
            bytes,
            kind,
            path: kind === 'text' ? null : target,
            text: kind === 'text' ? fs.readFileSync(target, 'utf8').slice(0, 400000) : null,
          });
          if (kind === 'text') fs.rmSync(target, { force: true });
          saved.push(record);
          resolve();
        });
        stream.pipe(out);
      }),
    );
  });

  busboy.on('error', () => {
    failed ||= 'Upload failed.';
  });

  busboy.on('close', async () => {
    await Promise.all(pending);
    if (!saved.length) return res.status(400).json({ error: failed || 'No files were uploaded.' });
    logEvent(req.learnerId, 'sources_uploaded', { count: saved.length });
    res.json({
      sources: saved.map((s) => ({ id: s.id, name: s.name, kind: s.kind, bytes: s.bytes, mime: s.mime })),
      warning: failed,
    });
  });

  req.pipe(busboy);
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
    res.status(err.status || 500).json({ error: err.message });
  }
});
