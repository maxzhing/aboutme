// Serves /home/user on 127.0.0.1:8098 (so the landing page is at /aboutme/sat/), runs capture.js into ./layers, then stops.
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = '/home/user';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
});
srv.listen(8098, '127.0.0.1', () => {
  // asynchronous, so this server keeps answering while the capture runs
  spawn('node', [path.join(__dirname, 'capture.js'), path.join(__dirname, 'layers')], { stdio: 'inherit' }).on('close', (c) => { srv.close(); process.exitCode = c; });
});
