import { Viewport } from './core/viewport.js';
import { Drawing } from './core/document.js';
import { Renderer } from './renderer/canvas-renderer.js';
import { gridSteps } from './renderer/grid.js';
import { snapPoint } from './renderer/snapping.js';
import { pick, boxSelect } from './core/selection.js';
import { parsePoint, parseNumber, orthoPoint } from './core/coordinates.js';
import { ALIASES, PLANNED, TOOL_OF } from './core/commands.js';
import * as T from './tools/draw-tools.js';
import * as M from './tools/modify-tools.js';
import * as H from './core/history.js';
import * as X from './geometry/modify.js';
import { createPanel } from './ui/properties-panel.js';
import { createLayerPanel } from './ui/layer-panel.js';

const canvas = document.getElementById('cad'), $ = id => document.getElementById(id);
const drawing = new Drawing(), vp = new Viewport(), renderer = new Renderer(canvas, vp);
let panTool = false, space = false, panDrag = null, tool = 'select', pts = [], lastPt = null, cur = { x: 0, y: 0 }, snap = null;
let sel = new Set(), selStart = null, box = null, lastCmd = '';
const modes = { end: 1, mid: 1, cen: 1, int: 1, per: 1, nea: 0 }, flags = { osnap: true, gsnap: false, ortho: false };
const hist = []; let hi = 0; const param = {};

