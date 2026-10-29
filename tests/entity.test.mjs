import assert from 'node:assert/strict';
import { make, validate, length, bounds, distance, norm } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import { pick, boxSelect } from '../js/core/selection.js';
import * as T from '../js/tools/draw-tools.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
// line
const l = make.line(0, 0, 3, 4); near(length(l), 5); near(distance(l, 1.5, 2 + 1), 0.5 * 0 + distance(l, 1.5, 3));
assert.ok(validate(make.line(1, 1, 1, 1))); assert.equal(validate(l), null);
// polyline / rectangle
const r = make.rect({ x: 0, y: 0 }, { x: 10, y: 5 }); near(length(r), 30); assert.equal(r.pts.length, 4); assert.ok(r.closed);
assert.ok(validate(make.polyline([[0, 0]])));
// circle / arc
const c = make.circle(0, 0, 2); near(length(c), 4 * Math.PI); near(distance(c, 5, 0), 3); assert.ok(validate(make.circle(0, 0, 0)));
const a = make.arc(0, 0, 1, 0, Math.PI / 2); near(length(a), Math.PI / 2); const ab = bounds(a);
near(ab.maxX, 1); near(ab.maxY, 1); near(ab.minX, 0, 1e-9); near(distance(a, 2, 0), 1);              // inside sweep
near(distance(a, -1, 0), Math.SQRT2);                                                                 // outside sweep -> endpoint (0,1)
const wrap = make.arc(0, 0, 1, 3 * Math.PI / 2, Math.PI / 2); near(length(wrap), Math.PI); near(bounds(wrap).maxX, 1); // wraps through 0
near(norm(-Math.PI / 2), 3 * Math.PI / 2);
// drawing integrity + ids
const d = new Drawing(); const e1 = d.add(l), e2 = d.add(c); assert.notEqual(e1.id, e2.id);
assert.throws(() => d.add(make.circle(0, 0, -1))); assert.equal(d.entities.length, 2);                // failed add leaves drawing intact
// selection
assert.equal(pick(d.entities, 1.5, 2.1, 0.5).id, e1.id); assert.equal(pick(d.entities, 50, 50, 0.5), null);
const box = [{ x: -1, y: -1 }, { x: 4, y: 5 }];
assert.deepEqual(boxSelect(d.entities, ...box, false).map(e => e.id), [e1.id]);                        // window: circle not fully inside
assert.deepEqual(boxSelect(d.entities, ...box, true).map(e => e.id), [e1.id, e2.id]);                  // crossing: circle touches
// delete + extents
assert.equal(d.remove([e1.id]), 1); assert.equal(d.entities.length, 1); const ex = d.extents(); near(ex.maxX, 2);
// tool state machines
let s = T.click('line', [], { x: 0, y: 0 }); assert.ok(!s.entity); s = T.click('line', s.next, { x: 5, y: 0 }); assert.equal(s.entity.x2, 5); assert.equal(s.next.length, 1);
s = T.click('arc', [{ x: 0, y: 0 }, { x: 1, y: 0 }], { x: 0, y: 1 }); near(s.entity.a1, Math.PI / 2);
assert.equal(T.finishPolyline([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }]).pts.length, 2);
assert.equal(T.finishPolyline([{ x: 0, y: 0 }, { x: 0, y: 0 }]), null);
console.log('entity tests passed');
