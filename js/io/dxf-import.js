import { make, validate } from '../core/entity.js';
import { aciToHex, intToHex, DEFAULT_HEX } from './dxf-common.js';
import { canon } from '../geometry/linetypes.js';
const RAD = Math.PI / 180;
export function readPairs(text) {
  if (/^\s*AutoCAD Binary DXF/.test(text)) throw new Error('Binary DXF is not supported. Save the drawing as ASCII DXF.');
  const lines = text.split(/\r?\n/); while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length < 4) throw new Error('This file is too short to be a DXF drawing.');
  if (lines.length % 2) throw new Error('The DXF file looks truncated (odd number of lines).');
  const pairs = []; for (let i = 0; i < lines.length; i += 2) { const c = Number(lines[i].trim());
    if (!Number.isInteger(c) || c < 0 || lines[i].trim() === '') throw new Error(`Line ${i + 1} is not a DXF group code; this does not look like an ASCII DXF file.`); pairs.push([c, lines[i + 1].trim()]); }
  return pairs;
}
function sections(pairs) {
  const s = {}; for (let i = 0; i < pairs.length; i++) if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION' && pairs[i + 1]?.[0] === 2) { const name = pairs[i + 1][1], body = []; i += 2;
    while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) body.push(pairs[i++]); s[name] = body; }
  if (!Object.keys(s).length) throw new Error('No DXF sections found; this does not look like a DXF drawing.'); return s;
}
const records = body => { const r = []; for (const p of body) { if (p[0] === 0) r.push({ type: p[1], g: [] }); else r.at(-1)?.g.push(p); } return r; };
const first = (g, c) => g.find(p => p[0] === c)?.[1];
const fnum = (g, c, d) => { const v = first(g, c); if (v === undefined) return d; const n = Number(v); if (!Number.isFinite(n)) throw new Error(`group ${c} has a non-numeric value "${v}"`); return n; };
export function importDxf(text) {
  const sec = sections(readPairs(text)), warnings = [], skipped = {}, done = {}, skip = (t, why) => { const k = why ? `${t} (${why})` : t; skipped[k] = (skipped[k] || 0) + 1; };
  let units = 'mm'; const hd = sec.HEADER || [];
  for (let i = 0; i < hd.length - 1; i++) if (hd[i][0] === 9 && hd[i][1] === '$INSUNITS') { const u = Number(hd[i + 1][1]); if (u === 6) units = 'm'; else if (u !== 4 && u !== 0) warnings.push(`Drawing units code ${u} is not supported; treated as millimetres. Check the scale.`); }
  const layers = [], byLower = new Map(), mk = (name, extra = {}) => { const l = { name, color: DEFAULT_HEX, lineType: 'CONTINUOUS', lineWeight: 0.25, visible: true, locked: false, frozen: false, plot: true, ...extra }; layers.push(l); byLower.set(name.toLowerCase(), l); return l; };
  let ltypes = 0;
  for (const r of records(sec.TABLES || [])) if (r.type === 'LAYER') { const name = first(r.g, 2); if (!name || byLower.has(name.toLowerCase())) continue;
    const c = fnum(r.g, 62, 7), tc = first(r.g, 420), flags = fnum(r.g, 70, 0), lw = fnum(r.g, 370, -3), lt = first(r.g, 6);
    if (lt && !canon(lt)) ltypes++;
    mk(name, { lineType: canon(lt) || 'CONTINUOUS', color: tc !== undefined ? intToHex(+tc) : aciToHex(c) || DEFAULT_HEX, visible: c >= 0, frozen: !!(flags & 1), locked: !!(flags & 4), plot: first(r.g, 290) !== '0', lineWeight: lw > 0 ? lw / 100 : 0.25 }); }
  if (ltypes) warnings.push(`${ltypes} layer(s) use line types EVLab does not have; they were imported as Continuous.`);
  if (!byLower.has('0')) mk('0'); layers.sort((a, b) => (a.name === '0' ? -1 : b.name === '0' ? 1 : 0));
  const ents = []; let flat = 0, n = 1, aligned_n = 0, mtext = 0, entLt = 0;
  const ltOf = g => { const t = first(g, 6); if (!t || /^BY(LAYER|BLOCK)$/i.test(t)) return {}; const c = canon(t); if (!c) { entLt++; return {}; } return { lineType: c }; };
  const layerOf = g => { const nm = first(g, 8) || '0'; return (byLower.get(nm.toLowerCase()) || mk(nm)).name; };
  const colorOf = g => { const tc = first(g, 420); if (tc !== undefined) return intToHex(+tc); const c = fnum(g, 62, 256); return c > 0 && c < 256 ? aciToHex(c) || 'BYLAYER' : 'BYLAYER'; };
  const z3 = g => { if ([30, 31].some(c => Math.abs(fnum(g, c, 0)) > 1e-12)) flat++; };
  const flipped = g => Math.abs(fnum(g, 230, 1) - 1) > 1e-9 || Math.abs(fnum(g, 210, 0)) > 1e-9 || Math.abs(fnum(g, 220, 0)) > 1e-9;
  const add = (type, g, geo) => { const e = { id: 'E' + n, layer: layerOf(g), color: colorOf(g), ...ltOf(g), ...geo }, err = validate(e); if (err) return skip(type, 'invalid geometry'); n++; ents.push(e); done[type] = (done[type] || 0) + 1; };
  const verts = (list, closedFlag) => { const v = list.filter(p => p).map(p => [p.x, p.y]); return { pts: v, closed: closedFlag }; };
  const recs = records(sec.ENTITIES || []);
  for (let i = 0; i < recs.length; i++) {
    const { type, g } = recs[i];
    try {
      if (type === 'LINE') { z3(g); add('LINE', g, make.line(fnum(g, 10, 0), fnum(g, 20, 0), fnum(g, 11, 0), fnum(g, 21, 0))); }
      else if (type === 'CIRCLE') { if (flipped(g)) skip(type, 'extrusion direction'); else { z3(g); add('CIRCLE', g, make.circle(fnum(g, 10, 0), fnum(g, 20, 0), fnum(g, 40, 0))); } }
      else if (type === 'ARC') { if (flipped(g)) skip(type, 'extrusion direction'); else { z3(g); add('ARC', g, make.arc(fnum(g, 10, 0), fnum(g, 20, 0), fnum(g, 40, 0), fnum(g, 50, 0) * RAD, fnum(g, 51, 0) * RAD)); } }
      else if (type === 'LWPOLYLINE') {
        if (flipped(g)) { skip(type, 'extrusion direction'); continue; }
        const v = []; for (const [c, val] of g) { if (c === 10) v.push({ x: Number(val), y: 0, b: 0 }); else if (c === 20 && v.length) v.at(-1).y = Number(val); else if (c === 42 && v.length) v.at(-1).b = Number(val); }
        if (v.some(p => Math.abs(p.b) > 1e-12)) skip(type, 'bulge arcs'); else if (v.some(p => !Number.isFinite(p.x + p.y))) skip(type, 'bad vertex');
        else add('LWPOLYLINE', g, make.polyline(v.map(p => [p.x, p.y]), !!(fnum(g, 70, 0) & 1)));
      } else if (type === 'POLYLINE') {
        const vs = []; while (recs[i + 1] && recs[i + 1].type === 'VERTEX') vs.push(recs[++i].g); if (recs[i + 1]?.type === 'SEQEND') i++;
        const fl = fnum(g, 70, 0);
        if (fl & (8 | 16 | 64)) skip(type, '3D polyline or mesh'); else if (vs.some(q => Math.abs(fnum(q, 42, 0)) > 1e-12)) skip(type, 'bulge arcs'); else if (flipped(g)) skip(type, 'extrusion direction');
        else add('POLYLINE', g, make.polyline(vs.map(q => [fnum(q, 10, 0), fnum(q, 20, 0)]), !!(fl & 1)));
      } else if (type === 'POINT') { z3(g); add('POINT', g, { type: 'point', x: fnum(g, 10, 0), y: fnum(g, 20, 0) });
      } else if (type === 'XLINE' || type === 'RAY') { add(type, g, { type: type === 'XLINE' ? 'xline' : 'ray', x: fnum(g, 10, 0), y: fnum(g, 20, 0), a: Math.atan2(fnum(g, 21, 0), fnum(g, 11, 1)) });
      } else if (type === 'TEXT' || type === 'MTEXT') {
        if (flipped(g)) { skip(type, 'extrusion direction'); continue; }
        if (type === 'TEXT') {
          const str = (first(g, 1) || '').replace(/%%c/gi, '⌀').replace(/%%d/gi, '°').replace(/%%p/gi, '±'), a = fnum(g, 72, 0), v = fnum(g, 73, 0), aligned = (a || v) && first(g, 11) !== undefined;
          if (aligned && !(a === 1 && v === 0)) aligned_n++;
          add('TEXT', g, { type: 'text', x: aligned ? fnum(g, 11, 0) : fnum(g, 10, 0), y: aligned ? fnum(g, 21, 0) : fnum(g, 20, 0), h: fnum(g, 40, 0), rot: fnum(g, 50, 0) * RAD, str, ...(a === 1 && v === 0 && aligned ? { center: true } : {}) });
        } else {
          const raw = g.filter(p => p[0] === 3).map(p => p[1]).join('') + (first(g, 1) || ''), str = raw.replace(/\\P/g, '\n').replace(/\\[A-Za-z][^;\\]*;/g, '').replace(/[{}]/g, '').replace(/\\\\/g, '\\'), h = fnum(g, 40, 2.5);
          const rot = first(g, 11) !== undefined ? Math.atan2(fnum(g, 21, 0), fnum(g, 11, 1)) : 0; mtext++;
          add('MTEXT', g, { type: 'text', x: fnum(g, 10, 0) + Math.sin(rot) * h, y: fnum(g, 20, 0) - Math.cos(rot) * h, h, rot, str });
        }
      } else if (type !== 'VERTEX' && type !== 'SEQEND') skip(type);
    } catch (e) { skip(type, e.message); }
  }
  if (entLt) warnings.push(`${entLt} object(s) use line types EVLab does not have; they follow their layer instead.`);
  if (flat) warnings.push(`${flat} object(s) had non-zero Z coordinates; Z was dropped (2D drawing).`);
  if (aligned_n) warnings.push(`${aligned_n} text object(s) use alignments other than left/centre; placed approximately.`);
  if (mtext) warnings.push(`${mtext} MTEXT object(s) imported with simplified formatting (no wrapping, fonts or colours inside the text).`);
  const sk = Object.entries(skipped).map(([k, v]) => `${k} ×${v}`);
  if (sk.length) warnings.push(`Skipped unsupported objects: ${sk.join(', ')}.`);
  if (!ents.length && !sk.length) warnings.push('The file contains no drawing objects.');
  return { entities: ents, layers, nextId: n, units, warnings, counts: done, skipped };
}
