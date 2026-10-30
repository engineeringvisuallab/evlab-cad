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
import * as J from './io/json.js';
import * as S from './io/storage.js';
import * as F from './io/file-io.js';
import { importDxf } from './io/dxf-import.js';
import { exportDxf } from './io/dxf-export.js';
import { buildSheet, sheetSize, validateLayout } from './layouts/paper-space.js';
import { exportPdf } from './io/pdf-export.js';
import { exportSvg } from './io/svg-export.js';
import { createBlockPanel } from './ui/block-panel.js';
import { createLayoutPanel } from './ui/layout-panel.js';
import { createPanel } from './ui/properties-panel.js';
import { createLayerPanel } from './ui/layer-panel.js';

const canvas = document.getElementById('cad'), $ = id => document.getElementById(id);
const drawing = new Drawing(), vp = new Viewport(), renderer = new Renderer(canvas, vp);
let panTool = false, space = false, panDrag = null, tool = 'select', pts = [], lastPt = null, cur = { x: 0, y: 0 }, snap = null;
let mode = 'model'; const lvp = new Viewport(); renderer.lvp = lvp; const V = () => mode === 'layout' ? lvp : vp;
let sel = new Set(), selStart = null, box = null, lastCmd = '';
const modes = { end: 1, mid: 1, cen: 1, int: 1, per: 1, nea: 0 }, flags = { osnap: true, gsnap: false, ortho: false };
const hist = []; let hi = 0; const param = {};
const newId = () => globalThis.crypto?.randomUUID?.() ?? 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2);
let project = { id: newId(), name: 'Untitled', created: new Date().toISOString(), handle: null }, dirty = false, saveTimer = null;

