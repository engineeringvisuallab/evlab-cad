import { segments, inSweep, dist, norm } from '../core/entity.js';
function segSeg(a, b) {
  const [x1, y1, x2, y2] = a, [x3, y3, x4, y4] = b, d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) } : null;
}
function foot(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}
const onCircle = (e, p) => { const d = dist(p.x, p.y, e.cx, e.cy) || 1; return { x: e.cx + e.r * (p.x - e.cx) / d, y: e.cy + e.r * (p.y - e.cy) / d }; };
// Real geometry only. Intersections: line/polyline segments (circle/arc intersections not yet supported).
export function snapPoint(ents, p, tol, modes, last) {
  const c = [], add = (x, y, type) => { const d = dist(x, y, p.x, p.y); if (d <= tol) c.push({ x, y, type, d }); };
  const cand = [];
  for (const e of ents) {
    const segs = segments(e), isArc = e.type === 'arc', isRound = isArc || e.type === 'circle';
    if (modes.end) { if (e.type === 'line') { add(e.x1, e.y1, 'end'); add(e.x2, e.y2, 'end'); } else if (e.type === 'polyline') e.pts.forEach(q => add(q[0], q[1], 'end'));
      else if (isArc) { add(e.cx + e.r * Math.cos(e.a0), e.cy + e.r * Math.sin(e.a0), 'end'); add(e.cx + e.r * Math.cos(e.a1), e.cy + e.r * Math.sin(e.a1), 'end'); } }
    if (modes.mid) { segs.forEach(s => add((s[0] + s[2]) / 2, (s[1] + s[3]) / 2, 'mid'));
      if (isArc) { const m = e.a0 + norm(e.a1 - e.a0) / 2; add(e.cx + e.r * Math.cos(m), e.cy + e.r * Math.sin(m), 'mid'); } }
    if (modes.cen && isRound) add(e.cx, e.cy, 'cen');
    if (modes.per && last) { segs.forEach(s => { const f = foot(last.x, last.y, s); if (f.t >= 0 && f.t <= 1) add(f.x, f.y, 'per'); });
      if (isRound) { const q = onCircle(e, last); if (!isArc || inSweep(Math.atan2(q.y - e.cy, q.x - e.cx), e.a0, e.a1)) add(q.x, q.y, 'per'); } }
    if (modes.int) segs.forEach(s => { const f = foot(p.x, p.y, s); if (dist(p.x, p.y, f.x, f.y) <= tol * 2) cand.push({ s, id: e.id }); });
    if (modes.nea) { segs.forEach(s => { const f = foot(p.x, p.y, s), t = Math.max(0, Math.min(1, f.t)); add(s[0] + t * (s[2] - s[0]), s[1] + t * (s[3] - s[1]), 'nea'); });
      if (isRound) { const q = onCircle(e, p); if (!isArc || inSweep(Math.atan2(q.y - e.cy, q.x - e.cx), e.a0, e.a1)) add(q.x, q.y, 'nea'); } }
  }
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) if (cand[i].id !== cand[j].id) { const q = segSeg(cand[i].s, cand[j].s); if (q) add(q.x, q.y, 'int'); }
  const best = a => a.sort((m, n) => m.d - n.d)[0] || null;
  return best(c.filter(s => s.type !== 'nea')) || best(c);
}
