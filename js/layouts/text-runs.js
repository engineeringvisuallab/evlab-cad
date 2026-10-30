// Approximate Helvetica width; shared by PDF and SVG so both place text identically.
export const textWidth = (s, h) => 0.55 * h * s.length;
export function textRuns(t) {
  const c = Math.cos(t.rot), s = Math.sin(t.rot);
  return t.str.split('\n').map((str, i) => { const u = t.center ? -textWidth(str, t.h) / 2 : 0, v = -1.4 * t.h * i; return { x: t.x + u * c - v * s, y: t.y + u * s + v * c, str }; });
}
