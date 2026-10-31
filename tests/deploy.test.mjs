import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createServer } from '../serve.mjs';
import { ALIASES, TOOL_OF } from '../js/core/commands.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
// ---- repository hygiene
for (const f of ['.nojekyll', 'LICENSE', 'README.md', 'DEPLOY.md', 'index.html']) assert.ok(fs.existsSync(path.join(root, f)), `${f} missing`);
const pkg = JSON.parse(read('package.json')); assert.ok(!pkg.dependencies && !pkg.devDependencies, 'no dependencies allowed'); assert.ok(!/(src|href)=["'](https?:)?\/\//.test(html), 'no external resources in index.html');
// ---- every module import is relative, has .js, and exists (GitHub Pages is case-sensitive)
const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]), js = walk('js').filter(f => f.endsWith('.js'));
const importsOf = src => [...src.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
for (const f of js) for (const spec of importsOf(read(f))) { assert.ok(/^\.\.?\//.test(spec), `${f}: non-relative import ${spec}`); assert.ok(spec.endsWith('.js'), `${f}: import needs .js: ${spec}`); assert.ok(fs.existsSync(path.join(root, path.dirname(f), spec)), `${f}: missing ${spec}`); }
assert.ok(!js.some(f => /fetch\(\s*['"`]\//.test(read(f))), 'no root-absolute fetch');
// ---- no dead buttons: every control in index.html has a handler
const app = read('js/app.js');
for (const m of html.matchAll(/data-act="([^"]+)"/g)) assert.ok(new RegExp(`(?:['"]${m[1]}['"]|\\b${m[1]})\\s*:`).test(app), `data-act="${m[1]}" has no handler in app.js`);
const tools = new Set(['select', ...Object.values(TOOL_OF)]); for (const m of html.matchAll(/data-tool="([^"]+)"/g)) assert.ok(tools.has(m[1]), `data-tool="${m[1]}" is not a tool`);
for (const m of html.matchAll(/data-cmd="([^"]+)"/g)) assert.ok(ALIASES[m[1]], `data-cmd="${m[1]}" is not a command`);
for (const id of [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1])) assert.equal(html.split(`id="${id}"`).length, 2, `duplicate id ${id}`);
for (const m of app.matchAll(/\$\('([\w-]+)'\)/g)) assert.ok(html.includes(`id="${m[1]}"`), `app.js uses #${m[1]} but index.html has no such element`);
// ---- serve under a sub-directory (https://user.github.io/evlab-cad/) and crawl everything the page loads
const server = createServer(root, '/evlab-cad/'); await new Promise(r => server.listen(0, r)); const origin = `http://127.0.0.1:${server.address().port}`;
try {
  const get = async u => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type') || '', text: r.status === 200 ? await r.text() : '' }; };
  const seen = new Map(), queue = [origin + '/evlab-cad/'];
  while (queue.length) { const u = queue.shift(); if (seen.has(u)) continue; const r = await get(u); seen.set(u, r); assert.equal(r.status, 200, `404 under /evlab-cad/: ${u}`);
    const refs = u.endsWith('/') || u.endsWith('.html') ? [...r.text.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]) : u.endsWith('.js') ? importsOf(r.text) : [];
    for (const ref of refs) queue.push(new URL(ref, u).href); }
  const files = [...seen.keys()]; assert.equal(files.length, 1 + walk('css').length + js.length, 'crawl should reach index.html, every stylesheet and every module'); assert.ok(files.some(u => u.endsWith('/js/app.js')) && files.some(u => u.endsWith('/css/main.css')));
  for (const [u, r] of seen) { if (u.endsWith('.js')) assert.match(r.type, /javascript/, u); if (u.endsWith('.css')) assert.match(r.type, /text\/css/, u); }
  const reachable = new Set(files.map(u => new URL(u).pathname.replace('/evlab-cad/', ''))); const orphans = js.filter(f => !reachable.has(f.split(path.sep).join('/'))); assert.deepEqual(orphans, [], 'js files nothing imports');
  assert.equal((await get(origin + '/js/app.js')).status, 404);                       // root-absolute paths would break on Pages
  assert.equal((await get(origin + '/evlab-cad/JS/app.js')).status, 404);              // case-sensitive like GitHub Pages
} finally { server.close(); }
console.log('deploy tests passed');
