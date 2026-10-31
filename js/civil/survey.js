import { addCivilSymbols } from '../blocks/civil-symbols.js';
import { ensureLayer, paperToModel } from './common.js';
// Rows: ID, X(E), Y(N), [Z], [description...]. order 'NE' means the file lists northing before easting.
export function parseSurveyCsv(text, order = 'EN') {
  const rows = [], errs = []; let first = true;
  text.split(/\r?\n/).forEach((line, i) => {
    const s = line.trim(); if (!s || s.startsWith('#')) return;
    const delim = [',', ';', '\t'].find(c => s.includes(c)), f = delim ? s.split(delim).map(t => t.trim()) : s.split(/\s+/), a = Number(f[1]), b = Number(f[2]);
    if (f.length < 3) return errs.push(`Line ${i + 1}: needs at least ID, X and Y`);
    if (!Number.isFinite(a) || !Number.isFinite(b) || f[1] === '' || f[2] === '') { if (first) { first = false; return; } return errs.push(`Line ${i + 1}: X and Y must be numbers`); }
    first = false; const z = f[3] === undefined || f[3] === '' ? null : Number(f[3]);
    if (z !== null && !Number.isFinite(z)) return errs.push(`Line ${i + 1}: elevation is not a number`);
    rows.push({ id: f[0], x: order === 'NE' ? b : a, y: order === 'NE' ? a : b, z, desc: f.slice(4).join(delim || ' ') });
  });
  if (errs.length) throw new Error(errs.slice(0, 5).join('; ') + (errs.length > 5 ? ` (+${errs.length - 5} more)` : '') + '. Nothing was plotted.');
  if (!rows.length) throw new Error('No survey points found.'); if (rows.length > 5000) throw new Error('Too many points (limit 5000 per plot).'); return rows;
}
export function plotSurvey(d, rows, o = {}) {
  const h = o.h > 0 ? o.h : paperToModel(d, 2.5), size = o.size > 0 ? o.size : paperToModel(d, 1.5), dec = o.decimals ?? 3;
  addCivilSymbols(d);
  const L = { pt: ensureLayer(d, 'SURVEY_PTS', '#5cb85c'), no: ensureLayer(d, 'SURVEY_NO', '#6fd3ff'), z: ensureLayer(d, 'SURVEY_ELEV', '#f0b441'), ds: ensureLayer(d, 'SURVEY_DESC', '#c792ea') };
  for (const r of rows) {
    const x = r.x + size * 1.3, text = (y, str, layer) => d.add({ type: 'text', x, y, h, rot: 0, str, layer });
    d.add({ type: 'insert', block: 'SURVEY_POINT', x: r.x, y: r.y, s: size, rot: 0, layer: L.pt }); text(r.y + 0.3 * h, String(r.id), L.no);
    if (o.elev !== false && r.z !== null) text(r.y - 1.2 * h, r.z.toFixed(dec), L.z);
    if (o.desc !== false && r.desc) text(r.y - 2.6 * h, r.desc, L.ds);
  }
  return rows.length;
}
