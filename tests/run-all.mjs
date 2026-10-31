import { readdirSync } from 'node:fs'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url)); let failed = 0;
for (const f of readdirSync(dir).filter(n => n.endsWith('.test.mjs')).sort()) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  if (r.status === 0) console.log(`PASS  ${f}`); else { failed++; console.log(`FAIL  ${f}\n${(r.stderr || r.stdout).split('\n').slice(0, 12).join('\n')}`); }
}
console.log(failed ? `\n${failed} test file(s) failed.` : '\nAll test files passed.'); process.exit(failed ? 1 : 0);