function log(m) { const d = document.createElement('div'); d.textContent = m; const l = $('cmdlog'); l.append(d); while (l.children.length > 60) l.firstChild.remove(); l.scrollTop = 1e9; }
function say(m) { $('prompt').textContent = m; log(m); }
const panel = createPanel($('props-body'), drawing, () => [...sel], () => changed(), say, tx);
const layers = createLayerPanel($('layers-body'), drawing, () => [...sel], () => changed(), say, tx);
function changed() { sel = new Set([...sel].filter(id => { const e = drawing.get(id); return e && drawing.isSelectable(e); })); layers.render(); panel.render(); update(); }
function update() {
  renderer.render(drawing, sel, previewOf(), box, snap);
  $('zoom').textContent = `Scale ${vp.scale.toPrecision(4)} px/unit`;
  for (const k of ['osnap', 'gsnap', 'ortho']) $('b-' + k).classList.toggle('on', flags[k]);
}
function setSel(ids) { sel = new Set(ids); panel.render(); update(); }
function home() { vp.cx = 50; vp.cy = 30; vp.scale = 5; }
function setPan(on) { panTool = on; $('btn-pan').classList.toggle('on', on); }
function P(t, n) { return M.isModify(t) ? M.prompt(t, n, param[t], pts) : T.prompt(t, n); }
function previewOf() { return M.isModify(tool) ? M.preview(tool, pts, cur) : T.preview(tool, pts, cur); }
function tx(fn) { const before = H.snapshot(drawing); try { fn(); H.commit(before, drawing); return true; } catch (e) { H.restore(drawing, before); say(e.message); return false; } }
function doUndo(redo) { const ok = redo ? H.redo(drawing) : H.undo(drawing); say(ok ? (redo ? 'Redo.' : 'Undo.') : `Nothing to ${redo ? 'redo' : 'undo'}.`); changed(); }
const mctx = () => ({ ids: [...sel], param: param[tool], pick: p => pick(drawing.shapes(e => drawing.isSelectable(e)), p.x, p.y, 6 / vp.scale) });
function modResult(r) {
  if (r.error) { say(r.error); return update(); }
  if (r.setParam !== undefined) { if (!(r.setParam >= 0)) say('Value must be 0 or more.'); else { param[tool] = r.setParam; say(`${tool}: value set to ${r.setParam}.`); } return update(); }
  if (r.apply) { if (!tx(() => r.apply(drawing))) return update(); changed(); }
  if (r.entity && !commit(r.entity)) return update();
  pts = r.next ?? pts; say(r.message ?? P(tool, pts.length)); update();
}
function modClick(p) { lastPt = p; modResult(M.click(tool, pts, p, mctx())); }
function setTool(t) {
  if (M.needsSel(t) && !sel.size) return say(`Select objects first, then run ${t.toUpperCase()}.`);
  tool = t; pts = []; box = null; selStart = null; snap = null; setPan(false);
  document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  say(P(t, 0)); update(); canvas.focus();
}
// Raw world point -> effective point (object snap, else grid snap, then ortho).
function resolve(w) {
  snap = null; if (tool === 'select') return w;
  const from = pts.length ? pts[pts.length - 1] : null; let p = w;
  if (flags.osnap) snap = snapPoint(drawing.shapes(e => drawing.isVisible(e)), w, 10 / vp.scale, modes, from);
  if (snap) return { x: snap.x, y: snap.y };
  if (flags.gsnap) { const g = gridSteps(vp.scale).minor; p = { x: Math.round(w.x / g) * g, y: Math.round(w.y / g) * g }; }
  return flags.ortho && from ? orthoPoint(p, from) : p;
}
function commit(e) { let id; tx(() => { id = drawing.add(e).id; }); if (!id) return false; changed(); setSel([id]); return true; }
function finish() {
  if (tool === 'polyline') { const e = T.finishPolyline(pts); pts = []; if (e) commit(e); else say('Polyline needs at least 2 distinct points.'); } else pts = [];
  say(P(tool, 0)); update();
}
function drawClick(p) {
  lastPt = p; if (M.isModify(tool)) return modClick(p); const r = T.click(tool, pts, p);
  if (r.entity && !commit(r.entity)) return update();
  if (r.message) say(r.message);
  pts = r.next; if (!r.message) say(P(tool, r.entity && tool !== 'line' ? 0 : pts.length)); update();
}
function deleteSel() { if (!sel.size) return say('Nothing selected.'); let n = 0; if (!tx(() => { n = drawing.remove([...sel]); })) return; say(`Deleted ${n} object(s). Ctrl+Z undoes.`); setSel([]); }
const toggle = k => { flags[k] = !flags[k]; say(`${{ osnap: 'Object snap', gsnap: 'Grid snap', ortho: 'Ortho' }[k]} ${flags[k] ? 'on' : 'off'}`); update(); };
const zoomCenter = f => { vp.zoomAt(vp.w / 2, vp.h / 2, f); update(); };
const actions = {
  'zoom-in': () => zoomCenter(1.25), 'zoom-out': () => zoomCenter(0.8),
  extents: () => { const e = drawing.extents(); e ? vp.fit(e) : home(); update(); }, reset: () => { home(); update(); },
  grid: () => { renderer.showGrid = !renderer.showGrid; $('btn-grid').classList.toggle('on', renderer.showGrid); update(); },
  pan: () => setPan(!panTool), undo: () => doUndo(false), redo: () => doUndo(true), delete: deleteSel, osnap: () => toggle('osnap'), gsnap: () => toggle('gsnap'), ortho: () => toggle('ortho'),
  'select-all': () => { setTool('select'); setSel(drawing.entities.filter(e => drawing.isSelectable(e)).map(e => e.id)); }, deselect: () => setSel([]),
  'units-mm': () => { drawing.units = 'mm'; $('units').textContent = 'mm'; }, 'units-m': () => { drawing.units = 'm'; $('units').textContent = 'm'; },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (a) return actions[a.dataset.act]?.();
  const t = e.target.closest('[data-tool]'); if (t) setTool(t.dataset.tool);
  const c = e.target.closest('[data-cmd]'); if (c) runCommand(c.dataset.cmd);
});