function log(m) { const d = document.createElement('div'); d.textContent = m; const l = $('cmdlog'); l.append(d); while (l.children.length > 60) l.firstChild.remove(); l.scrollTop = 1e9; }
function say(m) { $('prompt').textContent = m; log(m); }
const panel = createPanel($('props-body'), drawing, () => [...sel], () => changed(), say, tx);
const layers = createLayerPanel($('layers-body'), drawing, () => [...sel], () => changed(), say, tx);
const blocksUI = createBlockPanel($('blocks-body'), drawing, fn => tx(fn), () => changed(), n => { param.insert = { name: n, s: 1, rot: 0 }; setTool('insert'); });
const layoutUI = createLayoutPanel($('props-body'), drawing, fn => { tx(() => { const c = structuredClone(drawing.layout); fn(c); const err = validateLayout(c); if (err) throw new Error(err); drawing.layout = c; }); layoutUI.render(); update(); }, k => exportSheet(k));
const fitSheet = () => { const [W, H] = sheetSize(drawing.layout); lvp.resize(vp.w, vp.h); lvp.fit({ minX: 0, minY: 0, maxX: W, maxY: H }, 0.92); };
function setMode(m) {
  if (m === mode) return; mode = m; pts = []; box = null; selStart = null; if (m === 'layout') { setTool('select'); fitSheet(); layoutUI.render(); } else panel.render();
  $('props-title').textContent = m === 'layout' ? 'Layout' : 'Properties'; $('b-model').classList.toggle('on', m === 'model'); $('b-layout').classList.toggle('on', m === 'layout');
  say(m === 'layout' ? 'Paper layout: drag to pan, wheel to zoom. Edit sheet details in the right panel.' : 'Model space.'); update();
}
async function exportSheet(kind) {
  try { const sheet = buildSheet(drawing), data = kind === 'pdf' ? exportPdf(sheet) : exportSvg(sheet); const r = await F.saveText(data, `${project.name}.${kind}`, null, true, kind);
    say(r ? `Exported ${r.name} (${drawing.layout.size} ${drawing.layout.orientation}, 1:${drawing.layout.scale}).` : 'Export cancelled.'); } catch (e) { say(`Export failed: ${e.message}`); }
}
function addText(t) { const e = { type: 'text', x: pts[0].x, y: pts[0].y, h: param.text || 2.5, rot: 0, str: t.replace(/\\n|\\P/g, '\n') }; pts = []; commit(e); say(P(tool, 0)); update(); }
function changed() { sel = new Set([...sel].filter(id => { const e = drawing.get(id); return e && drawing.isSelectable(e); })); layers.render(); blocksUI.render(); mode === 'layout' ? layoutUI.render() : panel.render(); update(); }
function update() {
  if (mode === 'layout') { renderer.renderSheet(buildSheet(drawing)); $('zoom').textContent = `Sheet ${drawing.layout.size} 1:${drawing.layout.scale}`; return; }
  renderer.render(drawing, sel, previewOf(), box, snap);
  $('zoom').textContent = `Scale ${vp.scale.toPrecision(4)} px/unit`;
  for (const k of ['osnap', 'gsnap', 'ortho']) $('b-' + k).classList.toggle('on', flags[k]);
}
function setSel(ids) { sel = new Set(ids); panel.render(); update(); }
function home() { vp.cx = 50; vp.cy = 30; vp.scale = 5; }
function setPan(on) { panTool = on; $('btn-pan').classList.toggle('on', on); }
// ---- project files, autosave, recovery ----
const meta = () => ({ id: project.id, name: project.name, created: project.created, modified: new Date().toISOString() });
const updateTitle = () => { document.title = `${dirty ? '● ' : ''}${project.name} — EVLab CAD`; };
function markDirty() { dirty = true; updateTitle(); clearTimeout(saveTimer); saveTimer = setTimeout(doAutosave, 1500); }
function doAutosave() {
  if (!dirty) return;
  try { S.autosave({ id: project.id, name: project.name, modified: Date.now(), data: J.serialize(drawing, meta()) }); }
  catch (e) { say(`Autosave failed (${e.message}). Use Save to keep your work.`); }
}
function loadProject(o, name, handle) {
  J.applyProject(drawing, o); project = { id: o.meta.id || newId(), name, created: o.meta.created || new Date().toISOString(), handle };
  H.stacks.undo.length = H.stacks.redo.length = 0; sel = new Set(); pts = []; dirty = false; clearTimeout(saveTimer);
  $('units').textContent = drawing.units; updateTitle(); changed(); actions.extents(); setTool('select');
}
const confirmDiscard = () => !dirty || confirm('You have unsaved changes. Discard them?');
function newDrawing() {
  if (!confirmDiscard()) return; try { S.discard(project.id); } catch { /* ignore */ }
  const f = new Drawing(); for (const k of ['entities', 'nextId', 'layers', 'blocks', 'layout', 'current', 'units', 'dimStyle']) drawing[k] = f[k];
  project = { id: newId(), name: 'Untitled', created: new Date().toISOString(), handle: null };
  H.stacks.undo.length = H.stacks.redo.length = 0; sel = new Set(); pts = []; dirty = false; clearTimeout(saveTimer);
  $('units').textContent = drawing.units; updateTitle(); changed(); setTool('select'); say('New drawing.');
}
async function saveFile(asNew) {
  try {
    const r = await F.saveText(J.serialize(drawing, meta()), project.name + '.evlab', project.handle, asNew); if (!r) return say('Save cancelled.');
    project.handle = r.handle; project.name = r.name.replace(/\.(evlab|json)$/i, ''); dirty = false; clearTimeout(saveTimer);
    try { S.discard(project.id); } catch { /* ignore */ } updateTitle(); say(`Saved ${r.name}.`);
  } catch (e) { say(`Save failed: ${e.message}. Your drawing is still open and unsaved.`); }
}
async function openFile() {
  try {
    const r = await F.openText(); if (!r) return; const o = J.parse(r.text); // validated before anything changes
    if (!confirmDiscard()) return; loadProject(o, r.name.replace(/\.(evlab|json)$/i, ''), r.handle); say(`Opened ${r.name} (${drawing.entities.length} objects).`);
  } catch (e) { say(`Could not open file: ${e.message}`); }
}
async function importDxfFile() {
  try {
    const r = await F.openText('dxf'); if (!r) return;
    if (/\.dwg$/i.test(r.name)) return say('DWG is not supported. In your CAD software, save or export the drawing as DXF, then import that.');
    const res = importDxf(r.text); if (!confirmDiscard()) return;
    loadProject({ meta: {}, entities: res.entities, layers: res.layers, current: '0', nextId: res.nextId, units: res.units }, r.name.replace(/\.dxf$/i, ''), null); markDirty();
    say(`Imported ${res.entities.length} object(s) from ${r.name}. Save to keep it as an EVLab project.`); res.warnings.forEach(log);
  } catch (e) { say(`Could not import DXF: ${e.message}`); }
}
async function exportDxfFile() {
  try { const { text, warnings } = exportDxf(drawing); const r = await F.saveText(text, project.name + '.dxf', null, true, 'dxf');
    if (!r) return say('Export cancelled.'); say(`Exported ${r.name}. Only checked against EVLab's own importer; verify in your CAD software.`); warnings.forEach(log);
  } catch (e) { say(`DXF export failed: ${e.message}`); }
}
function recover() {
  let rec; try { rec = S.listRecoverable()[0]; } catch { return; } if (!rec) return;
  if (confirm(`Recover unsaved drawing "${rec.name}" from ${new Date(rec.modified).toLocaleString()}?\n\nCancel to decide later.`)) {
    try { const o = J.parse(rec.data); loadProject(o, rec.name, null); project.id = rec.id; markDirty(); say('Recovered unsaved drawing. Save it to a file.'); }
    catch (e) { say(`Recovery data is damaged (${e.message}). It was left in browser storage.`); }
  } else if (confirm('Delete the unsaved drawing permanently?')) S.discard(rec.id);
}
addEventListener('beforeunload', e => { if (dirty) { doAutosave(); e.preventDefault(); e.returnValue = ''; } });
function P(t, n) { return M.isModify(t) ? M.prompt(t, n, param[t], pts) : T.prompt(t, n); }
function previewOf() { return M.isModify(tool) ? M.preview(tool, pts, cur) : T.preview(tool, pts, cur); }
function tx(fn) { const before = H.snapshot(drawing); try { fn(); if (H.commit(before, drawing)) markDirty(); return true; } catch (e) { H.restore(drawing, before); say(e.message); return false; } }
function doUndo(redo) { const ok = redo ? H.redo(drawing) : H.undo(drawing); say(ok ? (redo ? 'Redo.' : 'Undo.') : `Nothing to ${redo ? 'redo' : 'undo'}.`); if (ok) markDirty(); changed(); }
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
  if (mode === 'layout' && t !== 'select') return say('Switch to Model to draw or edit.');
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
function deleteSel() { if (mode === 'layout') return say('Switch to Model to edit objects.'); if (!sel.size) return say('Nothing selected.'); let n = 0; if (!tx(() => { n = drawing.remove([...sel]); })) return; say(`Deleted ${n} object(s). Ctrl+Z undoes.`); setSel([]); }
const toggle = k => { flags[k] = !flags[k]; say(`${{ osnap: 'Object snap', gsnap: 'Grid snap', ortho: 'Ortho' }[k]} ${flags[k] ? 'on' : 'off'}`); update(); };
const zoomCenter = f => { V().zoomAt(V().w / 2, V().h / 2, f); update(); };
const actions = {
  'zoom-in': () => zoomCenter(1.25), 'zoom-out': () => zoomCenter(0.8),
  extents: () => { if (mode === 'layout') { fitSheet(); return update(); } const e = drawing.extents(); e ? vp.fit(e) : home(); update(); }, reset: () => { if (mode === 'layout') fitSheet(); else home(); update(); },
  'view-model': () => setMode('model'), 'view-layout': () => setMode('layout'), pdf: () => exportSheet('pdf'), svg: () => exportSheet('svg'),
  grid: () => { renderer.showGrid = !renderer.showGrid; $('btn-grid').classList.toggle('on', renderer.showGrid); update(); },
  pan: () => setPan(!panTool), undo: () => doUndo(false), redo: () => doUndo(true), delete: deleteSel, osnap: () => toggle('osnap'), gsnap: () => toggle('gsnap'), ortho: () => toggle('ortho'),
  'select-all': () => { setTool('select'); setSel(drawing.entities.filter(e => drawing.isSelectable(e)).map(e => e.id)); }, deselect: () => setSel([]),
  'units-mm': () => { drawing.units = 'mm'; $('units').textContent = 'mm'; markDirty(); }, 'units-m': () => { drawing.units = 'm'; $('units').textContent = 'm'; markDirty(); },
  dxfin: () => importDxfFile(), dxfout: () => exportDxfFile(), new: () => newDrawing(), open: () => openFile(), save: () => saveFile(false), saveas: () => saveFile(true),
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
  if (c === 'BLOCK') { if (!arg) return say('Usage: BLOCK name. Select objects first, then click the base point.'); param.block = arg; return setTool('block'); }
  if (c === 'INSERT') { const [nm = '', s = '1', r = '0'] = arg.split(/\s+/), name = Object.keys(drawing.blocks).find(k => k.toLowerCase() === nm.toLowerCase()), sc = Number(s), ro = Number(r);
    if (!name) return say(`No block named "${nm}". Type BLOCKS to list them.`); if (!(sc > 0) || !Number.isFinite(ro)) return say('Usage: INSERT name [scale] [rotation°]');
    param.insert = { name, s: sc, rot: ro * Math.PI / 180 }; return setTool('insert'); }
  if (c === 'BLOCKS') return say('Blocks: ' + (Object.keys(drawing.blocks).join(', ') || '(none)'));
  if (c === 'LAYOUT') return setMode('layout'); if (c === 'MODEL') return setMode('model'); if (c === 'PDF') return exportSheet('pdf'); if (c === 'SVG') return exportSheet('svg');
  if (TOOL_OF[c]) { const t = TOOL_OF[c]; if (['offset', 'fillet', 'chamfer', 'text'].includes(t) && parseNumber(arg) !== null) { param[t] = +arg; arg = ''; } setTool(t); return arg && runCommand(arg); }
  const A = arg.toUpperCase();
  if (c === 'ERASE') return deleteSel();
  if (c === 'DXFIN') return importDxfFile(); if (c === 'DXFOUT') return exportDxfFile();
  if (c === 'NEW') return newDrawing(); if (c === 'SAVE') return saveFile(false); if (c === 'SAVEAS') return saveFile(true); if (c === 'OPEN') return openFile();
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
  if (tool === 'text' && pts.length) return addText(t);
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
canvas.addEventListener('wheel', e => { e.preventDefault(); const l = local(e); V().zoomAt(l.sx, l.sy, e.deltaY < 0 ? 1.15 : 1 / 1.15); update(); }, { passive: false });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (tool !== 'select') finish(); });
canvas.addEventListener('dblclick', () => { if (tool === 'polyline') finish(); });
canvas.addEventListener('pointerdown', e => {
  canvas.focus(); if (mode === 'layout') { panDrag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('panning'); return; }
  const l = local(e), w = vp.toWorld(l.sx, l.sy);
  if (e.button === 1 || (e.button === 0 && (panTool || space))) { panDrag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('panning'); return e.preventDefault(); }
  if (e.button !== 0) return;
  if (tool === 'select') { selStart = { ...l, w, shift: e.shiftKey }; canvas.setPointerCapture(e.pointerId); } else drawClick(resolve(w));
});
canvas.addEventListener('pointermove', e => {
  const l = local(e); if (mode === 'layout') { const p = lvp.toWorld(l.sx, l.sy); $('coords').textContent = `Sheet X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)} mm`; if (panDrag) { lvp.panBy(e.clientX - panDrag.x, e.clientY - panDrag.y); panDrag = { x: e.clientX, y: e.clientY }; } return update(); }
  const w = vp.toWorld(l.sx, l.sy); cur = resolve(w);
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return saveFile(e.shiftKey); }
  if ((e.ctrlKey || e.metaKey) && !typing && 'zy'.includes(e.key.toLowerCase())) { e.preventDefault(); return doUndo(e.key.toLowerCase() === 'y' || e.shiftKey); }
  if (typing) return;
  if (e.code === 'Space') space = true;
  if (e.key === 'Escape') { pts = []; box = null; selStart = null; if (tool === 'select') setSel([]); else { say(P(tool, 0)); update(); } }
  else if (e.key === 'Delete') deleteSel();
  else if (e.key === 'Enter' && tool !== 'select') finish();
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.code !== 'Space') cin.focus(); // type-to-command
});
addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
addEventListener('resize', () => { renderer.resize(); lvp.resize(vp.w, vp.h); update(); });

$('btn-grid').classList.add('on');
renderer.resize(); home(); setTool('select'); layers.render(); blocksUI.render(); panel.render();
log('EVLab CAD ready. Type HELP for commands.'); updateTitle(); recover();
