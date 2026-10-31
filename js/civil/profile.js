import { ensureLayer, paperToModel, unitsPerMetre } from './common.js';
import { label } from './chainage.js';
export function parseProfileCsv(text) {
  const rows = []; let first = true;
  text.split(/\r?\n/).forEach((line, i) => { const s = line.trim(); if (!s || s.startsWith('#')) return; const f = s.split(/\s*[,;\t]\s*|\s+/), a = Number(f[0]), b = Number(f[1]);
    if (f.length < 2 || !Number.isFinite(a) || !Number.isFinite(b)) { if (first) { first = false; return; } throw new Error(`Line ${i + 1}: expected "chainage, level" as numbers (metres).`); }
    first = false; if (rows.length && a <= rows.at(-1).c) throw new Error(`Line ${i + 1}: chainage must increase.`); rows.push({ c: a, z: b }); });
  if (rows.length < 2) throw new Error('A profile needs at least 2 points.'); return rows;
}
// Horizontal 1 m = 1 m of drawing; vertical = ve times that. Drafting only: no earthworks, grades or design checks.
export function drawProfile(d, rows, o) {
  const ve = o.ve > 0 ? o.ve : 10, ox = o.x ?? 0, oy = o.y ?? 0, u = unitsPerMetre(d), datum = Number.isFinite(o.datum) ? o.datum : Math.floor(Math.min(...rows.map(r => r.z))) - 1, h = o.h > 0 ? o.h : paperToModel(d, 2.5);
  const X = c => ox + (c - rows[0].c) * u, Y = z => oy + (z - datum) * u * ve;
  const g = ensureLayer(d, 'PROFILE_GROUND', '#5cb85c'), grid = ensureLayer(d, 'PROFILE_GRID', '#7c98a6'), tx = ensureLayer(d, 'PROFILE_TEXT', '#f0b441');
  d.add({ type: 'polyline', pts: rows.map(r => [X(r.c), Y(r.z)]), closed: false, layer: g });
  d.add({ type: 'line', x1: X(rows[0].c), y1: oy, x2: X(rows.at(-1).c), y2: oy, layer: grid });
  for (const r of rows) {
    d.add({ type: 'line', x1: X(r.c), y1: oy, x2: X(r.c), y2: Y(r.z), layer: grid });
    d.add({ type: 'text', x: X(r.c), y: Y(r.z) + 0.6 * h, h, rot: Math.PI / 2, str: r.z.toFixed(3), layer: tx });
    d.add({ type: 'text', x: X(r.c), y: oy - 0.6 * h, h, rot: -Math.PI / 2, str: label(r.c), layer: tx });
  }
  d.add({ type: 'text', x: X(rows[0].c), y: oy - 12 * h, h, rot: 0, str: `Datum ${datum.toFixed(3)} m   Horizontal 1:1, vertical exaggeration x${ve}`, layer: tx });
  return rows.length;
}
