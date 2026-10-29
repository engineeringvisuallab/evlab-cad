import assert from 'node:assert/strict';
import { make, validate } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import * as TF from '../js/geometry/transforms.js';
import * as X from '../js/geometry/modify.js';
import * as H from '../js/core/history.js';
import { resolveDim } from '../js/geometry/dimensions.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
const fresh = () => new Drawing();
let d = fresh(); const l = d.add(make.line(0, 0, 10, 0));
X.transformIds(d, [l.id], TF.move(5, 3), false); near(l.x1, 5); near(l.y2, 3);
X.transformIds(d, [l.id], TF.rotate({ x: 5, y: 3 }, Math.PI / 2), false); near(l.x2, 5); near(l.y2, 13);
X.transformIds(d, [l.id], TF.scale({ x: 5, y: 3 }, 2), false); near(l.y2, 23);
assert.throws(() => X.transformIds(d, [l.id], TF.scale({ x: 0, y: 0 }, 0), false));
X.transformIds(d, [l.id], TF.move(1, 1), true); assert.equal(d.entities.length, 2);
d = fresh(); const a = d.add(make.arc(0, 0, 1, 0, Math.PI / 2)); X.transformIds(d, [a.id], TF.mirror({ x: 0, y: 0 }, { x: 1, y: 0 }), false); // mirror about X axis
near(a.a0, -Math.PI / 2); near(a.a1, 0); assert.equal(validate(a), null);
// offset
const L = make.line(0, 0, 10, 0); const o = X.offsetEntity(L, 2, { x: 5, y: 9 }); near(o.y1, 2); near(X.offsetEntity(L, 2, { x: 5, y: -9 }).y1, -2);
near(X.offsetEntity(make.circle(0, 0, 5), 2, { x: 9, y: 0 }).r, 7); near(X.offsetEntity(make.circle(0, 0, 5), 2, { x: 1, y: 0 }).r, 3); assert.throws(() => X.offsetEntity(make.circle(0, 0, 1), 2, { x: 0, y: 0 }));
// trim / extend
d = fresh(); const t1 = d.add(make.line(0, 0, 10, 0)); d.add(make.line(3, -2, 3, 2)); d.add(make.line(7, -2, 7, 2));
X.trimLine(d, t1, { x: 5, y: 0 }); assert.equal(d.entities.length, 4); near(t1.x2, 3); near(d.entities[3].x1, 7);   // middle removed -> two pieces
d = fresh(); const e1 = d.add(make.line(0, 0, 4, 0)); d.add(make.line(10, -5, 10, 5)); X.extendLine(d, e1, { x: 3.9, y: 0 }); near(e1.x2, 10);
assert.throws(() => X.extendLine(d, e1, { x: 0.1, y: 0 }));
// fillet / chamfer
d = fresh(); const f1 = d.add(make.line(0, 0, 10, 0)), f2 = d.add(make.line(10, 0, 10, 10));
X.corner(d, f1.id, f2.id, { x: 2, y: 0 }, { x: 10, y: 8 }, 'fillet', 2); const arc = d.entities.find(e => e.type === 'arc');
near(arc.r, 2); near(arc.cx, 8); near(arc.cy, 2); near(f1.x2, 8); near(f2.y1, 2); assert.equal(validate(arc), null);
d = fresh(); const g1 = d.add(make.line(0, 0, 10, 1)), g2 = d.add(make.line(10, 5, 9, -5));
X.corner(d, g1.id, g2.id, { x: 1, y: 0.1 }, { x: 9.5, y: -4 }, 'fillet', 0); near(g1.x2, g2.x1, 1e-9);               // sharp corner
d = fresh(); const h1 = d.add(make.line(0, 0, 10, 0)), h2 = d.add(make.line(10, 0, 10, 10));
X.corner(d, h1.id, h2.id, { x: 2, y: 0 }, { x: 10, y: 8 }, 'chamfer', 3); const ch = d.entities[2]; near(ch.x1, 7); near(ch.y2, 3);
assert.throws(() => X.corner(d, h1.id, h2.id, { x: 2, y: 0 }, { x: 10, y: 8 }, 'fillet', 50));
// explode / join / array / area
d = fresh(); const r = d.add(make.rect({ x: 0, y: 0 }, { x: 4, y: 3 })); assert.equal(X.areaReport(d, [r.id])[0].includes('area 12.0000'), true);
assert.equal(X.explodeIds(d, [r.id]), 1); assert.equal(d.entities.length, 4); assert.ok(d.entities.every(e => e.type === 'line'));
X.joinIds(d, d.entities.map(e => e.id)); assert.equal(d.entities.length, 1); assert.ok(d.entities[0].closed); assert.equal(d.entities[0].pts.length, 4);
assert.throws(() => X.joinIds(d, [d.add(make.line(50, 50, 51, 51)).id, d.entities[0].id]));
d = fresh(); const q = d.add(make.circle(0, 0, 1)); X.arrayIds(d, [q.id], 2, 3, 10, 5); assert.equal(d.entities.length, 6); assert.throws(() => X.arrayIds(d, [q.id], 0, 3, 1, 1));
// dimensions: values computed from geometry; radius/aligned-by-line associate
d = fresh(); const ln = d.add(make.line(0, 0, 3, 4)); const dm = d.add({ type: 'dim', dtype: 'aligned', ref: ln.id, o: [0, 5] });
assert.equal(resolveDim(d, dm).text.str, '5.00'); ln.x2 = 6; ln.y2 = 8; assert.equal(resolveDim(d, dm).text.str, '10.00');
const ci = d.add(make.circle(0, 0, 2)); const dr = d.add({ type: 'dim', dtype: 'radius', ref: ci.id, o: [5, 0] }), dd = d.add({ type: 'dim', dtype: 'diameter', ref: ci.id, o: [0, 5] });
assert.equal(resolveDim(d, dr).text.str, 'R2.00'); ci.r = 3; assert.equal(resolveDim(d, dd).text.str, '⌀6.00');
const lin = d.add({ type: 'dim', dtype: 'linear', p1: [0, 0], p2: [10, 4], o: [5, 8] }); assert.equal(resolveDim(d, lin).text.str, '10.00');
assert.equal(resolveDim(d, d.add({ type: 'dim', dtype: 'linear', p1: [0, 0], p2: [10, 4], o: [14, 2] })).text.str, '4.00');
d.remove([ci.id]); assert.equal(d.entities.filter(e => e.type === 'dim' && e.ref === ci.id).length, 0); assert.ok(d.shapes().length > 0);
// history: undo/redo and rollback
d = fresh(); H.stacks.undo.length = H.stacks.redo.length = 0;
const tx = fn => { const b = H.snapshot(d); try { fn(); H.commit(b, d); return true; } catch { H.restore(d, b); return false; } };
tx(() => d.add(make.line(0, 0, 1, 1))); tx(() => d.add(make.circle(0, 0, 1))); assert.equal(d.entities.length, 2);
assert.equal(tx(() => { d.add(make.line(5, 5, 6, 6)); throw new Error('boom'); }), false); assert.equal(d.entities.length, 2);        // failed command leaves no trace
assert.ok(H.undo(d)); assert.equal(d.entities.length, 1); assert.ok(H.redo(d)); assert.equal(d.entities.length, 2); assert.ok(H.undo(d) && H.undo(d)); assert.ok(!H.undo(d));
tx(() => d.add(make.line(0, 0, 2, 2))); assert.ok(!H.redo(d)); assert.equal(d.nextId, 2);
console.log('modify tests passed');
