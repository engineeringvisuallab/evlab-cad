import { expand } from '../geometry/expand.js';
import * as TF from '../geometry/transforms.js';
import { titleBlockItems } from './title-block.js';
import { bounds } from '../core/entity.js';
export const SIZES = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841] };
export const SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000, 2000, 5000];
export const defaultLayout = () => ({ size: 'A3', orientation: 'landscape', title: 'Untitled drawing', number: 'EV-001', project: 'Project', revision: 'A', scale: 100, center: [0, 0], northArrow: true });
export const sheetSize = l => { const [a, b] = SIZES[l.size]; return l.orientation === 'portrait' ? [a, b] : [b, a]; };
export const viewportRect = l => { const [W, H] = sheetSize(l); return { x: 11, y: 31, w: W - 22, h: H - 42 }; };
export const unitMM = d => d.units === 'm' ? 1000 : 1;
export function validateLayout(l) {
  if (!SIZES[l.size]) return `unknown sheet size "${l.size}"`; if (l.orientation !== 'landscape' && l.orientation !== 'portrait') return 'orientation must be landscape or portrait';
  if (!(l.scale > 0) || !Number.isFinite(l.scale)) return 'scale must be greater than 0'; if (!Array.isArray(l.center) || l.center.length !== 2 || !l.center.every(Number.isFinite)) return 'viewport centre must be two numbers';
  return null;
}
function item(t, lw) {
  switch (t.type) {
    case 'line': return { t: 'line', x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2, lw };
    case 'polyline': return { t: 'poly', pts: t.pts, closed: t.closed, fill: t.fill, lw };
    case 'circle': return { t: 'circle', cx: t.cx, cy: t.cy, r: t.r, lw };
    case 'arc': return { t: 'arc', cx: t.cx, cy: t.cy, r: t.r, a0: t.a0, a1: t.a1, lw };
    case 'text': return { t: 'text', x: t.x, y: t.y, h: t.h, rot: t.rot, str: t.str, center: t.center, lw };
  }
}
// One sheet description (paper mm, Y up) drives the on-screen preview, the PDF and the SVG, so all three show the same geometry.
export function buildSheet(d) {
  const l = d.layout, [W, H] = sheetSize(l), vp = viewportRect(l), k = unitMM(d) / l.scale, items = titleBlockItems(l, W, H, vp);
  const T = { pt: (x, y) => [vp.x + vp.w / 2 + (x - l.center[0]) * k, vp.y + vp.h / 2 + (y - l.center[1]) * k], r: k, da: a => a, flip: false };
  for (const e of d.entities) {
    const L = d.layer(e.layer); if (!L || !L.visible || L.frozen || !L.plot) continue; const lw = Math.max(0.05, L.lineWeight);
    for (const x of expand(d, e)) items.push({ ...item(TF.apply(x, T), lw), clip: true });
  }
  return { W, H, items, clip: vp };
}
export function fitLayout(d) {
  const plot = d.shapes(e => { const L = d.layer(e.layer); return L && L.visible && !L.frozen && L.plot; }).map(bounds), vp = viewportRect(d.layout); if (!plot.length) return { scale: 100, center: [0, 0] };
  const ex = plot.reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) })); // only what will print
  const w = Math.max(ex.maxX - ex.minX, 1e-9) * unitMM(d), h = Math.max(ex.maxY - ex.minY, 1e-9) * unitMM(d);
  const scale = SCALES.find(s => w / s <= vp.w * 0.9 && h / s <= vp.h * 0.9) ?? SCALES.at(-1);
  return { scale, center: [(ex.minX + ex.maxX) / 2, (ex.minY + ex.maxY) / 2] };
}
