import { make } from '../core/entity.js';
import * as X from '../geometry/modify.js';
import * as TF from '../geometry/transforms.js';
import { createBlock } from '../geometry/blocks.js';
const DEG = Math.PI / 180, dimPrompts = n => [`${n}: click a line, or specify the first point`, `${n}: specify the second point`, `${n}: specify the dimension line position`];
const PR = {
  block: ['BLOCK: specify the base point'], insert: ['INSERT: specify the insertion point (Esc to finish)'],
  move: ['MOVE: specify base point', 'MOVE: specify destination'], copy: ['COPY: specify base point', 'COPY: specify destination (Enter to end)'],
  rotate: ['ROTATE: specify base point', 'ROTATE: click a direction, or type the angle in degrees'], scale: ['SCALE: specify base point', 'SCALE: type the scale factor (e.g. 2)'],
  mirror: ['MIRROR: first point of axis', 'MIRROR: second point of axis (originals are kept)'], offset: ['OFFSET: click an object', 'OFFSET: click the side to offset to'],
  trim: ['TRIM: click the part of a line to remove'], extend: ['EXTEND: click the end of a line to extend'],
  fillet: ['FILLET: click the first line', 'FILLET: click the second line'], chamfer: ['CHAMFER: click the first line', 'CHAMFER: click the second line'],
  dimaligned: dimPrompts('DIMALIGNED'), dimlinear: dimPrompts('DIMLINEAR'), dimradius: ['DIMRADIUS: click a circle or arc', 'DIMRADIUS: specify label position'], dimdiameter: ['DIMDIAMETER: click a circle or arc', 'DIMDIAMETER: specify label position'] };
export const isModify = t => t in PR;
export const needsSel = t => ['move', 'copy', 'rotate', 'scale', 'mirror', 'block'].includes(t);
export function prompt(t, n, param, pts = []) {
  const p = PR[t], i = t.startsWith('dim') && t.length > 7 && pts[0]?.ref && p.length === 3 ? 2 : n;
  const extra = { offset: param > 0 ? ` (distance ${param})` : ' (type a distance first)', fillet: ` (radius ${param || 0})`, chamfer: param > 0 ? ` (distance ${param})` : ' (type a distance first)' }[t] ?? '';
  return p[Math.min(i, p.length - 1)] + (n === 0 ? extra : '');
}
export const preview = (t, pts, cur) => pts.length && ['move', 'copy', 'rotate', 'mirror'].includes(t) ? make.line(pts[0].x, pts[0].y, cur.x, cur.y) : null;
export function click(t, pts, p, c) {
  const n = pts.length, ids = c.ids, a = pts[0], hit = () => c.pick(p), done = (apply, message, next = []) => ({ apply, message, next });
  const first = what => { const h = hit(); return h ? h : null; };
  switch (t) {
    case 'block': return done(d => createBlock(d, c.param, ids, p), `Block "${c.param}" created from ${ids.length} object(s).`);
    case 'insert': return { entity: { type: 'insert', block: c.param.name, x: p.x, y: p.y, s: c.param.s, rot: c.param.rot }, next: [] };
    case 'move': return n ? done(d => X.transformIds(d, ids, TF.move(p.x - a.x, p.y - a.y), false), `Moved ${ids.length} object(s).`) : { next: [p] };
    case 'copy': return n ? done(d => X.transformIds(d, ids, TF.move(p.x - a.x, p.y - a.y), true), `Copied ${ids.length} object(s). Click another destination or press Esc.`, [a]) : { next: [p] };
    case 'rotate': return n ? done(d => X.transformIds(d, ids, TF.rotate(a, Math.atan2(p.y - a.y, p.x - a.x)), false), `Rotated ${ids.length} object(s).`) : { next: [p] };
    case 'scale': return n ? { error: 'Type the scale factor (e.g. 2) and press Enter.' } : { next: [p] };
    case 'mirror': return n ? done(d => X.transformIds(d, ids, TF.mirror(a, p), true), `Mirrored copy of ${ids.length} object(s) created.`) : { next: [p] };
    case 'offset': {
      if (!n) { const h = hit(); if (!h) return { error: 'Nothing to offset there.' }; if (!(c.param > 0)) return { error: 'Type the offset distance first, e.g. OFFSET 5.' }; return { next: [{ ...p, id: h.id }] }; }
      return done(d => { const e = d.get(a.id); d.add({ ...X.offsetEntity(e, c.param, p), layer: e.layer, color: e.color }); }, 'Offset created.'); }
    case 'trim': case 'extend': { const h = hit(); if (!h) return { error: 'Click on a line.' };
      return done(d => (t === 'trim' ? X.trimLine : X.extendLine)(d, d.get(h.id), p), t === 'trim' ? 'Trimmed.' : 'Extended.'); }
    case 'fillet': case 'chamfer': { const h = hit(); if (!h) return { error: 'Click on a line.' }; if (!n) return { next: [{ ...p, id: h.id }] };
      return done(d => X.corner(d, a.id, h.id, a, p, t, c.param || 0), t === 'fillet' ? 'Fillet created.' : 'Chamfer created.'); }
    case 'dimaligned': case 'dimlinear': {
      const dt = t.slice(3);
      if (!n) { const h = hit(); return { next: [h?.type === 'line' ? { ...p, ref: h.id } : p] }; }
      if (a.ref) return { entity: { type: 'dim', dtype: dt, ref: a.ref, o: [p.x, p.y] }, next: [] };
      if (n === 1) return { next: [a, p] };
      return { entity: { type: 'dim', dtype: dt, p1: [a.x, a.y], p2: [pts[1].x, pts[1].y], o: [p.x, p.y] }, next: [] }; }
    case 'dimradius': case 'dimdiameter': {
      if (!n) { const h = hit(); return h && (h.type === 'circle' || h.type === 'arc') ? { next: [{ ...p, ref: h.id }] } : { error: 'Click a circle or arc.' }; }
      return { entity: { type: 'dim', dtype: t.slice(3), ref: a.ref, o: [p.x, p.y] }, next: [] }; }
  }
}
export function number(t, pts, n, c) {
  if (['offset', 'fillet', 'chamfer'].includes(t)) return { setParam: n };
  if (t === 'rotate' && pts.length === 1) return { apply: d => X.transformIds(d, c.ids, TF.rotate(pts[0], n * DEG), false), message: `Rotated by ${n}°.`, next: [] };
  if (t === 'scale' && pts.length === 1) return { apply: d => X.transformIds(d, c.ids, TF.scale(pts[0], n), false), message: `Scaled by ${n}.`, next: [] };
  return { error: 'A number is not expected here.' };
}
