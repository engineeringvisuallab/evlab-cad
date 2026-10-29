import { Viewport } from './core/viewport.js';
import { Drawing } from './core/document.js';
import { Renderer } from './renderer/canvas-renderer.js';
import { pick, boxSelect } from './core/selection.js';
import * as T from './tools/draw-tools.js';
import { createPanel } from './ui/properties-panel.js';

const canvas = document.getElementById('cad');
const drawing = new Drawing(), vp = new Viewport(), renderer = new Renderer(canvas, vp);
const $ = id => document.getElementById(id);
let panTool = false, space = false, panDrag = null;
let tool = 'select', pts = [], cur = { x: 0, y: 0 }, sel = new Set(), selStart = null, box = null;

const say = m => $('prompt').textContent = m;
const panel = createPanel($('props-body'), drawing, () => [...sel], () => update(), say);
function update() { renderer.render(drawing, sel, T.preview(tool, pts, cur), box); $('zoom').textContent = `Scale ${vp.scale.toPrecision(4)} px/unit`; }
function setSel(ids) { sel = new Set(ids); panel.render(); update(); }
function home() { vp.cx = 50; vp.cy = 30; vp.scale = 5; }
function setPan(on) { panTool = on; $('btn-pan').classList.toggle('on', on); }
function setTool(t) {
  tool = t; pts = []; box = null; selStart = null; setPan(false);
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t && b.closest('#toolbar')));
  canvas.style.cursor = 'crosshair'; say(T.prompt(t, 0)); update(); canvas.focus();
}
function commit(e) { try { const a = drawing.add(e); setSel([a.id]); return true; } catch (err) { say(err.message); return false; } }
function finish() {
  if (tool === 'polyline') { const e = T.finishPolyline(pts); pts = []; if (e) commit(e); else say('Polyline needs at least 2 distinct points.'); }
  else { pts = []; }
  say(T.prompt(tool, 0)); update();
}
function drawClick(p) {
  const r = T.click(tool, pts, p);
  if (r.entity && !commit(r.entity)) return update();
  pts = r.next; if (!r.entity) say(T.prompt(tool, pts.length)); else if (tool === 'line') say(T.prompt(tool, 1)); else say(T.prompt(tool, 0));
  update();
}
function deleteSel() { if (!sel.size) return say('Nothing selected.'); const n = drawing.remove([...sel]); say(`Deleted ${n} object(s). (Undo arrives in Milestone 4.)`); setSel([]); }

const zoomCenter = f => { vp.zoomAt(vp.w / 2, vp.h / 2, f); update(); };
const actions = {
  'zoom-in': () => zoomCenter(1.25), 'zoom-out': () => zoomCenter(0.8),
  extents: () => { const e = drawing.extents(); e ? vp.fit(e) : home(); update(); },
  reset: () => { home(); update(); },
  grid: () => { renderer.showGrid = !renderer.showGrid; $('btn-grid').classList.toggle('on', renderer.showGrid); update(); },
  pan: () => setPan(!panTool), delete: deleteSel,
  'select-all': () => { setTool('select'); setSel(drawing.entities.map(e => e.id)); }, deselect: () => setSel([]),
  'units-mm': () => { drawing.units = 'mm'; $('units').textContent = 'mm'; }, 'units-m': () => { drawing.units = 'm'; $('units').textContent = 'm'; },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (a) return actions[a.dataset.act]?.();
  const t = e.target.closest('[data-tool]'); if (t) setTool(t.dataset.tool);
});

const local = e => { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
canvas.addEventListener('wheel', e => { e.preventDefault(); const l = local(e); vp.zoomAt(l.sx, l.sy, e.deltaY < 0 ? 1.15 : 1 / 1.15); update(); }, { passive: false });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (tool !== 'select') finish(); });
canvas.addEventListener('dblclick', () => { if (tool === 'polyline') finish(); });
canvas.addEventListener('pointerdown', e => {
  canvas.focus(); const l = local(e), w = vp.toWorld(l.sx, l.sy);
  if (e.button === 1 || (e.button === 0 && (panTool || space))) { panDrag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('panning'); return e.preventDefault(); }
  if (e.button !== 0) return;
  if (tool === 'select') { selStart = { ...l, w, shift: e.shiftKey }; canvas.setPointerCapture(e.pointerId); } else drawClick(w);
});
canvas.addEventListener('pointermove', e => {
  const l = local(e); cur = vp.toWorld(l.sx, l.sy);
  $('coords').textContent = `X ${cur.x.toFixed(3)}  Y ${cur.y.toFixed(3)}`;
  if (panDrag) { vp.panBy(e.clientX - panDrag.x, e.clientY - panDrag.y); panDrag = { x: e.clientX, y: e.clientY }; }
  else if (selStart && Math.hypot(l.sx - selStart.sx, l.sy - selStart.sy) > 4) box = { a: selStart, b: l, crossing: l.sx < selStart.sx };
  update();
});
canvas.addEventListener('pointerup', e => {
  panDrag = null; canvas.classList.remove('panning');
  if (!selStart) return;
  const l = local(e), s = selStart; selStart = null;
  if (box) { const hits = boxSelect(drawing.entities, s.w, cur, box.crossing).map(x => x.id); box = null; setSel(s.shift ? [...sel, ...hits] : hits); }
  else { const hit = pick(drawing.entities, s.w.x, s.w.y, 6 / vp.scale);
    if (!hit) setSel(s.shift ? [...sel] : []); else if (s.shift) { const n = new Set(sel); n.has(hit.id) ? n.delete(hit.id) : n.add(hit.id); setSel([...n]); } else setSel([hit.id]); }
});
addEventListener('keydown', e => {
  const typing = e.target.tagName === 'INPUT';
  if (e.code === 'Space' && !typing) space = true;
  if (e.key === 'F7') { e.preventDefault(); actions.grid(); }
  if (e.key === 'Escape') { pts = []; box = null; selStart = null; if (tool === 'select') setSel([]); else { say(T.prompt(tool, 0)); update(); } }
  if (typing) return;
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSel();
  if (e.key === 'Enter' && tool !== 'select') finish();
});
addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
addEventListener('resize', () => { renderer.resize(); update(); });

$('btn-grid').classList.add('on');
renderer.resize(); home(); setTool('select'); panel.render();
