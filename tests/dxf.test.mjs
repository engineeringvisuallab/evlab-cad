import assert from 'node:assert/strict';
import { make, norm, bounds } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import { importDxf, readPairs } from '../js/io/dxf-import.js';
import { exportDxf } from '../js/io/dxf-export.js';
import { aciToHex, hexToAci } from '../js/io/dxf-common.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
// ---- round trip: build -> export -> import -> compare
const d = new Drawing(); d.units = 'm'; d.addLayer('WALLS'); d.layer('WALLS').color = '#3366cc'; d.layer('WALLS').locked = true; d.layer('WALLS').lineWeight = 0.5;
d.addLayer('HIDDEN'); d.layer('HIDDEN').visible = false; d.layer('HIDDEN').plot = false; d.addLayer('FROZEN'); d.layer('FROZEN').frozen = true;
d.current = 'WALLS'; d.add(make.line(0, 0, 10.123456789, 5)); d.add(make.circle(3, 4, 2.5)); d.add(make.arc(1, 1, 3, 0.3, 4)); d.add(make.rect({ x: 0, y: 0 }, { x: 6, y: 4 }));
d.add({ ...make.polyline([[0, 0], [1, 2], [3, 1]], false), color: '#ff8800' }); d.current = '0'; d.add(make.line(-5, -5, 5, 5));
const L = d.add(make.line(0, 0, 3, 4)); d.add({ type: 'dim', dtype: 'aligned', ref: L.id, o: [0, 5] });
const ex = exportDxf(d);
{ const t = ex.text.split('\r\n'); for (let i = 0; i + 1 < t.length; i += 2) { const c = +t[i], v = t[i + 1]; if (c === 70 || c === 90 || c === 62 || c === 290 || c === 370 || c === 420 || c === 72) assert.match(v, /^-?\d+$/, `group ${c} must be an integer, got ${v}`); if (c >= 10 && c <= 59 && c !== 20 + 0 * 1) assert.match(v, /^-?\d*\.\d+$/, `group ${c} must be a real, got ${v}`); } } assert.ok(ex.warnings.some(w => /dimension/.test(w)));
const im = importDxf(ex.text);
assert.equal(im.units, 'm'); assert.deepEqual(im.layers.map(l => l.name).sort(), ['0', 'FROZEN', 'HIDDEN', 'WALLS']);
const lw = im.layers.find(l => l.name === 'WALLS'); assert.equal(lw.color, '#3366cc'); assert.ok(lw.locked); near(lw.lineWeight, 0.5);
assert.ok(!im.layers.find(l => l.name === 'HIDDEN').visible); assert.ok(!im.layers.find(l => l.name === 'HIDDEN').plot); assert.ok(im.layers.find(l => l.name === 'FROZEN').frozen);
const src = d.entities.filter(e => e.type !== 'dim'), got = im.entities.slice(0, src.length);
assert.equal(got.length, src.length);
src.forEach((e, i) => { const g = got[i]; assert.equal(g.type, e.type); assert.equal(g.layer, e.layer); assert.equal(g.color, e.color);
  const b1 = bounds(e), b2 = bounds(g); ['minX', 'minY', 'maxX', 'maxY'].forEach(k => near(b1[k], b2[k]));
  if (e.type === 'arc') { near(norm(g.a0), norm(e.a0)); near(norm(g.a1), norm(e.a1)); near(g.r, e.r); }
  if (e.type === 'polyline') { assert.equal(g.closed, e.closed); assert.deepEqual(g.pts, e.pts); } });
assert.ok(im.entities.length > src.length);                  // dimension arrived as plain lines/polylines, text skipped
assert.ok(im.counts.TEXT >= 1);                              // dimension text comes back as ordinary text
// ---- second generation is stable
const d2 = new Drawing(); d2.layers = im.layers; d2.entities = im.entities; const im2 = importDxf(exportDxf(d2).text);
assert.equal(im2.entities.length, im.entities.length); assert.deepEqual(im2.entities.map(e => e.type), im.entities.map(e => e.type));
// ---- hand-written files like other CAD programs produce
const pairs = a => a.join('\r\n') + '\r\n';
const r12 = pairs(['0', 'SECTION', '2', 'ENTITIES', '0', 'POLYLINE', '8', 'ROAD', '66', '1', '70', '1', '0', 'VERTEX', '8', 'ROAD', '10', '0.0', '20', '0.0', '0', 'VERTEX', '8', 'ROAD', '10', '4.0', '20', '0.0', '0', 'VERTEX', '8', 'ROAD', '10', '4.0', '20', '3.0', '0', 'SEQEND', '0', 'ENDSEC', '0', 'EOF']);
let r = importDxf(r12); assert.equal(r.entities.length, 1); assert.ok(r.entities[0].closed); assert.equal(r.entities[0].pts.length, 3); assert.equal(r.entities[0].layer, 'ROAD'); assert.ok(r.layers.some(l => l.name === 'ROAD')); // layer created though no table
const mixed = pairs(['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
  '0', 'POINT', '8', '0', '10', '1', '20', '1', '0', 'ELLIPSE', '8', '0', '10', '0', '20', '0', '0', 'LWPOLYLINE', '8', '0', '90', '2', '70', '0', '10', '0', '20', '0', '42', '0.5', '10', '1', '20', '0',
  '0', 'CIRCLE', '8', '0', '10', '0', '20', '0', '40', '2', '210', '0', '220', '0', '230', '-1', '0', 'LINE', '8', '0', '10', '0', '20', '0', '30', '5', '11', '1', '21', '1', '31', '0', '0', 'ENDSEC', '0', 'EOF']);
r = importDxf(mixed); assert.equal(r.entities.length, 2); assert.deepEqual(r.entities.map(e => e.type), ['point', 'line']); assert.equal(r.units, 'mm'); const msg = r.warnings.join(' ');
for (const k of ['ELLIPSE', 'bulge', 'extrusion', 'Z']) assert.ok(msg.includes(k), k); assert.ok(!msg.includes('POINT'));
// ---- ACI colours and rejections
assert.equal(aciToHex(1), '#ff0000'); assert.equal(aciToHex(7), '#e8eef2'); assert.equal(aciToHex(250), '#333333'); assert.equal(aciToHex(10), '#ff0000'); assert.equal(aciToHex(256), null);
assert.equal(hexToAci('#ff0010'), 1); assert.equal(hexToAci('#e8eef2'), 7);
assert.throws(() => importDxf('hello\nworld\nthis is\nnot dxf'), /group code/); assert.throws(() => importDxf('0\nSECTION\n2\nENTITIES\n0'), /truncated/); assert.throws(() => importDxf('AutoCAD Binary DXF\r\n\x1a\x00'), /Binary/);
assert.throws(() => importDxf('0\nEOF\n0\nEOF\n'), /sections/); assert.throws(() => readPairs(''), /short/);
console.log('dxf tests passed');