// ---- command line ----
function direct(n) { // direct distance entry; modify tools take numbers as angle / factor / distance
  if (M.isModify(tool)) return modResult(M.number(tool, pts, n, mctx()));
  const from = pts[pts.length - 1];
  if ((tool === 'line' || tool === 'polyline') && from) { const dx = cur.x - from.x, dy = cur.y - from.y, d = Math.hypot(dx, dy);
    return d < 1e-9 ? say('Move the cursor to set a direction first.') : drawClick({ x: from.x + dx / d * n, y: from.y + dy / d * n }); }
  if (tool === 'circle' && from) return drawClick({ x: from.x + n, y: from.y });
  say('A number is not expected here. Enter a point such as 10,20.');
}
function exec(c, arg) {
  if (TOOL_OF[c]) { const t = TOOL_OF[c]; if (['offset', 'fillet', 'chamfer'].includes(t) && parseNumber(arg) !== null) { param[t] = +arg; arg = ''; } setTool(t); return arg && runCommand(arg); }
  const A = arg.toUpperCase();
  if (c === 'ERASE') return deleteSel();
  if (c === 'UNDO') return doUndo(false); if (c === 'REDO') return doUndo(true);
  if (c === 'EXPLODE' || c === 'JOIN') { let n = 0; if (tx(() => { c === 'EXPLODE' ? n = X.explodeIds(drawing, [...sel]) : X.joinIds(drawing, [...sel]); })) { say(c === 'EXPLODE' ? `Exploded ${n} object(s).` : 'Joined.'); sel = new Set(); changed(); } return; }
  if (c === 'ARRAY') { const v = A.split(/[\s,]+/).map(Number); if (v.length !== 4 || v.some(x => !Number.isFinite(x))) return say('ARRAY rows cols rowSpacing colSpacing, e.g. ARRAY 3 4 10 15 (select objects first).');
    if (tx(() => X.arrayIds(drawing, [...sel], v[0], v[1], v[2], v[3]))) { say(`Array created (${v[0]}×${v[1]}).`); changed(); } return; }
  if (c === 'AREA') return sel.size ? X.areaReport(drawing, [...sel]).forEach(say) : say('Select a closed polyline, rectangle or circle first.');
  if (c === 'PAN') { setPan(true); return say('Pan: drag with the mouse.'); }
  if (c === 'ZOOM') return A === '' || A === 'E' || A === 'EXTENTS' ? actions.extents() : A === 'IN' ? actions['zoom-in']() : A === 'OUT' ? actions['zoom-out']() : say('ZOOM options: E (extents), IN, OUT.');
  if (c === 'ORTHO') return toggle('ortho');
  if (c === 'SNAP') return toggle('gsnap');
  if (c === 'OSNAP') {
    if (!A) return toggle('osnap'); if (A === 'ON' || A === 'OFF') { flags.osnap = A === 'ON'; return update(); }
    const want = A.toLowerCase().split(/[\s,]+/).map(w => w.slice(0, 3)); const bad = want.filter(w => !(w in modes));
    if (bad.length) return say(`Unknown snap mode(s): ${bad.join(', ')}. Use END, MID, CEN, INT, PER, NEA.`);
    Object.keys(modes).forEach(k => modes[k] = want.includes(k) ? 1 : 0); flags.osnap = true; say('Object snaps: ' + want.join(', ')); return update();
  }
  if (c === 'LAYER') {
    if (!arg) return say('Layers: ' + drawing.layers.map(l => l.name + (l.name === drawing.current ? '*' : '')).join(', '));
    const l = drawing.layers.find(x => x.name.toLowerCase() === arg.toLowerCase());
    try { drawing.current = (l || drawing.addLayer(arg)).name; say(`Current layer: ${drawing.current}${l ? '' : ' (created)'}`); } catch (e) { say(e.message); }
    return changed();
  }
  if (c === 'HELP') say('Commands: LINE L, PLINE PL, CIRCLE C, ARC A, RECTANGLE REC, ERASE E, DIST DI, LAYER LA [name], ZOOM [E|IN|OUT], PAN, ORTHO, SNAP, OSNAP [modes]. Points: 100,200 · @50,0 · @100<45 · or a distance. Enter ends/repeats, Esc cancels. Modify: MOVE COPY ROTATE SCALE MIRROR OFFSET TRIM EXTEND FILLET CHAMFER EXPLODE JOIN ARRAY AREA UNDO REDO. Dimensions: DLI DAL DRA DDI. Not built: STRETCH, BREAK, DIMANGULAR, LEADER.');
}
function runCommand(text) {
  const t = text.trim(); log('> ' + t);
  if (!t) return tool !== 'select' && pts.length ? finish() : lastCmd ? runCommand(lastCmd) : undefined;
  if (/^[a-z]/i.test(t)) {
    const [w, ...r] = t.split(/\s+/), key = w.toUpperCase(), c = ALIASES[key];
    if (!c) return say(key in PLANNED ? `${w.toUpperCase()} is planned for ${PLANNED[key]}; not implemented yet.` : `Unknown command "${w}". Type HELP.`);
    lastCmd = t; return exec(c, r.join(' ').trim());
  }
  if (tool === 'select') return say('No active command. Start LINE, CIRCLE, ARC… first.');
  const p = parsePoint(t, pts[pts.length - 1] || lastPt);
  if (p) return p.error ? say(p.error) : drawClick(p);
  const n = parseNumber(t); n === null ? say(`Cannot read "${t}" as a point or a number.`) : direct(n);
}
const cin = $('cmdin');
cin.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const v = cin.value; cin.value = ''; if (v.trim()) { hist.push(v); hi = hist.length; } runCommand(v); e.stopPropagation(); }
  else if (e.key === 'ArrowUp') { if (hi > 0) cin.value = hist[--hi]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { cin.value = hi < hist.length - 1 ? hist[++hi] : ''; hi = Math.min(hi + 1, hist.length); e.preventDefault(); }
  else if (e.key === 'Escape') { cin.value = ''; pts = []; box = null; say(P(tool, 0)); update(); canvas.focus(); }
});

