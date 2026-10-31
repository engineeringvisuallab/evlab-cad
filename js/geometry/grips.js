import { dist } from '../core/entity.js';
// Grip order matches entity.js grips(): line [start, mid, end]; polyline vertices; circle [centre, +x, +y, -x, -y]; arc [centre, start, end]; single-point objects [base].
export function moveGrip(e, i, p) {
  const c = structuredClone(e);
  switch (e.type) {
    case 'line': if (i === 0) { c.x1 = p.x; c.y1 = p.y; } else if (i === 2) { c.x2 = p.x; c.y2 = p.y; }
      else { const dx = p.x - (e.x1 + e.x2) / 2, dy = p.y - (e.y1 + e.y2) / 2; c.x1 += dx; c.y1 += dy; c.x2 += dx; c.y2 += dy; } break;
    case 'polyline': c.pts[i] = [p.x, p.y]; break;
    case 'circle': if (i === 0) { c.cx = p.x; c.cy = p.y; } else c.r = dist(e.cx, e.cy, p.x, p.y); break;
    case 'arc': if (i === 0) { c.cx = p.x; c.cy = p.y; } else { const a = Math.atan2(p.y - e.cy, p.x - e.cx); if (i === 1) c.a0 = a; else c.a1 = a; } break;
    case 'text': case 'insert': case 'point': case 'xline': case 'ray': c.x = p.x; c.y = p.y; break;
    default: return null;
  }
  return c;
}
