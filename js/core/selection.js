import { distance, bounds } from './entity.js';
export function pick(entities, x, y, tol) {
  let best = null, bd = tol;
  for (const e of entities) { const d = distance(e, x, y); if (d <= bd) { bd = d; best = e; } }
  return best;
}
// Window = entity bounding box fully inside box. Crossing = bounding box touches box (bbox-based approximation).
export function boxSelect(entities, a, b, crossing) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return entities.filter(e => { const t = bounds(e);
    return crossing ? t.maxX >= x0 && t.minX <= x1 && t.maxY >= y0 && t.minY <= y1 : t.minX >= x0 && t.maxX <= x1 && t.minY >= y0 && t.maxY <= y1; });
}