// ---- mouse ----
const local = e => { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
canvas.addEventListener('wheel', e => { e.preventDefault(); const l = local(e); vp.zoomAt(l.sx, l.sy, e.deltaY < 0 ? 1.15 : 1 / 1.15); update(); }, { passive: false });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (tool !== 'select') finish(); });
canvas.addEventListener('dblclick', () => { if (tool === 'polyline') finish(); });
canvas.addEventListener('pointerdown', e => {
  canvas.focus(); const l = local(e), w = vp.toWorld(l.sx, l.sy);
  if (e.button === 1 || (e.button === 0 && (panTool || space))) { panDrag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('panning'); return e.preventDefault(); }
  if (e.button !== 0) return;
  if (tool === 'select') { selStart = { ...l, w, shift: e.shiftKey }; canvas.setPointerCapture(e.pointerId); } else drawClick(resolve(w));
});
canvas.addEventListener('pointermove', e => {
  const l = local(e), w = vp.toWorld(l.sx, l.sy); cur = resolve(w);
  $('coords').textContent = `X ${cur.x.toFixed(3)}  Y ${cur.y.toFixed(3)}`;
  if (panDrag) { vp.panBy(e.clientX - panDrag.x, e.clientY - panDrag.y); panDrag = { x: e.clientX, y: e.clientY }; }
  else if (selStart && Math.hypot(l.sx - selStart.sx, l.sy - selStart.sy) > 4) box = { a: selStart, b: l, crossing: l.sx < selStart.sx };
  update();
});
canvas.addEventListener('pointerup', () => {
  panDrag = null; canvas.classList.remove('panning'); if (!selStart) return;
  const s = selStart; selStart = null; const pool = drawing.shapes(e => drawing.isSelectable(e));
  if (box) { const hits = boxSelect(pool, s.w, cur, box.crossing).map(x => x.id); box = null; setSel(s.shift ? [...sel, ...hits] : hits); }
  else { const hit = pick(pool, s.w.x, s.w.y, 6 / vp.scale);
    if (!hit) setSel(s.shift ? [...sel] : []); else if (s.shift) { const n = new Set(sel); n.has(hit.id) ? n.delete(hit.id) : n.add(hit.id); setSel([...n]); } else setSel([hit.id]); }
});
addEventListener('keydown', e => {
  const typing = e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT';
  if (e.key === 'F3') { e.preventDefault(); toggle('osnap'); } if (e.key === 'F7') { e.preventDefault(); actions.grid(); }
  if (e.key === 'F8') { e.preventDefault(); toggle('ortho'); } if (e.key === 'F9') { e.preventDefault(); toggle('gsnap'); }
  if ((e.ctrlKey || e.metaKey) && !typing && 'zy'.includes(e.key.toLowerCase())) { e.preventDefault(); return doUndo(e.key.toLowerCase() === 'y' || e.shiftKey); }
  if (typing) return;
  if (e.code === 'Space') space = true;
  if (e.key === 'Escape') { pts = []; box = null; selStart = null; if (tool === 'select') setSel([]); else { say(P(tool, 0)); update(); } }
  else if (e.key === 'Delete') deleteSel();
  else if (e.key === 'Enter' && tool !== 'select') finish();
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.code !== 'Space') cin.focus(); // type-to-command
});
addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
addEventListener('resize', () => { renderer.resize(); update(); });

$('btn-grid').classList.add('on');
renderer.resize(); home(); setTool('select'); layers.render(); panel.render();
log('EVLab CAD ready. Type HELP for commands.');
