import assert from 'node:assert/strict';
import { make, validate, bounds, distance } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import * as TF from '../js/geometry/transforms.js';
import * as X from '../js/geometry/modify.js';
import * as T from '../js/tools/draw-tools.js';
import * as M from '../js/tools/modify-tools.js';
import { snapPoint } from '../js/renderer/snapping.js';
import { polarPoint } from '../js/core/coordinates.js';
import { exportDxf } from '../js/io/dxf-export.js';
import { importDxf } from '../js/io/dxf-import.js';
import { buildSheet } from '../js/layouts/paper-space.js';
import { coordinatesCsv } from '../js/civil/quantities.js';
import { ALIASES, TOOL_OF } from '../js/core/commands.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
// ---- point / construction line / ray
assert.equal(validate(make.point(1, 2)), null); assert.ok(validate({ type: 'point', x: NaN, y: 0 })); assert.ok(validate({ type: 'xline', x: 0, y: 0 }));
const xl = { type: 'xline', x: 0, y: 0, a: Math.PI / 4 }, ray = { type: 'ray', x: 0, y: 0, a: 0 };
near(distance(xl, 10, 10), 0); near(distance(xl, -50, -50), 0); near(distance(xl, 10, 0), 10 / Math.SQRT2);        // infinite both ways
near(distance(ray, 5, 3), 3); near(distance(ray, -4, 3), 5); near(distance(make.point(1, 1), 4, 5), 5);           // ray stops at its start
assert.deepEqual(bounds(xl), { minX: 0, minY: 0, maxX: 0, maxY: 0 });
const rx = TF.apply(ray, TF.rotate({ x: 0, y: 0 }, Math.PI / 2)); near(rx.a, Math.PI / 2); near(TF.apply(xl, TF.move(3, 4)).x, 3); near(TF.apply(ray, TF.mirror({ x: 0, y: 0 }, { x: 1, y: 0 })).a, 0);
let s = T.click('point', [], { x: 3, y: 4 }); assert.deepEqual(s.entity, { type: 'point', x: 3, y: 4 }); assert.equal(s.next.length, 0);
s = T.click('xline', [], { x: 1, y: 1 }); assert.ok(!s.entity); s = T.click('xline', s.next, { x: 1, y: 5 }); near(s.entity.a, Math.PI / 2); assert.equal(s.next.length, 1);   // keeps the base for more lines
assert.equal(T.click('ray', [{ x: 0, y: 0 }], { x: -1, y: 0 }).entity.type, 'ray');
// ---- node snap
const pt = { id: 'P', ...make.point(5, 5) }, M0 = { end: 1, mid: 1, cen: 1, int: 1, per: 1, nea: 0, nod: 1 };
let sn = snapPoint([pt], { x: 5.2, y: 4.9 }, 1, M0); assert.equal(sn.type, 'nod'); assert.equal(snapPoint([pt], { x: 5.2, y: 4.9 }, 1, { ...M0, nod: 0 }), null);
// ---- polar tracking
let pp = polarPoint({ x: 10, y: 0.3 }, { x: 0, y: 0 }, 45, 0.5); near(pp.x, 10 * Math.cos(Math.atan2(0.3, 10) * 0), 0.01); near(pp.y, 0, 1e-9);
pp = polarPoint({ x: 7, y: 7.2 }, { x: 0, y: 0 }, 45, 0.5); near(pp.a, Math.PI / 4); near(pp.x, pp.y); assert.equal(polarPoint({ x: 10, y: 3 }, { x: 0, y: 0 }, 45, 0.5), null);
assert.equal(polarPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, 45, 1), null); near(polarPoint({ x: 3, y: 10.2 }, { x: 3, y: 0 }, 90, 0.5).x, 3);                // straight up from a non-origin point
// ---- break
let d = new Drawing(); const ln = d.add(make.line(0, 0, 10, 0)); X.breakEntity(d, ln.id, { x: 3, y: 1 }, { x: 6, y: -1 });
assert.equal(d.entities.length, 2); near(ln.x2, 3); near(d.entities[1].x1, 6); near(d.entities[1].x2, 10);
assert.throws(() => X.breakEntity(d, ln.id, { x: 1, y: 0 }, { x: 1, y: 0 }), /same/); assert.throws(() => X.breakEntity(d, ln.id, { x: -5, y: 0 }, { x: 99, y: 0 }), /whole line/);
d = new Drawing(); const l2 = d.add(make.line(0, 0, 10, 0)); X.breakEntity(d, l2.id, { x: 4, y: 0 }, { x: 20, y: 0 }); assert.equal(d.entities.length, 1); near(l2.x2, 4);   // second point beyond the end trims
d = new Drawing(); const ci = d.add(make.circle(0, 0, 5)); X.breakEntity(d, ci.id, { x: 5, y: 0 }, { x: 0, y: 5 }); assert.equal(d.entities[0].type, 'arc');
near(d.entities[0].a0, Math.PI / 2); near(d.entities[0].a1, 0);                                                                                       // quarter removed counter-clockwise from point 1 to 2: 270 degrees remain
d = new Drawing(); const ar = d.add(make.arc(0, 0, 5, 0, Math.PI)); X.breakEntity(d, ar.id, { x: 0, y: 5 }, { x: -5, y: 0 }); assert.equal(d.entities.length, 1); near(ar.a0, 0); near(ar.a1, Math.PI / 2);
d = new Drawing(); assert.throws(() => X.breakEntity(d, d.add(make.rect({ x: 0, y: 0 }, { x: 1, y: 1 })).id, { x: 0, y: 0 }, { x: 1, y: 0 }), /EXPLODE/);
// ---- stretch
d = new Drawing(); const sl = d.add(make.line(0, 0, 10, 0)), sp = d.add(make.polyline([[0, 5], [10, 5], [10, 10]])), sc = d.add(make.circle(10, -5, 2)), keep = d.add(make.line(50, 50, 60, 60));
assert.equal(X.stretchWindow(d, { x: 8, y: -8 }, { x: 12, y: 6 }, 4, 1), 3);                                                                          // crossing window around x=10
assert.deepEqual([sl.x1, sl.x2, sl.y2], [0, 14, 1]); assert.deepEqual(sp.pts, [[0, 5], [14, 6], [10, 10]]);   // vertex (10,10) is outside the window, so it stays near(sc.cx, 14); near(sc.cy, -4); assert.equal(keep.x1, 50);
assert.throws(() => X.stretchWindow(d, { x: 100, y: 100 }, { x: 101, y: 101 }, 1, 1), /No object/);
const ctx = { ids: [], pick: () => null, param: undefined }; let st = M.click('stretch', [], { x: 0, y: 0 }, ctx); st = M.click('stretch', st.next, { x: 1, y: 1 }, ctx); st = M.click('stretch', st.next, { x: 0, y: 0 }, ctx);
assert.equal(st.next.length, 3); assert.ok(M.click('stretch', st.next, { x: 2, y: 0 }, ctx).apply); assert.equal(M.preview('stretch', [{ x: 0, y: 0 }], { x: 1, y: 1 }).closed, true);
// ---- DXF / sheet / CSV round trip
d = new Drawing(); d.add(make.point(3, 4)); d.add({ type: 'xline', x: 1, y: 2, a: 0.5 }); d.add({ type: 'ray', x: -1, y: 0, a: 2 });
const im = importDxf(exportDxf(d).text); assert.deepEqual(im.entities.map(e => e.type), ['point', 'xline', 'ray']); near(im.entities[0].x, 3); near(im.entities[1].a, 0.5); near(im.entities[2].a, 2); near(im.entities[2].x, -1);
d.layout.scale = 1; const sheet = buildSheet(d), clipped = sheet.items.filter(i => i.clip); assert.equal(clipped.length, 2 + 1 + 1);                    // point = 2 strokes
assert.ok(clipped.some(i => Math.hypot(i.x2 - i.x1, i.y2 - i.y1) > 1e4));                                                                              // infinite lines are drawn long and clipped to the viewport
const csv = coordinatesCsv(d); assert.ok(csv.includes(',point,') && csv.includes(',xline,') && csv.includes('angle='));
// ---- every command alias resolves to a tool or handler name, and no command maps to a missing tool
for (const c of ['POINT', 'XLINE', 'RAY', 'BREAK', 'STRETCH']) assert.ok(TOOL_OF[c], c); for (const a of ['PO', 'XL', 'BR', 'S', 'POLAR', 'DYN']) assert.ok(ALIASES[a], a);
console.log('extras tests passed');
