import { length, segments, dist, norm } from '../core/entity.js';
import { unitsPerMetre } from './common.js';
const area = e => e.type === 'circle' ? Math.PI * e.r * e.r : e.type === 'polyline' && e.closed ? Math.abs(e.pts.reduce((s, p, i) => { const q = e.pts[(i + 1) % e.pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2 : 0;
// Take-off from drawing geometry (drawing units converted to metres). Closed-polyline area ignores holes and self-intersection.
export function quantities(d) {
  const k = 1 / unitsPerMetre(d), map = new Map(), row = (layer, kind) => { const key = layer + '\u0000' + kind; if (!map.has(key)) map.set(key, { layer, kind, count: 0, length: 0, area: 0 }); return map.get(key); };
  for (const e of d.entities) {
    if (e.type === 'dim') continue;
    const kind = e.type === 'polyline' ? (e.closed ? 'closed polyline' : 'polyline') : e.type === 'insert' ? 'block:' + e.block : e.type, r = row(e.layer, kind);
    r.count++; if (e.type !== 'insert' && e.type !== 'text') r.length += length(e) * k; r.area += area(e) * k * k;
  }
  return [...map.values()].sort((a, b) => a.layer.localeCompare(b.layer) || a.kind.localeCompare(b.kind));
}
const q = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
const r3 = v => +v.toFixed(3);
export const quantitiesCsv = rows => ['layer,type,count,total_length_m,total_area_m2', ...rows.map(r => [q(r.layer), q(r.kind), r.count, r3(r.length), r3(r.area)].join(','))].join('\r\n') + '\r\n';
export function quantitiesText(rows) { return rows.length ? rows.map(r => `${r.layer} · ${r.kind} ×${r.count}${r.length ? `, length ${r3(r.length)} m` : ''}${r.area ? `, area ${r3(r.area)} m²` : ''}`) : ['No objects.']; }
export function coordinatesCsv(d) {
  const out = [`id,type,layer,part,x,y,extra  # units: ${d.units}`], P = (e, part, x, y, ex = '') => out.push([e.id, e.type, q(e.layer), part, x, y, q(ex)].join(','));
  for (const e of d.entities) {
    if (e.type === 'line') { P(e, 'start', e.x1, e.y1); P(e, 'end', e.x2, e.y2); } else if (e.type === 'polyline') e.pts.forEach((p, i) => P(e, 'vertex' + (i + 1), p[0], p[1], e.closed ? 'closed' : ''));
    else if (e.type === 'circle') P(e, 'center', e.cx, e.cy, 'r=' + e.r); else if (e.type === 'arc') P(e, 'center', e.cx, e.cy, `r=${e.r} a0=${norm(e.a0) * 180 / Math.PI} a1=${norm(e.a1) * 180 / Math.PI}`);
    else if (e.type === 'text') P(e, 'insert', e.x, e.y, e.str.replace(/\n/g, ' / ')); else if (e.type === 'insert') P(e, 'insert', e.x, e.y, `${e.block} s=${e.s} rot=${e.rot * 180 / Math.PI}`);
    else if (e.type === 'point') P(e, 'point', e.x, e.y); else if (e.type === 'xline' || e.type === 'ray') P(e, 'base', e.x, e.y, 'angle=' + norm(e.a) * 180 / Math.PI);
    else if (e.type === 'dim') P(e, 'position', e.o[0], e.o[1], e.dtype + (e.ref ? ' ref=' + e.ref : ''));
  }
  return out.join('\r\n') + '\r\n';
}
