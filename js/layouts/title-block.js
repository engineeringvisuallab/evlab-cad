// Border + title strip + viewport frame + optional north arrow, as paper-space items (millimetres, origin bottom-left).
export function titleBlockItems(l, W, H, vp) {
  const m = 10, sh = 20, it = [], line = (x1, y1, x2, y2, lw) => it.push({ t: 'line', x1, y1, x2, y2, lw });
  it.push({ t: 'poly', pts: [[m, m], [W - m, m], [W - m, H - m], [m, H - m]], closed: true, lw: 0.7 });
  line(m, m + sh, W - m, m + sh, 0.5);
  const cols = [0, 0.3, 0.6, 0.74, 0.87, 1], X = i => m + (W - 2 * m) * cols[i], labels = ['PROJECT', 'TITLE', 'DRAWING NO.', 'REVISION', 'SCALE'], vals = [l.project, l.title, l.number, l.revision, '1:' + l.scale];
  for (let i = 1; i < 5; i++) line(X(i), m, X(i), m + sh, 0.35);
  labels.forEach((lab, i) => { const w = X(i + 1) - X(i) - 4, s = String(vals[i]);
    it.push({ t: 'text', x: X(i) + 2, y: m + sh - 4, h: 2, rot: 0, str: lab }); it.push({ t: 'text', x: X(i) + 2, y: m + 6, h: Math.min(4.5, w / (0.55 * Math.max(1, s.length))), rot: 0, str: s }); });
  it.push({ t: 'poly', pts: [[vp.x, vp.y], [vp.x + vp.w, vp.y], [vp.x + vp.w, vp.y + vp.h], [vp.x, vp.y + vp.h]], closed: true, lw: 0.25 });
  if (l.northArrow) { const cx = vp.x + vp.w - 12, cy = vp.y + vp.h - 14, P = ([a, b]) => [cx + a, cy + b];
    it.push({ t: 'circle', cx, cy, r: 5, lw: 0.35 }); it.push({ t: 'poly', pts: [[0, 5], [-2.5, -3], [0, -1], [2.5, -3]].map(P), closed: true, fill: true, lw: 0.25 });
    it.push({ t: 'text', x: cx, y: cy + 6.5, h: 3.5, rot: 0, str: 'N', center: true }); }
  return it;
}
