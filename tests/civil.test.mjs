import assert from 'node:assert/strict';
import { make } from '../js/core/entity.js';
import { Drawing } from '../js/core/document.js';
import { parseSurveyCsv, plotSurvey } from '../js/civil/survey.js';
import { label, pointAt, addChainage } from '../js/civil/chainage.js';
import { parseProfileCsv, drawProfile } from '../js/civil/profile.js';
import { quantities, quantitiesCsv, coordinatesCsv } from '../js/civil/quantities.js';
import * as J from '../js/io/json.js';
import { exportDxf } from '../js/io/dxf-export.js';
import { importDxf } from '../js/io/dxf-import.js';
import { buildSheet } from '../js/layouts/paper-space.js';
import { exportPdf } from '../js/io/pdf-export.js';
import { exportSvg } from '../js/io/svg-export.js';
const near = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) < t, `${a} !== ${b}`);
// ---- survey parsing
const rows = parseSurveyCsv('ID,E,N,Z,Desc\n1,100.5,200.25,45.123,MH\n2,110,205,,tree\n3;120;210;46;fence post');
assert.equal(rows.length, 3); assert.deepEqual([rows[0].x, rows[0].y, rows[0].z, rows[0].desc], [100.5, 200.25, 45.123, 'MH']); assert.equal(rows[1].z, null); assert.equal(rows[2].desc, 'fence post');
assert.deepEqual([parseSurveyCsv('1,10,20', 'NE')[0].x, parseSurveyCsv('1,10,20', 'NE')[0].y], [20, 10]);
assert.equal(parseSurveyCsv('4 5.0 6.0 7.0 big oak')[0].desc, 'big oak'); assert.equal(parseSurveyCsv('# comment\n\t\n9\t1\t2\t3\tpole')[0].id, '9');
assert.throws(() => parseSurveyCsv('1,a,b\n2,1,2\n3,x,5'), /Line 3.*Nothing was plotted/); assert.throws(() => parseSurveyCsv('only,two'), /at least ID/); assert.throws(() => parseSurveyCsv('  \n'), /No survey points/);
assert.throws(() => parseSurveyCsv('1,1,2,abc'), /elevation/);
// ---- plotting (sizes follow layout scale)
let d = new Drawing(); d.layout.scale = 100; plotSurvey(d, rows); assert.equal(d.entities.length, 3 + 3 + 2 + 3);
for (const n of ['SURVEY_PTS', 'SURVEY_NO', 'SURVEY_ELEV', 'SURVEY_DESC']) assert.ok(d.layer(n), n); assert.ok(d.blocks.SURVEY_POINT);
assert.ok(d.entities.some(e => e.type === 'text' && e.str === '45.123')); near(d.entities.find(e => e.type === 'text').h, 250); near(d.entities[0].s, 150);
const dm = new Drawing(); dm.units = 'm'; dm.layout.scale = 100; plotSurvey(dm, rows.slice(0, 1), { elev: false, desc: false }); assert.equal(dm.entities.length, 2); near(dm.entities[1].h, 0.25);
// ---- chainage
assert.equal(label(0), '0+000.000'); assert.equal(label(1250.5), '1+250.500'); assert.equal(label(999.9996), '1+000.000'); assert.equal(label(-20), '-0+020.000');
const L = [[0, 0], [10, 0], [10, 10]]; let p = pointAt(L, 5); near(p.x, 5); near(p.a, 0); p = pointAt(L, 15); near(p.x, 10); near(p.y, 5); near(p.a, Math.PI / 2); p = pointAt(L, 99); near(p.y, 10);
d = new Drawing(); d.layout.scale = 100; const ln = d.add(make.line(0, 0, 100000, 0)); let r = addChainage(d, ln, { start: 0, interval: 20 });
assert.equal(r.marks, 6); near(r.lengthM, 100); assert.equal(d.entities.length, 1 + 12); const t40 = d.entities.find(e => e.str === '0+040.000'); near(t40.x, 40000); near(t40.y, 350);
const tick = d.entities.filter(e => e.type === 'line' && e.layer === 'CHAINAGE')[0]; near(tick.y1, -250); near(tick.y2, 250);
d = new Drawing(); const ln2 = d.add(make.line(0, 0, 100000, 0)); r = addChainage(d, ln2, { start: 150, interval: 20 }); assert.equal(r.marks, 7);
assert.deepEqual(d.entities.filter(e => e.type === 'text').map(e => e.str), ['0+150.000', '0+160.000', '0+180.000', '0+200.000', '0+220.000', '0+240.000', '0+250.000']);
d = new Drawing(); d.units = 'm'; const sq = d.add(make.rect({ x: 0, y: 0 }, { x: 10, y: 10 })); assert.equal(addChainage(d, sq, { start: 0, interval: 10 }).marks, 5);
assert.throws(() => addChainage(d, d.add(make.circle(0, 0, 1)), { start: 0, interval: 10 }), /line or polyline/); assert.throws(() => addChainage(d, sq, { start: 0, interval: 0 }), /interval/);
// ---- profile
assert.throws(() => parseProfileCsv('0,1\n0,2'), /must increase/); assert.throws(() => parseProfileCsv('0,1'), /at least 2/); assert.throws(() => parseProfileCsv('0,1\n5,x'), /Line 2/);
const prow = parseProfileCsv('chainage,level\n0,45\n20,46'); d = new Drawing(); d.units = 'm'; assert.equal(drawProfile(d, prow, { datum: 44, ve: 10 }), 2);
const g = d.entities.find(e => e.type === 'polyline'); assert.deepEqual(g.pts, [[0, 10], [20, 20]]); assert.equal(d.entities.length, 1 + 1 + 2 * 3 + 1);
const dmm = new Drawing(); drawProfile(dmm, prow, { datum: 44, ve: 10 }); assert.deepEqual(dmm.entities.find(e => e.type === 'polyline').pts, [[0, 10000], [20000, 20000]]);
// ---- quantities and CSV
d = new Drawing(); d.addLayer('A,B'); d.blocks.T = { base: [0, 0], entities: [{ type: 'line', x1: 0, y1: 0, x2: 1, y2: 0, color: 'BYLAYER' }] };
d.add(make.line(0, 0, 1000, 0)); d.current = 'A,B'; d.add(make.rect({ x: 0, y: 0 }, { x: 2000, y: 3000 })); d.add(make.circle(0, 0, 500)); d.current = '0'; d.add({ type: 'insert', block: 'T', x: 0, y: 0, s: 1, rot: 0 });
const q = quantities(d), row = (l, k) => q.find(x => x.layer === l && x.kind === k);
near(row('0', 'line').length, 1); near(row('A,B', 'closed polyline').area, 6); near(row('A,B', 'closed polyline').length, 10); near(row('A,B', 'circle').area, Math.PI * 0.25); near(row('A,B', 'circle').length, Math.PI);
assert.equal(row('0', 'block:T').count, 1); assert.equal(row('0', 'block:T').length, 0);
const csv = quantitiesCsv(q); assert.ok(csv.startsWith('layer,type,count,total_length_m,total_area_m2')); assert.ok(csv.includes('"A,B",circle,1,3.142,0.785'));
const cc = coordinatesCsv(d).trim().split('\r\n'); assert.ok(cc[0].includes('units: mm')); assert.equal(cc.length, 1 + 2 + 4 + 1 + 1);
// ---- end-to-end regression: a small site drawing through every output
d = new Drawing(); d.units = 'm'; d.layout.scale = 200; d.layout.title = 'Regression';
plotSurvey(d, parseSurveyCsv('1,10,10,5.000,MH\n2,30,15,6.500,TREE')); const cl = d.add({ ...make.polyline([[0, 0], [40, 0], [40, 30]]), layer: '0' }); addChainage(d, cl, { start: 0, interval: 10 });
drawProfile(d, parseProfileCsv('0,5\n10,6\n20,5.5'), { x: 0, y: -50 }); const dl = d.add(make.line(0, 5, 12, 5)); d.add({ type: 'dim', dtype: 'aligned', ref: dl.id, o: [0, 8] });
const d2 = new Drawing(); J.applyProject(d2, J.parse(J.serialize(d))); assert.deepEqual(d2.entities, d.entities); assert.deepEqual(d2.layers, d.layers); assert.deepEqual(d2.blocks, d.blocks); assert.deepEqual(d2.layout, d.layout);
const ex = exportDxf(d), im = importDxf(ex.text); assert.ok(im.entities.length > d.entities.length); assert.ok(im.layers.some(l => l.name === 'CHAINAGE')); assert.ok(ex.warnings.some(w => /block reference/.test(w)));
const sheet = buildSheet(d), pdf = exportPdf(sheet); assert.ok(pdf.length > 2000); assert.equal(String.fromCharCode(...pdf.slice(0, 8)), '%PDF-1.4'); assert.ok(exportSvg(sheet).includes('Regression'));
console.log('civil tests passed');
