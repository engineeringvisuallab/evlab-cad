import assert from 'node:assert/strict';
import { parsePoint, parseNumber, orthoPoint } from '../js/core/coordinates.js';
import { snapPoint } from '../js/renderer/snapping.js';
import { make } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import { pick } from '../js/core/selection.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);
// coordinates
assert.deepEqual(parsePoint('100,200'), { x: 100, y: 200 }); assert.deepEqual(parsePoint('@50,0', { x: 10, y: 5 }), { x: 60, y: 5 });
const pp = parsePoint('@100<45', { x: 0, y: 0 }); near(pp.x, 70.71067811865476); near(pp.y, 70.71067811865476);
const ap = parsePoint('10<90'); near(ap.x, 0); near(ap.y, 10); assert.deepEqual(parsePoint('-3.5, -2'), { x: -3.5, y: -2 });
assert.ok(parsePoint('@1,1').error); assert.equal(parsePoint('hello'), null); assert.equal(parseNumber('12.5'), 12.5); assert.equal(parseNumber('abc'), null); assert.equal(parseNumber(''), null);
assert.deepEqual(orthoPoint({ x: 10, y: 2 }, { x: 0, y: 0 }), { x: 10, y: 0 }); assert.deepEqual(orthoPoint({ x: 1, y: 9 }, { x: 0, y: 0 }), { x: 0, y: 9 });
// snaps
const M = { end: 1, mid: 1, cen: 1, int: 1, per: 1, nea: 0 };
const L1 = { id: 'a', ...make.line(0, 0, 10, 0) }, L2 = { id: 'b', ...make.line(4, -3, 4, 8) }, C = { id: 'c', ...make.circle(20, 20, 3) };
let s = snapPoint([L1, L2, C], { x: 0.2, y: 0.1 }, 1, M); assert.equal(s.type, 'end'); near(s.x, 0);
s = snapPoint([L1], { x: 5.1, y: 0.2 }, 1, M); assert.equal(s.type, 'mid'); near(s.x, 5);
s = snapPoint([L1, L2], { x: 4.2, y: 0.3 }, 1, M); assert.equal(s.type, 'int'); near(s.x, 4); near(s.y, 0);
s = snapPoint([C], { x: 20.1, y: 19.9 }, 1, M); assert.equal(s.type, 'cen');
s = snapPoint([L1], { x: 7.3, y: 0.4 }, 1, M, { x: 7, y: 6 }); assert.equal(s.type, 'per'); near(s.x, 7); near(s.y, 0);
assert.equal(snapPoint([L1], { x: 3, y: 4 }, 1, M), null);
s = snapPoint([L1], { x: 3.3, y: 0.4 }, 1, { ...M, nea: 1 }); assert.equal(s.type, 'nea'); near(s.x, 3.3);
// layers
const d = new Drawing(); const a = d.add(make.line(0, 0, 1, 1)); assert.equal(a.layer, '0');
d.addLayer('WALLS'); d.current = 'WALLS'; const b = d.add(make.line(0, 5, 1, 5)); assert.equal(b.layer, 'WALLS');
assert.throws(() => d.addLayer('walls')); assert.throws(() => d.addLayer('  ')); assert.throws(() => d.removeLayer('WALLS')); assert.throws(() => d.removeLayer('0'));
d.layer('WALLS').visible = false; assert.ok(!d.isVisible(b)); assert.ok(!d.isSelectable(b)); assert.equal(pick(d.entities.filter(e => d.isSelectable(e)), 0.5, 5, 1), null);
d.layer('WALLS').visible = true; d.layer('WALLS').locked = true; assert.ok(d.isVisible(b) && !d.isSelectable(b));
d.layer('WALLS').locked = false; d.renameLayer('WALLS', 'Walls'); assert.equal(b.layer, 'Walls'); assert.equal(d.current, 'Walls'); assert.equal(d.colorOf(b), d.layer('Walls').color);
d.assign([b.id], '0'); assert.equal(b.layer, '0'); d.current = '0'; d.removeLayer('Walls'); assert.equal(d.layers.length, 1);
d.addLayer('X'); d.isolate('X'); assert.ok(!d.isVisible(a));
console.log('precision tests passed');
