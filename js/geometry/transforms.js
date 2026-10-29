// A transform T = { pt(x,y)->[x,y], r (radius factor), da(angle)->angle, flip (reverses arc direction) }.
export const move = (dx, dy) => ({ pt: (x, y) => [x + dx, y + dy], r: 1, da: a => a, flip: false });
export const rotate = (c, t) => ({ pt: (x, y) => { const dx = x - c.x, dy = y - c.y; return [c.x + dx * Math.cos(t) - dy * Math.sin(t), c.y + dx * Math.sin(t) + dy * Math.cos(t)]; }, r: 1, da: a => a + t, flip: false });
export const scale = (c, k) => { if (!(k > 0) || !Number.isFinite(k)) throw new Error('Scale factor must be a number greater than 0.'); return { pt: (x, y) => [c.x + (x - c.x) * k, c.y + (y - c.y) * k], r: k, da: a => a, flip: false }; };
export function mirror(p1, p2) {
  const phi = Math.atan2(p2.y - p1.y, p2.x - p1.x); if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-9) throw new Error('Mirror axis points are the same.');
  const c = Math.cos(2 * phi), s = Math.sin(2 * phi);
  return { pt: (x, y) => { const dx = x - p1.x, dy = y - p1.y; return [p1.x + dx * c + dy * s, p1.y + dx * s - dy * c]; }, r: 1, da: a => 2 * phi - a, flip: true };
}
export function apply(e, T) {
  const o = structuredClone(e);
  if (o.type === 'line') { [o.x1, o.y1] = T.pt(o.x1, o.y1); [o.x2, o.y2] = T.pt(o.x2, o.y2); }
  else if (o.type === 'polyline') o.pts = o.pts.map(p => T.pt(p[0], p[1]));
  else if (o.type === 'circle') { [o.cx, o.cy] = T.pt(o.cx, o.cy); o.r *= T.r; }
  else if (o.type === 'arc') { [o.cx, o.cy] = T.pt(o.cx, o.cy); o.r *= T.r; const a0 = T.da(e.a0), a1 = T.da(e.a1); o.a0 = T.flip ? a1 : a0; o.a1 = T.flip ? a0 : a1; }
  else if (o.type === 'dim') for (const k of ['p1', 'p2', 'o']) if (o[k]) o[k] = T.pt(o[k][0], o[k][1]);
  return o;
}
