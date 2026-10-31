import * as TF from './transforms.js';
import { resolveDim } from './dimensions.js';
// Turns "compound" entities into plain primitives (line, polyline, circle, arc, text). Used for drawing, picking, plotting and DXF export.
export function expand(d, e) {
  if (e.type === 'dim') {
    const g = resolveDim(d, e); if (!g) return []; const ds = d.dimStyle, k = ds.auto ? d.layout.scale / (d.units === 'm' ? 1000 : 1) : 1, st = { arrow: ds.auto ? 2.5 * k : ds.arrow, text: ds.auto ? 2.5 * k : ds.text };
    const out = g.lines.map(l => ({ type: 'line', x1: l[0], y1: l[1], x2: l[2], y2: l[3] }));
    for (const a of g.arrows) { const P = t => [a.x + st.arrow * Math.cos(a.a + t), a.y + st.arrow * Math.sin(a.a + t)]; out.push({ type: 'polyline', pts: [[a.x, a.y], P(0.35), P(-0.35)], closed: true, fill: true }); }
    const t = g.text; out.push({ type: 'text', x: t.x - Math.sin(t.a) * st.text * 0.8, y: t.y + Math.cos(t.a) * st.text * 0.8, h: st.text, rot: t.a, str: t.str, center: true });
    return out;
  }
  if (e.type === 'insert') {
    const b = d.blocks[e.block]; if (!b) return []; const c = Math.cos(e.rot), s = Math.sin(e.rot);
    const T = { pt: (x, y) => { const dx = (x - b.base[0]) * e.s, dy = (y - b.base[1]) * e.s; return [e.x + dx * c - dy * s, e.y + dx * s + dy * c]; }, r: e.s, da: a => a + e.rot, flip: false };
    return b.entities.map(be => { const t = TF.apply(be, T); t.color = be.color && be.color !== 'BYLAYER' ? be.color : e.color; return t; });
  }
  return [e];
}
