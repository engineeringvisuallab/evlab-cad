import { make, dist, norm, validate, segments, length, TAU } from '../core/entity.js';
import { segSeg } from '../renderer/snapping.js';
import * as TF from './transforms.js';
import { expand } from './expand.js';
export function transformIds(d, ids, T, copy) {
  if (!ids.length) throw new Error('Nothing selected.');
  for (const id of ids) {
    const e = d.get(id); if (!e) continue; const t = TF.apply(e, T), err = t.type === 'dim' ? null : validate(t); if (err) throw new Error(err);
    if (copy) { const { id: _, ...rest } = t; d.add(rest); } else Object.assign(e, t);
  }
}
export function offsetEntity(e, dd, side) {
  if (e.type === 'line') { const dx = e.x2 - e.x1, dy = e.y2 - e.y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, s = (side.x - e.x1) * nx + (side.y - e.y1) * ny < 0 ? -1 : 1;
    return make.line(e.x1 + nx * s * dd, e.y1 + ny * s * dd, e.x2 + nx * s * dd, e.y2 + ny * s * dd); }
  if (e.type === 'circle' || e.type === 'arc') { const r = dist(side.x, side.y, e.cx, e.cy) > e.r ? e.r + dd : e.r - dd;
    if (r <= 0) throw new Error('Offset would make the radius zero or negative.'); return { ...e, r }; }
  throw new Error('OFFSET supports lines, circles and arcs. Polyline offset is not implemented.');
}
const cutters = (d, e) => d.shapes(x => x.id !== e.id && d.isVisible(x)).flatMap(segments);
export function trimLine(d, e, p) {
  if (e?.type !== 'line') throw new Error('TRIM currently works on lines only.');
  const dx = e.x2 - e.x1, dy = e.y2 - e.y1, L2 = dx * dx + dy * dy, tp = ((p.x - e.x1) * dx + (p.y - e.y1) * dy) / L2, ts = [];
  for (const s of cutters(d, e)) { const q = segSeg([e.x1, e.y1, e.x2, e.y2], s); if (q) { const t = ((q.x - e.x1) * dx + (q.y - e.y1) * dy) / L2; if (t > 1e-9 && t < 1 - 1e-9) ts.push(t); } }
  if (!ts.length) throw new Error('No cutting edge crosses this line.');
  const lo = Math.max(-Infinity, ...ts.filter(t => t <= tp)), hi = Math.min(Infinity, ...ts.filter(t => t > tp)), at = t => [e.x1 + t * dx, e.y1 + t * dy];
  if (lo > -Infinity && hi < Infinity) { const h = at(hi), l = at(lo); d.add({ ...make.line(h[0], h[1], e.x2, e.y2), layer: e.layer, color: e.color }); e.x2 = l[0]; e.y2 = l[1]; }
  else if (lo > -Infinity) { const l = at(lo); e.x2 = l[0]; e.y2 = l[1]; } else { const h = at(hi); e.x1 = h[0]; e.y1 = h[1]; }
}
export function extendLine(d, e, p) {
  if (e?.type !== 'line') throw new Error('EXTEND currently works on lines only.');
  const dx = e.x2 - e.x1, dy = e.y2 - e.y1, L = Math.hypot(dx, dy), end = ((p.x - e.x1) * dx + (p.y - e.y1) * dy) / (L * L) >= 0.5;
  const ox = end ? e.x2 : e.x1, oy = end ? e.y2 : e.y1, ux = (end ? dx : -dx) / L, uy = (end ? dy : -dy) / L; let best = null;
  for (const s of cutters(d, e)) { const q = segSeg([ox, oy, ox + ux * 1e7, oy + uy * 1e7], s), k = q && dist(ox, oy, q.x, q.y); if (q && k > 1e-7 && (!best || k < best.k)) best = { q, k }; }
  if (!best) throw new Error('No boundary found in that direction.');
  if (end) { e.x2 = best.q.x; e.y2 = best.q.y; } else { e.x1 = best.q.x; e.y1 = best.q.y; }
}
// FILLET (radius r; 0 = sharp corner) and CHAMFER (equal distance) between two lines. Click each line on the side to keep.
export function corner(d, id1, id2, c1, c2, kind, val = 0) {
  const a = d.get(id1), b = d.get(id2), K = kind.toUpperCase();
  if (a?.type !== 'line' || b?.type !== 'line') throw new Error(`${K} works on two lines.`); if (a === b) throw new Error('Pick two different lines.');
  if (kind === 'chamfer' && !(val > 0)) throw new Error('Set a chamfer distance first, e.g. CHAMFER 3.');
  const r1 = [a.x2 - a.x1, a.y2 - a.y1], r2 = [b.x2 - b.x1, b.y2 - b.y1], den = r1[0] * r2[1] - r1[1] * r2[0];
  if (Math.abs(den) < 1e-9 * Math.hypot(...r1) * Math.hypot(...r2)) throw new Error('The lines are parallel.');
  const t0 = ((b.x1 - a.x1) * r2[1] - (b.y1 - a.y1) * r2[0]) / den, P = [a.x1 + t0 * r1[0], a.y1 + t0 * r1[1]];
  const leg = (e, c) => { const dx = e.x2 - e.x1, dy = e.y2 - e.y1, L = Math.hypot(dx, dy); let u = [dx / L, dy / L]; if ((c.x - P[0]) * u[0] + (c.y - P[1]) * u[1] < 0) u = [-u[0], -u[1]];
    const s1 = (e.x1 - P[0]) * u[0] + (e.y1 - P[1]) * u[1], s2 = (e.x2 - P[0]) * u[0] + (e.y2 - P[1]) * u[1], idx = s1 > s2 ? 0 : 1, len = Math.max(s1, s2);
    if (len <= 1e-9) throw new Error('The clicked side of a line does not extend away from the corner.'); return { u, idx, len }; };
  const l1 = leg(a, c1), l2 = leg(b, c2), cos = l1.u[0] * l2.u[0] + l1.u[1] * l2.u[1], th = Math.acos(Math.max(-1, Math.min(1, cos)));
  if (th < 1e-6 || th > Math.PI - 1e-6) throw new Error('The lines are collinear.');
  const t = kind === 'fillet' ? (val > 0 ? val / Math.tan(th / 2) : 0) : val;
  if (t > 0 && t >= Math.min(l1.len, l2.len) - 1e-9) throw new Error(`${kind === 'fillet' ? 'Radius' : 'Distance'} is too large for these lines.`);
  const T1 = [P[0] + l1.u[0] * t, P[1] + l1.u[1] * t], T2 = [P[0] + l2.u[0] * t, P[1] + l2.u[1] * t];
  const set = (e, l, T) => { if (l.idx === 0) { e.x2 = T[0]; e.y2 = T[1]; } else { e.x1 = T[0]; e.y1 = T[1]; } };
  set(a, l1, T1); set(b, l2, T2);
  if (kind === 'fillet' && val > 0) {
    const bx = l1.u[0] + l2.u[0], by = l1.u[1] + l2.u[1], bl = Math.hypot(bx, by), k = val / Math.sin(th / 2), C = [P[0] + bx / bl * k, P[1] + by / bl * k];
    const s = Math.atan2(T1[1] - C[1], T1[0] - C[0]), e2 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
    const arc = norm(e2 - s) < Math.PI ? make.arc(C[0], C[1], val, s, e2) : make.arc(C[0], C[1], val, e2, s); d.add({ ...arc, layer: a.layer, color: a.color });
  } else if (kind === 'chamfer') d.add({ ...make.line(T1[0], T1[1], T2[0], T2[1]), layer: a.layer, color: a.color });
}
export function breakEntity(d, id, p1, p2) {
  const e = d.get(id), keep = { layer: e?.layer, color: e?.color };
  if (e?.type === 'line') {
    const dx = e.x2 - e.x1, dy = e.y2 - e.y1, L2 = dx * dx + dy * dy, t = p => Math.max(0, Math.min(1, ((p.x - e.x1) * dx + (p.y - e.y1) * dy) / L2));
    let a = t(p1), b = t(p2); if (a > b) [a, b] = [b, a]; if (b - a < 1e-9) throw new Error('The two break points are the same.');
    const at = u => [e.x1 + u * dx, e.y1 + u * dy], cut = []; if (a > 1e-9) cut.push([0, a]); if (b < 1 - 1e-9) cut.push([b, 1]);
    if (!cut.length) throw new Error('That would remove the whole line. Use ERASE.');
    const segs = cut.map(([u, v]) => [...at(u), ...at(v)]); Object.assign(e, { x1: segs[0][0], y1: segs[0][1], x2: segs[0][2], y2: segs[0][3] });
    segs.slice(1).forEach(s => d.add({ ...make.line(...s), ...keep })); return;
  }
  if (e?.type === 'circle') {
    const a1 = Math.atan2(p1.y - e.cy, p1.x - e.cx), a2 = Math.atan2(p2.y - e.cy, p2.x - e.cx); if (norm(a1 - a2) < 1e-9) throw new Error('The two break points are the same.');
    d.remove([id]); d.add({ ...make.arc(e.cx, e.cy, e.r, a2, a1), ...keep }); return;   // the part counter-clockwise from point 1 to point 2 is removed
  }
  if (e?.type === 'arc') {
    const sw = norm(e.a1 - e.a0), sp = p => Math.min(sw, norm(Math.atan2(p.y - e.cy, p.x - e.cx) - e.a0)); let a = sp(p1), b = sp(p2); if (a > b) [a, b] = [b, a];
    if (b - a < 1e-9) throw new Error('The two break points are the same.'); const cut = []; if (a > 1e-9) cut.push([0, a]); if (b < sw - 1e-9) cut.push([b, sw]);
    if (!cut.length) throw new Error('That would remove the whole arc. Use ERASE.'); const a0 = e.a0, arcs = cut.map(([u, v]) => [a0 + u, a0 + v]);
    e.a0 = arcs[0][0]; e.a1 = arcs[0][1]; arcs.slice(1).forEach(([s, f]) => d.add({ ...make.arc(e.cx, e.cy, e.r, s, f), ...keep })); return;
  }
  throw new Error('BREAK works on lines, arcs and circles. EXPLODE polylines first.');
}
// STRETCH: points inside the crossing window move by (dx,dy); objects with one point (circle centre, text, block, point) move whole if that point is inside. Dimensions are not stretched.
export function stretchWindow(d, a, b, dx, dy) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), inn = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1; let n = 0;
  for (const e of d.entities) {
    if (!d.isSelectable(e)) continue; const c = structuredClone(e); let hit = false;
    if (e.type === 'line') { if (inn(e.x1, e.y1)) { c.x1 += dx; c.y1 += dy; hit = true; } if (inn(e.x2, e.y2)) { c.x2 += dx; c.y2 += dy; hit = true; } }
    else if (e.type === 'polyline') c.pts = e.pts.map(p => inn(p[0], p[1]) ? (hit = true, [p[0] + dx, p[1] + dy]) : p);
    else if (e.type === 'circle' || e.type === 'arc') { if (inn(e.cx, e.cy)) { c.cx += dx; c.cy += dy; hit = true; } }
    else if (['text', 'insert', 'point', 'xline', 'ray'].includes(e.type)) { if (inn(e.x, e.y)) { c.x += dx; c.y += dy; hit = true; } }
    if (!hit) continue; const err = validate(c); if (err) throw new Error(err); Object.assign(e, c); n++;
  }
  if (!n) throw new Error('No object has a point inside the crossing window.'); return n;
}
export function explodeIds(d, ids) {
  let n = 0; for (const id of ids) { const e = d.get(id); if (e?.type === 'insert') { expand(d, e).forEach(p => d.add({ ...p, layer: e.layer })); d.remove([id]); n++; continue; } if (e?.type !== 'polyline') continue;
    segments(e).forEach(s => d.add({ ...make.line(...s), layer: e.layer, color: e.color })); d.remove([id]); n++; }
  if (!n) throw new Error('EXPLODE works on polylines, rectangles and block references. Select one first.'); return n;
}
export function joinIds(d, ids) {
  const es = ids.map(i => d.get(i)).filter(Boolean); if (es.length < 2) throw new Error('Select at least 2 lines or open polylines to join.');
  const pieces = es.map(e => e.type === 'line' ? [[e.x1, e.y1], [e.x2, e.y2]] : e.type === 'polyline' && !e.closed ? e.pts.map(p => [...p]) : null);
  if (pieces.includes(null)) throw new Error('JOIN works on lines and open polylines only.');
  const eq = (p, q) => dist(p[0], p[1], q[0], q[1]) < 1e-6; let chain = pieces.shift(), go = true;
  while (pieces.length && go) { go = false; for (let i = 0; i < pieces.length; i++) { const q = pieces[i], h = chain[0], t = chain[chain.length - 1];
    if (eq(t, q[0])) chain = chain.concat(q.slice(1)); else if (eq(t, q[q.length - 1])) chain = chain.concat(q.slice(0, -1).reverse());
    else if (eq(h, q[q.length - 1])) chain = q.slice(0, -1).concat(chain); else if (eq(h, q[0])) chain = q.slice(1).reverse().concat(chain); else continue;
    pieces.splice(i, 1); go = true; break; } }
  if (pieces.length) throw new Error('The selected objects do not form one continuous chain.');
  const closed = chain.length > 2 && eq(chain[0], chain[chain.length - 1]); if (closed) chain.pop();
  d.remove(ids); d.add({ ...make.polyline(chain, closed), layer: es[0].layer, color: es[0].color });
}
export function arrayIds(d, ids, rows, cols, dy, dx) {
  if (!ids.length) throw new Error('Nothing selected.');
  if (![rows, cols].every(n => Number.isInteger(n) && n >= 1) || rows * cols > 2500) throw new Error('Rows and columns must be whole numbers ≥ 1 (max 2500 copies).');
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (r || c) transformIds(d, ids, TF.move(c * dx, r * dy), true);
}
export function areaReport(d, ids) {
  return ids.map(i => d.get(i)).filter(Boolean).map(e => {
    if (e.type === 'circle') return `${e.id}: area ${(Math.PI * e.r * e.r).toFixed(4)}, circumference ${length(e).toFixed(4)}`;
    if (e.type === 'polyline' && e.closed) { let s = 0; e.pts.forEach((p, i) => { const q = e.pts[(i + 1) % e.pts.length]; s += p[0] * q[1] - q[0] * p[1]; }); return `${e.id}: area ${(Math.abs(s) / 2).toFixed(4)}, perimeter ${length(e).toFixed(4)}`; }
    return `${e.id}: not a closed polyline or circle`; });
}
