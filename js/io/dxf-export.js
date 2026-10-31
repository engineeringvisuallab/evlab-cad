import { norm, segments } from '../core/entity.js';
import { expand } from '../geometry/expand.js';
import { hexToAci, hexToInt, DEFAULT_HEX } from './dxf-common.js';
const DEG = 180 / Math.PI;
const num = v => { let s = String(v); if (/e/i.test(s)) s = v.toFixed(15).replace(/0+$/, ''); return /^-?\d+$/.test(s) ? s + '.0' : s.replace(/\.$/, '.0'); };
// Writes DXF R2000 (AC1015) ASCII: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, layers, units. Dimensions are exported as plain geometry (not associative).
export function exportDxf(d) {
  const warnings = [], clean = n => { const c = n.replace(/[<>/\\":;?*|=`]/g, '_'); if (c !== n) warnings.push(`Layer name "${n}" contains characters DXF forbids; written as "${c}".`); return c; };
  let h = 0x100; const H = () => (h++).toString(16).toUpperCase(), tag = [];
  const isFloat = c => (c >= 10 && c <= 59) || (c >= 110 && c <= 149) || (c >= 210 && c <= 239); // DXF: only these groups hold reals; the rest must be integers
  const w = (a, c, v) => a.push(String(c), typeof v === 'number' ? (isFloat(c) ? num(v) : String(Math.round(v))) : String(v));
  const ms = H(), ps = H();
  const ent = []; const E = (type, layer, e, sub) => { w(ent, 0, type); w(ent, 5, H()); w(ent, 330, ms); w(ent, 100, 'AcDbEntity'); w(ent, 8, clean(layer));
    if (e && e.color && e.color !== 'BYLAYER') { w(ent, 62, hexToAci(e.color)); if (e.color !== DEFAULT_HEX) w(ent, 420, hexToInt(e.color)); } sub?.(); };
  const lineE = (layer, e, x1, y1, x2, y2) => E('LINE', layer, e, () => { w(ent, 100, 'AcDbLine'); w(ent, 10, x1); w(ent, 20, y1); w(ent, 30, 0); w(ent, 11, x2); w(ent, 21, y2); w(ent, 31, 0); });
  const polyE = (layer, e, pts, closed) => E('LWPOLYLINE', layer, e, () => { w(ent, 100, 'AcDbPolyline'); w(ent, 90, pts.length); w(ent, 70, closed ? 1 : 0); pts.forEach(p => { w(ent, 10, p[0]); w(ent, 20, p[1]); }); });
  const textE = (layer, t) => {
    const lines = t.str.split('\n'), c = Math.cos(t.rot), sn = Math.sin(t.rot), str = t.str.replace(/⌀/g, '%%c');
    if (lines.length > 1) E('MTEXT', layer, t, () => { w(ent, 100, 'AcDbMText'); w(ent, 10, t.x - sn * t.h); w(ent, 20, t.y + c * t.h); w(ent, 30, 0); w(ent, 40, t.h); w(ent, 71, 1); w(ent, 1, str.replace(/\n/g, '\\P')); w(ent, 11, c); w(ent, 21, sn); w(ent, 31, 0); });
    else E('TEXT', layer, t, () => { w(ent, 100, 'AcDbText'); w(ent, 10, t.x); w(ent, 20, t.y); w(ent, 30, 0); w(ent, 40, t.h); w(ent, 1, str); w(ent, 50, norm(t.rot) * DEG);
      if (t.center) { w(ent, 72, 1); w(ent, 11, t.x); w(ent, 21, t.y); w(ent, 31, 0); } w(ent, 100, 'AcDbText'); });
  };
  const emit = (e, layer) => {
    if (e.type === 'line') lineE(layer, e, e.x1, e.y1, e.x2, e.y2);
    else if (e.type === 'polyline') polyE(layer, e, e.pts, e.closed);
    else if (e.type === 'circle') E('CIRCLE', layer, e, () => { w(ent, 100, 'AcDbCircle'); w(ent, 10, e.cx); w(ent, 20, e.cy); w(ent, 30, 0); w(ent, 40, e.r); });
    else if (e.type === 'arc') E('ARC', layer, e, () => { w(ent, 100, 'AcDbCircle'); w(ent, 10, e.cx); w(ent, 20, e.cy); w(ent, 30, 0); w(ent, 40, e.r); w(ent, 100, 'AcDbArc'); w(ent, 50, norm(e.a0) * DEG); w(ent, 51, norm(e.a1) * DEG); });
    else if (e.type === 'text') textE(layer, e);
    else if (e.type === 'point') E('POINT', layer, e, () => { w(ent, 100, 'AcDbPoint'); w(ent, 10, e.x); w(ent, 20, e.y); w(ent, 30, 0); });
    else if (e.type === 'xline' || e.type === 'ray') E(e.type === 'xline' ? 'XLINE' : 'RAY', layer, e, () => { w(ent, 100, e.type === 'xline' ? 'AcDbXline' : 'AcDbRay'); w(ent, 10, e.x); w(ent, 20, e.y); w(ent, 30, 0); w(ent, 11, Math.cos(e.a)); w(ent, 21, Math.sin(e.a)); w(ent, 31, 0); });
  };
  let dims = 0, inserts = 0;
  for (const e of d.entities) {
    if (e.type === 'dim' || e.type === 'insert') {
      const prims = expand(d, e); if (!prims.length) { warnings.push(`${e.type === 'dim' ? 'Dimension' : 'Block reference'} ${e.id} has lost its reference and was not exported.`); continue; }
      e.type === 'dim' ? dims++ : inserts++; prims.forEach(p => emit({ ...p, color: p.color ?? e.color }, e.layer));
    } else emit(e, e.layer);
  }
  if (inserts) warnings.push(`${inserts} block reference(s) exported as exploded geometry (block definitions are not written to DXF yet).`);
  if (dims) warnings.push(`${dims} dimension(s) exported as plain lines, arrowheads and text; they will not update in other CAD software.`);
  const out = [], o = (c, v) => w(out, c, v);
  o(0, 'SECTION'); o(2, 'HEADER'); o(9, '$ACADVER'); o(1, 'AC1015'); o(9, '$HANDSEED'); o(5, (h + 16).toString(16).toUpperCase()); o(9, '$INSUNITS'); o(70, d.units === 'm' ? 6 : 4); o(0, 'ENDSEC');
  o(0, 'SECTION'); o(2, 'TABLES');
  const table = (name, n, recs) => { o(0, 'TABLE'); o(2, name); o(5, H()); o(100, 'AcDbSymbolTable'); o(70, n); recs(); o(0, 'ENDTAB'); };
  table('LTYPE', 1, () => { o(0, 'LTYPE'); o(5, H()); o(100, 'AcDbSymbolTableRecord'); o(100, 'AcDbLinetypeTableRecord'); o(2, 'CONTINUOUS'); o(70, 0); o(3, 'Solid line'); o(72, 65); o(73, 0); o(40, 0); });
  if (d.layers.some(l => l.lineType !== 'Continuous')) warnings.push('Line types other than Continuous are not exported yet; all layers are written as CONTINUOUS.');
  table('LAYER', d.layers.length, () => d.layers.forEach(l => { o(0, 'LAYER'); o(5, H()); o(100, 'AcDbSymbolTableRecord'); o(100, 'AcDbLayerTableRecord'); o(2, clean(l.name));
    o(70, (l.frozen ? 1 : 0) | (l.locked ? 4 : 0)); o(62, (l.visible ? 1 : -1) * hexToAci(l.color)); if (l.color !== DEFAULT_HEX) o(420, hexToInt(l.color)); o(6, 'CONTINUOUS'); o(290, l.plot ? 1 : 0); o(370, Math.round(l.lineWeight * 100)); }));
  table('STYLE', 1, () => { o(0, 'STYLE'); o(5, H()); o(100, 'AcDbSymbolTableRecord'); o(100, 'AcDbTextStyleTableRecord'); o(2, 'STANDARD'); o(70, 0); o(40, 0); o(41, 1); o(50, 0); o(71, 0); o(42, 2.5); o(3, 'txt'); o(4, ''); });
  table('BLOCK_RECORD', 2, () => [[ms, '*Model_Space'], [ps, '*Paper_Space']].forEach(([hh, n]) => { o(0, 'BLOCK_RECORD'); o(5, hh); o(100, 'AcDbSymbolTableRecord'); o(100, 'AcDbBlockTableRecord'); o(2, n); }));
  o(0, 'ENDSEC'); o(0, 'SECTION'); o(2, 'BLOCKS');
  for (const n of ['*Model_Space', '*Paper_Space']) { o(0, 'BLOCK'); o(5, H()); o(100, 'AcDbEntity'); o(8, '0'); o(100, 'AcDbBlockBegin'); o(2, n); o(70, 0); o(10, 0); o(20, 0); o(30, 0); o(3, n); o(1, '');
    o(0, 'ENDBLK'); o(5, H()); o(100, 'AcDbEntity'); o(8, '0'); o(100, 'AcDbBlockEnd'); }
  o(0, 'ENDSEC'); o(0, 'SECTION'); o(2, 'ENTITIES');
  return { text: out.concat(ent).join('\r\n') + '\r\n' + ['0', 'ENDSEC', '0', 'SECTION', '2', 'OBJECTS', '0', 'DICTIONARY', '5', 'C', '100', 'AcDbDictionary', '281', '1', '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n', warnings };
}
