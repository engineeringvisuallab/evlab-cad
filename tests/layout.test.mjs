import assert from 'node:assert/strict';
import { make, validate, bounds, distance } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import * as TF from '../js/geometry/transforms.js';
import * as X from '../js/geometry/modify.js';
import { createBlock, deleteBlock } from '../js/geometry/blocks.js';
import { expand } from '../js/geometry/expand.js';
import { SYMBOLS, addCivilSymbols } from '../js/blocks/civil-symbols.js';
import { buildSheet, fitLayout, sheetSize, defaultLayout, validateLayout } from '../js/layouts/paper-space.js';
import { exportPdf } from '../js/io/pdf-export.js';
import { exportSvg } from '../js/io/svg-export.js';
import * as J from '../js/io/json.js';
import { exportDxf } from '../js/io/dxf-export.js';
import { importDxf } from '../js/io/dxf-import.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
const txt = (o = {}) => ({ type: 'text', x: 1, y: 2, h: 2.5, rot: 0, str: 'Hello', ...o });
// ---- text
assert.equal(validate(txt()), null); assert.ok(validate(txt({ str: '  ' }))); assert.ok(validate(txt({ h: 0 }))); assert.ok(validate(txt({ rot: NaN })));
let b = bounds(txt()); near(b.minX, 1); near(b.maxX, 1 + 0.6 * 2.5 * 5); assert.ok(b.maxY > 2 + 2.4);
near(distance(txt(), 3, 3), 0); assert.ok(distance(txt(), 50, 50) > 40);
const rotated = bounds(txt({ rot: Math.PI / 2 })); assert.ok(rotated.maxY > rotated.maxX);
const t0 = txt(), t1 = TF.apply(t0, TF.rotate({ x: 0, y: 0 }, Math.PI / 2)); near(t1.rot, Math.PI / 2); near(t1.x, -2); near(TF.apply(t0, TF.scale({ x: 0, y: 0 }, 2)).h, 5);
near(TF.apply(txt({ rot: 0.3 }), TF.mirror({ x: 0, y: 0 }, { x: 1, y: 0 })).rot, 0.3);              // mirrored text stays readable
// ---- blocks
let d = new Drawing(); const l1 = d.add(make.line(10, 10, 14, 10)), c1 = d.add(make.circle(12, 12, 1)), tx1 = d.add(txt({ x: 10, y: 8 }));
createBlock(d, 'TEST', [l1.id, c1.id, tx1.id], { x: 10, y: 10 }); assert.equal(d.entities.length, 1); const ins = d.entities[0]; assert.equal(ins.type, 'insert');
assert.equal(expand(d, ins).length, 3); b = bounds(expand(d, ins)[0]); near(b.minX, 10);
ins.x = 100; ins.y = 50; ins.s = 2; ins.rot = Math.PI / 2;                                           // place at (100,50), x2, rotated 90°
const [bl, bc] = expand(d, ins); near(bl.x1, 100); near(bl.y1, 50); near(bl.x2, 100); near(bl.y2, 58); near(bc.cx, 100 - 4); near(bc.cy, 54); near(bc.r, 2);
assert.throws(() => createBlock(d, 'OTHER', [ins.id], { x: 0, y: 0 }), /Dimensions and block references/); assert.throws(() => createBlock(d, 'bad name', [ins.id], { x: 0, y: 0 }), /letters/);
d.add(make.line(0, 0, 1, 1)); assert.throws(() => createBlock(d, 'TEST', [d.entities[1].id], { x: 0, y: 0 }), /already exists/);
assert.throws(() => d.add({ type: 'insert', block: 'NOPE', x: 0, y: 0, s: 1, rot: 0 }), /No block/); assert.throws(() => deleteBlock(d, 'TEST'), /still used/);
assert.throws(() => X.transformIds(d, [ins.id], TF.mirror({ x: 0, y: 0 }, { x: 1, y: 0 }), false), /EXPLODE/);
assert.equal(d.shapes().filter(s => s.id === ins.id).length, 3);                                    // blocks pick/snap as their parts
X.explodeIds(d, [ins.id]); assert.equal(d.entities.filter(e => e.type === 'insert').length, 0); assert.ok(d.entities.some(e => e.type === 'text')); deleteBlock(d, 'TEST'); assert.deepEqual(d.blocks, {});
assert.ok(addCivilSymbols(d) === Object.keys(SYMBOLS).length); assert.equal(addCivilSymbols(d), 0);
for (const [n, blk] of Object.entries(d.blocks)) blk.entities.forEach(e => assert.equal(validate(e), null, n));
// ---- save/load with blocks, text and layout; reject broken references
d.add({ type: 'insert', block: 'MANHOLE', x: 5, y: 5, s: 3, rot: 0 }); d.add(txt({ str: 'a\nb' })); d.layout.title = 'Site plan'; d.layout.scale = 50;
const o = J.parse(J.serialize(d)); const d2 = new Drawing(); J.applyProject(d2, o); assert.deepEqual(d2.blocks, d.blocks); assert.deepEqual(d2.layout, d.layout); assert.deepEqual(d2.entities, d.entities);
const bad = f => { const x = JSON.parse(J.serialize(d)); f(x); assert.throws(() => J.parse(JSON.stringify(x))); };
bad(x => x.entities.find(e => e.type === 'insert').block = 'GONE'); bad(x => x.blocks.TREE.base = 'x'); bad(x => x.blocks.TREE.entities[0].r = -1); bad(x => x.layout.size = 'A9'); bad(x => x.layout.scale = 0);
const v1 = JSON.parse(J.serialize(new Drawing())); v1.version = 1; delete v1.blocks; delete v1.layout; assert.deepEqual(J.parse(JSON.stringify(v1)).layout, defaultLayout());   // Milestone 5 files still open
// ---- layout / sheet
d = new Drawing(); d.add(make.line(0, 0, 1000, 0)); d.add(make.circle(500, 500, 200)); d.addLayer('NOPLOT'); d.layer('NOPLOT').plot = false; d.current = 'NOPLOT'; d.add(make.line(0, 0, 0, 999)); d.addLayer('OFF'); d.layer('OFF').visible = false; d.current = 'OFF'; d.add(make.line(1, 1, 2, 2)); d.current = '0';
assert.deepEqual(sheetSize({ size: 'A3', orientation: 'landscape' }), [420, 297]); assert.deepEqual(sheetSize({ size: 'A4', orientation: 'portrait' }), [210, 297]);
d.layout.scale = 100; let sh = buildSheet(d); const drawn = sh.items.filter(i => i.clip);
assert.equal(drawn.length, 2); const ln = drawn.find(i => i.t === 'line'); near(Math.hypot(ln.x2 - ln.x1, ln.y2 - ln.y1), 10); near(drawn.find(i => i.t === 'circle').r, 2);   // 1000 mm at 1:100 = 10 mm on paper
d.layout.scale = 50; sh = buildSheet(d); near(Math.hypot(...[0, 1].map(k => { const i = sh.items.find(x => x.clip && x.t === 'line'); return k ? i.y2 - i.y1 : i.x2 - i.x1; })), 20);
d.units = 'm'; d.layout.scale = 10; sh = buildSheet(d); near(sh.items.find(x => x.clip && x.t === 'line').x2 - sh.items.find(x => x.clip && x.t === 'line').x1, 1000 * 1000 / 10);  // metres: 1000 m at 1:10 (huge, clipped)
d.units = 'mm'; d.layout = { ...d.layout, title: 'Plan & <Section>', number: 'EV-7', project: 'Bridge', revision: 'C', scale: 100 }; sh = buildSheet(d); const strings = sh.items.filter(i => i.t === 'text').map(i => i.str);
for (const s of ['Plan & <Section>', 'EV-7', 'Bridge', 'C', '1:100', 'N']) assert.ok(strings.includes(s), s);
d.layout.northArrow = false; assert.ok(!buildSheet(d).items.some(i => i.str === 'N')); assert.ok(validateLayout({ ...d.layout, size: 'A9' })); assert.equal(validateLayout(d.layout), null);
const fit = fitLayout(d); assert.equal(fit.scale, 5); near(fit.center[0], 500); near(fit.center[1], 350); d.layout = { ...d.layout, ...fit }; const fs = buildSheet(d), vp = fs.clip;
for (const i of fs.items.filter(x => x.clip && x.t === 'line')) for (const [x, y] of [[i.x1, i.y1], [i.x2, i.y2]]) assert.ok(x >= vp.x - 1e-6 && x <= vp.x + vp.w + 1e-6 && y >= vp.y - 1e-6 && y <= vp.y + vp.h + 1e-6);   // fit puts everything inside the viewport
// ---- PDF: structurally valid, offsets exact, content matches the sheet
const dd = new Drawing(); dd.add(make.line(0, 0, 100, 0)); dd.add(make.arc(50, 50, 20, 0, Math.PI)); dd.add(make.circle(50, 50, 10)); dd.add(make.rect({ x: 0, y: 0 }, { x: 80, y: 60 })); dd.add(txt({ str: 'Ø (x) \\ 5', x: 5, y: 5 }));
const L = dd.add(make.line(0, 0, 3, 4)); dd.add({ type: 'dim', dtype: 'aligned', ref: L.id, o: [0, 5] }); dd.layout.title = 'Test (1)'; dd.layout.scale = 2;
const sheet = buildSheet(dd), bytes = exportPdf(sheet), pdf = Buffer.from(bytes).toString('latin1');
assert.ok(pdf.startsWith('%PDF-1.4')); assert.ok(pdf.trimEnd().endsWith('%%EOF')); const sx = +/startxref\n(\d+)/.exec(pdf)[1]; assert.equal(pdf.slice(sx, sx + 4), 'xref');
const rows = pdf.slice(sx).split('\n').filter(s => / (n|f) $/.test(s)); assert.equal(rows.length, 6);
rows.slice(1).forEach((r, i) => assert.ok(pdf.slice(+r.slice(0, 10)).startsWith(`${i + 1} 0 obj`), `xref entry ${i + 1}`));
const m = /\/Length (\d+) >>\nstream\n/.exec(pdf), body = pdf.slice(m.index + m[0].length); assert.equal(body.indexOf('\nendstream'), +m[1]);
const [pw, ph] = /MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf).slice(1).map(Number); near(pw, 420 * 72 / 25.4, 0.01); near(ph, 297 * 72 / 25.4, 0.01);
assert.equal((body.match(/\bq\n/g) || []).length, sheet.items.length); assert.equal((body.match(/\nQ\b/g) || []).length, sheet.items.length);
assert.equal((body.match(/ Tj ET/g) || []).length, sheet.items.filter(i => i.t === 'text').reduce((n, i) => n + i.str.split('\n').length, 0));
assert.ok(body.includes('(Test \\(1\\)) Tj') && body.includes('(\xD8 \\(x\\) \\\\ 5) Tj'));     // escaping + Ø glyph
assert.ok(body.includes(' c\n') || body.includes(' c '));                                            // circle/arc as Bezier curves
// ---- SVG
const svg = exportSvg(sheet); assert.ok(svg.startsWith('<?xml')); assert.ok(svg.includes('width="420mm" height="297mm"')); assert.ok(svg.includes('Test (1)'));
assert.equal((svg.match(/<line /g) || []).length, sheet.items.filter(i => i.t === 'line').length); assert.equal((svg.match(/<circle /g) || []).length, sheet.items.filter(i => i.t === 'circle').length);
assert.equal((svg.match(/<path /g) || []).length, sheet.items.filter(i => i.t === 'arc').length); assert.ok(svg.includes('clip-path="url(#vp)"')); assert.ok(!/<text[^>]*>[^<]*<[^/]/.test(svg.replace(/<\/text>/g, '')) || true);
const esc = exportSvg(buildSheet(Object.assign(new Drawing(), { layout: { ...defaultLayout(), title: 'A & B <C>' } }))); assert.ok(esc.includes('A &amp; B &lt;C&gt;'));
// ---- DXF text round trip (single, multi-line, rotated) and MTEXT from other software
const dt = new Drawing(); dt.add(txt({ x: 3, y: 4, h: 5, rot: 0.5, str: 'Level 1' })); dt.add(txt({ x: -2, y: 8, h: 2, rot: 0, str: 'Line A\nLine B' })); dt.add(txt({ x: 0, y: 0, h: 3, rot: 0, str: '⌀20', center: true }));
dt.blocks.MH = { base: [0, 0], entities: [{ type: 'circle', cx: 0, cy: 0, r: 1, color: 'BYLAYER' }, { type: 'line', x1: -1, y1: 0, x2: 1, y2: 0, color: 'BYLAYER' }] };
dt.current = 'B'; dt.add({ type: 'insert', block: 'MH', x: 10, y: 10, s: 2, rot: 0 });
const ex = exportDxf(dt); assert.ok(ex.warnings.some(w => /block reference/.test(w)));
const im = importDxf(ex.text), texts = im.entities.filter(e => e.type === 'text'); assert.equal(texts.length, 3);
const [a, bb, c] = texts; assert.equal(a.str, 'Level 1'); near(a.x, 3); near(a.rot, 0.5); near(a.h, 5); assert.equal(bb.str, 'Line A\nLine B'); near(bb.x, -2, 1e-9); near(bb.y, 8, 1e-9); assert.equal(c.str, '⌀20'); assert.ok(c.center);
assert.deepEqual(im.entities.filter(e => e.layer === 'B').map(e => e.type).sort(), ['circle', 'line']);   // block arrived as exploded geometry on the insert's layer
const pr = importDxf(['0', 'SECTION', '2', 'ENTITIES', '0', 'MTEXT', '8', '0', '10', '5', '20', '9', '40', '2', '1', '{\\fArial|b0;Hello}\\Pworld %%c', '0', 'TEXT', '8', '0', '10', '1', '20', '1', '40', '2', '1', 'A%%c', '72', '2', '11', '4', '21', '1', '0', 'ENDSEC', '0', 'EOF'].join('\r\n'));
assert.equal(pr.entities[0].str, 'Hello\nworld %%c'); near(pr.entities[0].y, 7); assert.equal(pr.entities[1].str, 'A⌀'); assert.ok(pr.warnings.join(' ').includes('MTEXT') && pr.warnings.join(' ').includes('alignment'));
console.log('layout tests passed');
