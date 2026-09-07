import path from 'node:path';
import express from 'express';
import { config, ROOT, hasLLM } from './config.js';
import { getDb } from './db.js';
import { api } from './routes/api.js';
import { files } from './routes/files.js';
import { llm } from './llm/index.js';
import { logger } from './util/log.js';

const log = logger('server');

export function createApp() {
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4mb' }));

  app.use('/api', files); // multipart routes first (they parse their own body)
  app.use('/api', api);

  // The API always answers in JSON — never the HTML error page.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `No such endpoint: ${req.method} /api${req.path}` });
  });

  app.use(
    express.static(path.join(ROOT, 'public'), {
      etag: true,
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    }),
  );

  // SPA fallback for client-side routes.
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(ROOT, 'public', 'index.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) log.error(`${req.method} ${req.path} failed: ${err.message}`, err.stack);
    if (res.headersSent) return;
    res.status(status).json({ error: err.message || 'Internal error', retryable: Boolean(err.retryable) });
  });

  return app;
}

export function start() {
  if (config.provider === 'mock' && process.env.AXIOM_ALLOW_MOCK !== '1') {
    log.error(
      'AXIOM_LLM_PROVIDER=mock is a test-only stand-in and will not serve a real app.\n' +
        'Set AXIOM_ALLOW_MOCK=1 if you really mean it, or unset AXIOM_LLM_PROVIDER and add an ANTHROPIC_API_KEY.',
    );
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    log.info(`Axiom listening on http://localhost:${config.port}`);
    log.info(`model: ${llm().model} (provider: ${config.provider})`);
    if (!hasLLM()) {
      log.warn('No ANTHROPIC_API_KEY found — the UI will load but nothing can be generated.');
      log.warn('Add one to axiom/.env (ANTHROPIC_API_KEY=sk-ant-...) and restart.');
    }
  });
  return server;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) start();
