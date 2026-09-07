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

/**
 * OpenAI's strict structured outputs cannot carry every schema Axiom uses, so
 * say which ones lose the guarantee at boot rather than leaving it to be
 * inferred from the occasional malformed worksheet.
 */
async function reportSchemaSupport() {
  const [{ describeSchemaSupport }, allSchemas] = await Promise.all([
    import('./llm/openai-schema.js'),
    import('./schemas/index.js'),
  ]);
  const objects = Object.fromEntries(
    Object.entries(allSchemas).filter(([, v]) => v && typeof v === 'object' && v.type === 'object'),
  );
  const rows = describeSchemaSupport(objects);
  const soft = rows.filter((r) => !r.strict);
  if (!soft.length) {
    log.info('structured outputs: strict mode on every schema');
    return;
  }
  log.warn(
    `structured outputs: ${rows.length - soft.length} of ${rows.length} schemas fit strict mode; ` +
      `${soft.map((r) => r.name.replace(/Schema$/, '')).join(', ')} use JSON mode instead ` +
      '(validated and repaired downstream rather than guaranteed).',
  );
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
    if (config.provider === 'openai') reportSchemaSupport();
    if (!hasLLM()) {
      const [name, example] =
        config.provider === 'openai'
          ? ['OPENAI_API_KEY', 'OPENAI_API_KEY=sk-...']
          : ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY=sk-ant-...'];
      log.warn(`No ${name} found — the UI will load but nothing can be generated.`);
      log.warn(`Add one to axiom/.env (${example}) and restart.`);
    }
  });
  return server;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) start();
