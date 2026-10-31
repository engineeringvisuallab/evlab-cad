// Dependency-free static server for local testing. Usage: node serve.mjs [base]   e.g. node serve.mjs /evlab-cad/
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8' };
const root = path.dirname(fileURLToPath(import.meta.url));
export function createServer(dir = root, base = '/') {
  if (!base.endsWith('/')) base += '/';
  return http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (!p.startsWith(base)) { res.writeHead(404); return res.end('Not found'); }
    let rel = p.slice(base.length); if (rel === '' || rel.endsWith('/')) rel += 'index.html'; const f = path.join(dir, rel);
    if (!f.startsWith(dir + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('Not found'); }   // exact-case match, like GitHub Pages
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[2] || '/'; createServer(root, base).listen(8000, () => console.log(`EVLab CAD running at http://localhost:8000${base.endsWith('/') ? base : base + '/'}  (Ctrl+C to stop)`));
}
