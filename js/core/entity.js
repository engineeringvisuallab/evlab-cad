// Entity model. All geometry is in world units. Angles are radians, CCW, from +X.
export const TAU = Math.PI * 2;
export const norm = a => ((a % TAU) + TAU) % TAU;
const fin = (...v) => v.every(Number.isFinite);
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const inSweep = (a, a0, a1) => norm(a - a0) <= norm(a1 - a0);
export function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}
export const make = {
  line: (x1, y1, x2, y2) => ({ type: 'line', x1, y1, x2, y2 }),
  polyline: (pts, closed = false) => ({ type: 'polyline', pts: pts.map(p => [p[0], p[1]]), closed }),
  rect: (a, b) => make.polyline([[a.x, a.y], [b.x, a.y], [b.x, b.y], [a.x, b.y]], true),
  circle: (cx, cy, r) => ({ type: 'circle', cx, cy, r }),
  arc: (cx, cy, r, a0, a1) => ({ type: 'arc', cx, cy, r, a0, a1 }),
};
export function validate(e) {
  const bad = m => `Invalid ${e.type}: ${m}`;
  switch (e.type) {
    case 'line': if (!fin(e.x1, e.y1, e.x2, e.y2)) return bad('coordinates must be numbers');
      return dist(e.x1, e.y1, e.x2, e.y2) < 1e-9 ? bad('start and end are the same point') : null;
    case 'polyline': if (!Array.isArray(e.pts) || e.pts.length < 2 || !e.pts.every(p => fin(p[0], p[1]))) return bad('needs at least 2 numeric vertices');
      return length(e) < 1e-9 ? bad('zero length') : null;
    case 'text': return !fin(e.x, e.y, e.h, e.rot) || typeof e.str !== 'string' || !e.str.trim() ? bad('needs a position, height and text') : e.h <= 0 ? bad('height must be greater than 0') : null;
    case 'insert': return typeof e.block !== 'string' || !fin(e.x, e.y, e.s, e.rot) ? bad('needs a block name, position, scale and rotation') : e.s <= 0 ? bad('scale must be greater than 0') : null;
    case 'dim': return ['aligned', 'linear', 'radius', 'diameter'].includes(e.dtype) && Array.isArray(e.o) && fin(...e.o) ? null : bad('needs a type and a position');
    case 'circle': return !fin(e.cx, e.cy, e.r) ? bad('values must be numbers') : e.r <= 0 ? bad('radius must be greater than 0') : null;
    case 'arc': return !fin(e.cx, e.cy, e.r, e.a0, e.a1) ? bad('values must be numbers') : e.r <= 0 ? bad('radius must be greater than 0')
      : Math.abs(norm(e.a1 - e.a0)) < 1e-9 ? bad('start and end angles are the same') : null;
  }
  return `Unknown entity type "${e.type}"`;
}
export function textBox(e) { // approximate: width 0.6*h per character, lines 1.4*h apart
  const L = e.str.split('\n'), w = 0.6 * e.h * Math.max(...L.map(s => s.length)); return { u0: e.center ? -w / 2 : 0, u1: e.center ? w / 2 : w, v0: -1.4 * e.h * (L.length - 1) - 0.25 * e.h, v1: e.h };
}
export function segments(e) {
  if (e.type === 'line') return [[e.x1, e.y1, e.x2, e.y2]];
  if (e.type !== 'polyline') return [];
  const s = []; for (let i = 0; i < e.pts.length - 1; i++) s.push([...e.pts[i], ...e.pts[i + 1]]);
  if (e.closed) s.push([...e.pts[e.pts.length - 1], ...e.pts[0]]);
  return s;
}
export function length(e) {
  if (e.type === 'circle') return TAU * e.r;
  if (e.type === 'arc') return e.r * norm(e.a1 - e.a0);
  return segments(e).reduce((s, g) => s + dist(...g), 0);
}
export function bounds(e) {
  let xs, ys;
  if (e.type === 'line') { xs = [e.x1, e.x2]; ys = [e.y1, e.y2]; }
  else if (e.type === 'polyline') { xs = e.pts.map(p => p[0]); ys = e.pts.map(p => p[1]); }
  else if (e.type === 'text') { const b = textBox(e), c = Math.cos(e.rot), s = Math.sin(e.rot), P = [[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]].map(([u, v]) => [e.x + u * c - v * s, e.y + u * s + v * c]); xs = P.map(p => p[0]); ys = P.map(p => p[1]); }
  else if (e.type === 'circle') { xs = [e.cx - e.r, e.cx + e.r]; ys = [e.cy - e.r, e.cy + e.r]; }
  else {
    const as = [e.a0, e.a1, 0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].filter((a, i) => i < 2 || inSweep(a, e.a0, e.a1));
    xs = as.map(a => e.cx + e.r * Math.cos(a)); ys = as.map(a => e.cy + e.r * Math.sin(a));
  }
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
export function distance(e, x, y) {
  if (e.type === 'text') { const b = textBox(e), c = Math.cos(e.rot), s = Math.sin(e.rot), u = (x - e.x) * c + (y - e.y) * s, v = -(x - e.x) * s + (y - e.y) * c; return Math.hypot(Math.max(b.u0 - u, 0, u - b.u1), Math.max(b.v0 - v, 0, v - b.v1)); }
  if (e.type === 'circle') return Math.abs(dist(x, y, e.cx, e.cy) - e.r);
  if (e.type === 'arc') {
    if (inSweep(Math.atan2(y - e.cy, x - e.cx), e.a0, e.a1)) return Math.abs(dist(x, y, e.cx, e.cy) - e.r);
    return Math.min(dist(x, y, e.cx + e.r * Math.cos(e.a0), e.cy + e.r * Math.sin(e.a0)), dist(x, y, e.cx + e.r * Math.cos(e.a1), e.cy + e.r * Math.sin(e.a1)));
  }
  return Math.min(...segments(e).map(s => segDist(x, y, ...s)));
}
export function grips(e) {
  switch (e.type) {
    case 'line': return [[e.x1, e.y1], [(e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2], [e.x2, e.y2]];
    case 'polyline': return e.pts;
    case 'text': case 'insert': return [[e.x, e.y]];
    case 'circle': return [[e.cx, e.cy], [e.cx + e.r, e.cy], [e.cx, e.cy + e.r], [e.cx - e.r, e.cy], [e.cx, e.cy - e.r]];
    case 'arc': return [[e.cx, e.cy], [e.cx + e.r * Math.cos(e.a0), e.cy + e.r * Math.sin(e.a0)], [e.cx + e.r * Math.cos(e.a1), e.cy + e.r * Math.sin(e.a1)]];
  }
  return [];
}
