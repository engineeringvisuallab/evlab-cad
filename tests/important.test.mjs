import assert from 'node:assert/strict';
import { make, validate, grips } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import { moveGrip } from '../js/geometry/grips.js';
import { dashMm, dashPx, canon, LTYPE_NAMES } from '../js/geometry/linetypes.js';
import { offsetEntity } from '../js/geometry/modify.js';
import { expand } from '../js/geometry/expand.js';
import { resolveDim } from '../js/geometry/dimensions.js';
import { buildSheet } from '../js/layouts/paper-space.js';
import { exportPdf } from '../js/io/pdf-export.js';
import { exportSvg } from '../js/io/svg-export.js';
import { exportDxf } from '../js/io/dxf-export.js';
import { importDxf } from '../js/io/dxf-import.js';
import * as J from '../js/io/json.js';
import * as H from '../js/core/history.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
// ---- grip editing: every grip of every type moves what it should, and the result stays valid
const P = (x, y) => ({ x, y });
let e = moveGrip(make.line(0, 0, 10, 0), 2, P(10, 5)); assert.deepEqual([e.x1, e.y1, e.x2, e.y2], [0, 0, 10, 5]);
e = moveGrip(make.line(0, 0, 10, 0), 0, P(-2, 3)); assert.deepEqual([e.x1, e.y1, e.x2], [-2, 3, 10]);
e = moveGrip(make.line(0, 0, 10, 0), 1, P(5, 4)); assert.deepEqual([e.x1, e.y1, e.x2, e.y2], [0, 4, 10, 4]);                      // midpoint grip moves the whole line
e = moveGrip(make.polyline([[0, 0], [5, 0], [5, 5]]), 1, P(6, -1)); assert.deepEqual(e.pts, [[0, 0], [6, -1], [5, 5]]);
e = moveGrip(make.circle(0, 0, 5), 1, P(8, 6)); near(e.r, 10); near(e.cx, 0); e = moveGrip(make.circle(0, 0, 5), 0, P(3, 3)); assert.deepEqual([e.cx, e.cy, e.r], [3, 3, 5]);
const arc = make.arc(0, 0, 5, 0, Math.PI / 2); e = moveGrip(arc, 2, P(-5, 0)); near(e.a1, Math.PI); near(e.r, 5); e = moveGrip(arc, 1, P(0, -5)); near(e.a0, -Math.PI / 2); assert.equal(validate(e), null);
e = moveGrip({ type: 'text', x: 0, y: 0, h: 2, rot: 0, str: 'a' }, 0, P(7, 8)); assert.deepEqual([e.x, e.y], [7, 8]); e = moveGrip({ type: 'xline', x: 0, y: 0, a: 1 }, 0, P(2, 2)); near(e.a, 1);
assert.equal(moveGrip({ type: 'dim' }, 0, P(0, 0)), null); const orig = make.line(0, 0, 1, 1); moveGrip(orig, 0, P(9, 9)); assert.equal(orig.x1, 0);   // original untouched
for (const ent of [make.line(0, 0, 4, 4), make.polyline([[0, 0], [1, 1], [2, 0]]), make.circle(1, 1, 2), arc]) assert.equal(moveGrip(ent, 0, P(1, 1)) !== null, true, ent.type);
assert.equal(moveGrip(make.line(0, 0, 4, 4), 2, P(0, 0)) && validate(moveGrip(make.line(0, 0, 4, 4), 2, P(0, 0))) !== null, true);   // dragging an end onto the other end is caught by validation
// ---- linetypes
assert.deepEqual(dashMm('DASHED'), [6, 3]); assert.deepEqual(dashMm('Dashed2'), [6, 3]); assert.equal(dashMm('Continuous'), null); assert.equal(dashMm('NO_SUCH'), null); assert.equal(canon('hidden'), 'HIDDEN'); assert.equal(canon('ACAD_ISO02W100'), null);
let d = new Drawing(); d.addLayer('X'); d.layer('X').lineType = 'DASHED'; d.current = 'X'; const a = d.add(make.line(0, 0, 100, 0)); const b = d.add({ ...make.line(0, 5, 100, 5), lineType: 'CENTER' });
const c = d.add({ ...make.line(0, 9, 1, 9), lineType: 'BYLAYER' }); assert.equal(d.lineTypeOf(a), 'DASHED'); assert.equal(d.lineTypeOf(b), 'CENTER'); assert.equal(d.lineTypeOf(c), 'DASHED');
d.layout.scale = 100; assert.deepEqual(dashPx(d, a, 2), [6 * 100 * 2, 3 * 100 * 2]);        // 6 mm on paper = 600 units at 1:100, x2 px per unit
assert.deepEqual(dashPx(d, a, 0.001), []);                                                  // far too small to see -> drawn solid
d.units = 'm'; { const m = dashPx(d, a, 10); near(m[0], 6, 1e-9); near(m[1], 3, 1e-9); } d.units = 'mm';
const sheet = buildSheet(d), items = sheet.items.filter(i => i.clip && i.t === 'line'); assert.deepEqual(items[0].dash, [6, 3]); assert.deepEqual(items[1].dash, [12, 2, 2, 2]);
const pdf = Buffer.from(exportPdf(sheet)).toString('latin1'); assert.ok(pdf.includes('[17.008 8.504] 0 d')); assert.ok(pdf.includes('[34.016 5.669 5.669 5.669] 0 d'));
const svg = exportSvg(sheet); assert.ok(svg.includes('stroke-dasharray="6 3"') && svg.includes('stroke-dasharray="12 2 2 2"')); assert.ok(!/<text[^>]*stroke-dasharray/.test(svg));
const ex = exportDxf(d); for (const n of LTYPE_NAMES) assert.ok(ex.text.includes(`\r\n2\r\n${n}\r\n70\r\n0\r\n`), n); assert.ok(ex.text.includes('$LTSCALE\r\n40\r\n100.0'));
let im = importDxf(ex.text); assert.equal(im.layers.find(l => l.name === 'X').lineType, 'DASHED'); assert.equal(im.entities[1].lineType, 'CENTER'); assert.equal(im.entities[0].lineType, undefined); assert.equal(im.entities[2].lineType, undefined);
const odd = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '0', 'LAYER', '2', 'W', '70', '0', '62', '7', '6', 'ACAD_ISO02W100', '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', '0', 'LINE', '8', 'W', '6', 'FANCY', '10', '0', '20', '0', '11', '1', '21', '1', '0', 'LINE', '8', 'W', '6', 'DASHED2', '10', '0', '20', '0', '11', '2', '21', '2', '0', 'ENDSEC', '0', 'EOF'].join('\r\n');
im = importDxf(odd); assert.equal(im.layers.find(l => l.name === 'W').lineType, 'CONTINUOUS'); assert.equal(im.entities[0].lineType, undefined); assert.equal(im.entities[1].lineType, 'DASHED'); assert.ok(im.warnings.some(w => /line types EVLab does not have/.test(w)));
const j = new Drawing(); J.applyProject(j, J.parse(J.serialize(d))); assert.equal(j.lineTypeOf(j.entities[1]), 'CENTER'); assert.equal(j.layer('X').lineType, 'DASHED');   // saved and reloaded
// ---- polyline offset
const rect = make.rect({ x: 0, y: 0 }, { x: 10, y: 5 });
assert.deepEqual(offsetEntity(rect, 1, P(5, -3)).pts, [[-1, -1], [11, -1], [11, 6], [-1, 6]]);       // outside
assert.deepEqual(offsetEntity(rect, 1, P(5, 2.5)).pts, [[1, 1], [9, 1], [9, 4], [1, 4]]); assert.ok(offsetEntity(rect, 1, P(5, 2.5)).closed);   // inside
assert.throws(() => offsetEntity(rect, 3, P(5, 2.5)), /too large/);
assert.deepEqual(offsetEntity(make.polyline([[0, 0], [10, 0], [10, 10]]), 1, P(5, 3)).pts, [[0, 1], [9, 1], [9, 10]]);                          // open L, left side
assert.deepEqual(offsetEntity(make.polyline([[0, 0], [10, 0], [10, 10]]), 1, P(5, -3)).pts, [[0, -1], [11, -1], [11, 10]]);                      // right side
const lineCol = offsetEntity(make.polyline([[0, 0], [5, 0], [10, 0]]), 2, P(3, 4)); assert.deepEqual(lineCol.pts, [[0, 2], [5, 2], [10, 2]]);       // collinear vertices survive
const sharp = offsetEntity(make.polyline([[0, 0], [10, 0], [0.2, 1]]), 0.5, P(5, 0.2)); assert.ok(sharp.pts.length >= 3 && sharp.pts.every(p => p.every(Number.isFinite)));   // very sharp corner is bevelled, not blown up
for (const p of offsetEntity(rect, 1, P(5, -3)).pts) assert.ok(Math.abs(p[0]) <= 11 && Math.abs(p[1]) <= 6);
assert.equal(validate(offsetEntity(rect, 1, P(5, -3))), null);
// ---- dimension style
d = new Drawing(); const ln = d.add(make.line(0, 0, 5, 0)); const dim = d.add({ type: 'dim', dtype: 'aligned', ref: ln.id, o: [0, 3] });
assert.equal(resolveDim(d, dim).text.str, '5.00'); d.dimStyle = { ...d.dimStyle, precision: 0 }; assert.equal(resolveDim(d, dim).text.str, '5'); d.dimStyle = { ...d.dimStyle, precision: 3, scale: 2 }; assert.equal(resolveDim(d, dim).text.str, '10.000');
const tx = () => expand(d, dim).find(p => p.type === 'text'), arr = () => expand(d, dim).find(p => p.fill);
near(tx().h, 2.5); d.dimStyle = { ...d.dimStyle, text: 4, arrow: 1 }; near(tx().h, 4); near(Math.hypot(...arr().pts[0].map((v, i) => v - arr().pts[1][i])), 1);
d.dimStyle = { ...d.dimStyle, auto: true }; d.layout.scale = 100; near(tx().h, 250); d.units = 'm'; near(tx().h, 0.25); d.layout.scale = 50; near(tx().h, 0.125);   // follows the plot scale
H.stacks.undo.length = H.stacks.redo.length = 0; const run = fn => { const bf = H.snapshot(d); fn(); H.commit(bf, d); };
run(() => { d.dimStyle = { ...d.dimStyle, precision: 1, auto: false }; }); assert.equal(d.dimStyle.precision, 1); H.undo(d); assert.equal(d.dimStyle.precision, 3); assert.equal(d.dimStyle.auto, true);   // style edits are undoable
const k = new Drawing(); J.applyProject(k, J.parse(J.serialize(d))); assert.deepEqual(k.dimStyle, d.dimStyle);
console.log('important tests passed');
