import { make, dist } from '../core/entity.js';
// Click-driven tool state machine. pts = points picked so far. Returns {preview, done, keep, prompt}.
export const PROMPTS = {
  select: 'Click an object, or drag a box: left-to-right = window, right-to-left = crossing. Shift adds.',
  line: ['LINE: specify first point', 'LINE: specify next point (Esc or right-click to end)'],
  polyline: ['POLYLINE: specify start point', 'POLYLINE: next point (Enter, double-click or right-click to finish)'],
  rect: ['RECTANGLE: specify first corner', 'RECTANGLE: specify opposite corner'],
  circle: ['CIRCLE: specify center', 'CIRCLE: specify a point on the circle'],
  text: ['TEXT: specify insertion point', 'TEXT: type the text and press Enter (\\n = new line; empty Enter cancels)'],
  point: ['POINT: specify a point (Esc to finish)'], xline: ['XLINE: specify a base point', 'XLINE: specify a point it passes through (Esc to finish)'], ray: ['RAY: specify the start point', 'RAY: specify a point it passes through (Esc to finish)'],
  dist: ['DIST: specify first point', 'DIST: specify second point'],
  arc: ['ARC: specify center', 'ARC: specify start point (sets radius)', 'ARC: specify end point (counter-clockwise)'],
};
export function prompt(tool, n) { const p = PROMPTS[tool]; return typeof p === 'string' ? p : p[Math.min(n, p.length - 1)]; }
const ang = (c, p) => Math.atan2(p.y - c.y, p.x - c.x);
export function preview(tool, pts, cur) {
  const n = pts.length; if (!n) return null; const a = pts[0];
  switch (tool) {
    case 'line': return make.line(pts[n - 1].x, pts[n - 1].y, cur.x, cur.y);
    case 'polyline': return make.polyline([...pts, cur].map(p => [p.x, p.y]));
    case 'rect': return make.rect(a, cur);
    case 'circle': return make.circle(a.x, a.y, dist(a.x, a.y, cur.x, cur.y));
    case 'dist': case 'xline': case 'ray': return make.line(a.x, a.y, cur.x, cur.y);
    case 'arc': return n === 1 ? make.line(a.x, a.y, cur.x, cur.y) : make.arc(a.x, a.y, dist(a.x, a.y, pts[1].x, pts[1].y), ang(a, pts[1]), ang(a, cur));
  }
}
// After a click: entity to commit (or null) and whether the tool restarts, continues from the last point, or keeps collecting.
export function click(tool, pts, p) {
  const n = pts.length;
  switch (tool) {
    case 'line': return n ? { entity: make.line(pts[0].x, pts[0].y, p.x, p.y), next: [p] } : { next: [p] };
    case 'polyline': return { next: [...pts, p] };
    case 'rect': return n ? { entity: make.rect(pts[0], p), next: [] } : { next: [p] };
    case 'circle': return n ? { entity: make.circle(pts[0].x, pts[0].y, dist(pts[0].x, pts[0].y, p.x, p.y)), next: [] } : { next: [p] };
    case 'text': return { next: [p] };
    case 'point': return { entity: { type: 'point', x: p.x, y: p.y }, next: [] };
    case 'xline': case 'ray': return n ? { entity: { type: tool, x: pts[0].x, y: pts[0].y, a: Math.atan2(p.y - pts[0].y, p.x - pts[0].x) }, next: [pts[0]] } : { next: [p] };
    case 'dist': { if (!n) return { next: [p] }; const dx = p.x - pts[0].x, dy = p.y - pts[0].y;
      return { message: `Distance ${Math.hypot(dx, dy).toFixed(4)}, angle ${((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360).toFixed(4)}°, ΔX ${dx.toFixed(4)}, ΔY ${dy.toFixed(4)}`, next: [] }; }
    case 'arc': return n === 2 ? { entity: make.arc(pts[0].x, pts[0].y, dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y), ang(pts[0], pts[1]), ang(pts[0], p)), next: [] } : { next: [...pts, p] };
  }
}
export function finishPolyline(pts) {
  const u = pts.filter((p, i) => !i || dist(p.x, p.y, pts[i - 1].x, pts[i - 1].y) > 1e-9); // drop double-click duplicates
  return u.length >= 2 ? make.polyline(u.map(p => [p.x, p.y])) : null;
}
