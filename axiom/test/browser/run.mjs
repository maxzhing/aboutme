/**
 * One-command UI test: boots a server on a free port, drives it in Chromium,
 * tears everything down. Uses the deterministic provider unless a real key is
 * present and AXIOM_UI_LIVE=1 is set.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-ui-'));
const port = await freePort();
const live = process.env.AXIOM_UI_LIVE === '1' && process.env.ANTHROPIC_API_KEY;

const server = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    AXIOM_DB: path.join(dir, 'ui.db'),
    AXIOM_UPLOADS: path.join(dir, 'uploads'),
    AXIOM_LOG_LEVEL: 'warn',
    ...(live ? {} : { AXIOM_LLM_PROVIDER: 'mock', AXIOM_ALLOW_MOCK: '1' }),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.env.AXIOM_UI_VERBOSE && process.stdout.write(d));
server.stderr.on('data', (d) => process.env.AXIOM_UI_VERBOSE && process.stderr.write(d));

const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`${base}/api/health`);
    if (res.ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`Driving ${base} in Chromium (${live ? 'LIVE model' : 'deterministic provider'})…\n`);

const runner = spawn(process.execPath, [path.join(here, 'ui.mjs'), base, path.join(dir, 'shots')], {
  cwd: root,
  stdio: 'inherit',
});

const code = await new Promise((resolve) => runner.on('exit', resolve));
server.kill();
console.log(`\nScreenshots: ${path.join(dir, 'shots')}`);
process.exit(code ?? 1);
