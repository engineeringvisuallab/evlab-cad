import assert from 'node:assert/strict';
import { make } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import * as J from '../js/io/json.js';
import * as S from '../js/io/storage.js';
import { resolveDim } from '../js/geometry/dimensions.js';
const build = () => { const d = new Drawing(); d.addLayer('WALLS'); d.current = 'WALLS'; d.layer('WALLS').color = '#123456'; d.layer('WALLS').locked = true; d.units = 'm';
  const l = d.add(make.line(0, 0, 3, 4)); d.add(make.circle(5, 5, 2)); d.add(make.arc(0, 0, 1, 0.5, 2)); d.add(make.rect({ x: 0, y: 0 }, { x: 4, y: 3 }));
  d.add({ type: 'dim', dtype: 'aligned', ref: l.id, o: [0, 5] }); d.remove([d.entities[1].id]); return d; };
// round trip
const a = build(), text = J.serialize(a, { name: 'x', id: 'p1' }), o = J.parse(text), b = new Drawing(); J.applyProject(b, o);
assert.deepEqual(b.entities, a.entities); assert.deepEqual(b.layers, a.layers); assert.equal(b.current, 'WALLS'); assert.equal(b.units, 'm'); assert.equal(b.nextId, a.nextId); assert.equal(o.meta.id, 'p1');
assert.equal(resolveDim(b, b.entities.find(e => e.type === 'dim')).text.str, '5.00');         // dimension still live after load
assert.equal(b.add(make.line(0, 0, 1, 1)).id, 'E' + a.nextId);                                  // no ID collision
// rejections (each must leave the target drawing unchanged because parse throws before apply)
const bad = (mutate, re) => { const x = JSON.parse(text); mutate(x); assert.throws(() => J.parse(JSON.stringify(x)), re); };
assert.throws(() => J.parse('{oops'), /not valid JSON/); assert.throws(() => J.parse('{"a":1}'), /not an EVLab/); assert.throws(() => J.parse('null'), /not an EVLab/);
bad(x => x.version = 99, /newer/); bad(x => x.version = 'a', /version/); bad(x => x.layers = [], /Layer "0"/); bad(x => x.entities[0].layer = 'NOPE', /missing layer/);
bad(x => x.entities[1].id = x.entities[0].id, /twice/); bad(x => { x.entities[0].x2 = 0; x.entities[0].y2 = 0; }, /same point/); bad(x => x.entities[0].type = 'blob', /Unknown/);
bad(x => x.layers.push({ name: 'WALLS' }), /twice/); bad(x => delete x.entities, /missing/);
const fixed = JSON.parse(text); fixed.nextId = 1; assert.ok(J.parse(JSON.stringify(fixed)).nextId > 4);   // repaired, not corrupted
const missingLayerProps = JSON.parse(text); missingLayerProps.layers[0] = { name: '0' }; assert.equal(J.parse(JSON.stringify(missingLayerProps)).layers[0].visible, true);
// storage: per-project keys, clean removal, ordering
const fake = () => { const m = new Map(); return { get length() { return m.size; }, key: i => [...m.keys()][i], getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
const st = fake(); st.setItem('other-app', 'x');
S.autosave({ id: 'A', name: 'Alpha', modified: 1, data: text }, st); S.autosave({ id: 'B', name: 'Beta', modified: 2, data: text }, st); S.autosave({ id: 'A', name: 'Alpha', modified: 3, data: text }, st);
assert.deepEqual(S.listRecoverable(st).map(r => r.id), ['A', 'B']); assert.equal(S.listRecoverable(st).length, 2);                 // A updated in place, B untouched
S.discard('A', st); assert.deepEqual(S.listRecoverable(st).map(r => r.id), ['B']); assert.equal(st.getItem('other-app'), 'x');
st.setItem('evlab:autosave:C', '{broken'); assert.equal(S.listRecoverable(st).length, 1); assert.ok(st.getItem('evlab:autosave:C'));   // damaged record skipped, not deleted
console.log('io tests passed');
