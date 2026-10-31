import { dist } from '../core/entity.js';
import { ensureLayer, paperToModel, unitsPerMetre } from './common.js';
export const pathOf = e => e.type === 'line' ? [[e.x1, e.y1], [e.x2, e.y2]] : e.type === 'polyline' ? (e.closed ? [...e.pts, e.pts[0]] : e.pts) : null;
export const pathLength = pts => pts.slice(1).reduce((s, p, i) => s + dist(pts[i][0], pts[i][1], p[0], p[1]), 0);
export function pointAt(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { const L = dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    if (s <= acc + L + 1e-9 || i === pts.length - 1) { const t = L ? Math.min(1, Math.max(0, (s - acc) / L)) : 0; return { x: pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), y: pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]), a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) }; }
    acc += L; }
}
export function label(c) { // metres -> km+metres, e.g. 1250.5 -> "1+250.500"
  const neg = c < 0, a = Math.abs(c); let km = Math.floor(a / 1000), m = a - km * 1000; if (m >= 999.9995) { km++; m = 0; } return (neg ? '-' : '') + km + '+' + m.toFixed(3).padStart(7, '0');
}
export function addChainage(d, e, o) {
  const pts = pathOf(e); if (!pts) throw new Error('Select one line or polyline (the centreline).');
  const start = Number(o.start ?? 0), step = Number(o.interval), f = 1 / unitsPerMetre(d), lenM = pathLength(pts) * f;
  if (!Number.isFinite(start) || !(step > 0)) throw new Error('Start must be a number and interval greater than 0 (metres).');
  const marks = [start]; for (let m = (Math.floor(start / step + 1e-9) + 1) * step; m <= start + lenM + 1e-9; m += step) marks.push(m);
  if (marks.at(-1) < start + lenM - 1e-6) marks.push(start + lenM); if (marks.length > 5000) throw new Error('Too many chainage marks (limit 5000).');
  const h = o.h > 0 ? o.h : paperToModel(d, 2.5), tick = o.tick > 0 ? o.tick : 2 * h, layer = ensureLayer(d, 'CHAINAGE', '#ff9f43');
  for (const c of marks) {
    const p = pointAt(pts, (c - start) / f), nx = -Math.sin(p.a), ny = Math.cos(p.a), rot = Math.cos(p.a) < -1e-9 ? p.a + Math.PI : p.a;
    d.add({ type: 'line', x1: p.x - nx * tick / 2, y1: p.y - ny * tick / 2, x2: p.x + nx * tick / 2, y2: p.y + ny * tick / 2, layer });
    d.add({ type: 'text', x: p.x + nx * (tick / 2 + 0.4 * h), y: p.y + ny * (tick / 2 + 0.4 * h), h, rot, str: label(c), layer });
  }
  return { marks: marks.length, lengthM: lenM };
}
