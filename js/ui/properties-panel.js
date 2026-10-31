import { validate, length, dist, norm } from '../core/entity.js';
const D = 180 / Math.PI, R = Math.PI / 180;
const FIELDS = {
  line: [['X1', e => e.x1, (e, v) => e.x1 = v], ['Y1', e => e.y1, (e, v) => e.y1 = v], ['X2', e => e.x2, (e, v) => e.x2 = v], ['Y2', e => e.y2, (e, v) => e.y2 = v],
    ['Length', e => dist(e.x1, e.y1, e.x2, e.y2), (e, v) => { const a = Math.atan2(e.y2 - e.y1, e.x2 - e.x1); e.x2 = e.x1 + v * Math.cos(a); e.y2 = e.y1 + v * Math.sin(a); }],
    ['Angle °', e => norm(Math.atan2(e.y2 - e.y1, e.x2 - e.x1)) * D, (e, v) => { const l = dist(e.x1, e.y1, e.x2, e.y2); e.x2 = e.x1 + l * Math.cos(v * R); e.y2 = e.y1 + l * Math.sin(v * R); }]],
  circle: [['Center X', e => e.cx, (e, v) => e.cx = v], ['Center Y', e => e.cy, (e, v) => e.cy = v], ['Radius', e => e.r, (e, v) => e.r = v], ['Diameter', e => e.r * 2, (e, v) => e.r = v / 2]],
  arc: [['Center X', e => e.cx, (e, v) => e.cx = v], ['Center Y', e => e.cy, (e, v) => e.cy = v], ['Radius', e => e.r, (e, v) => e.r = v], ['Diameter', e => e.r * 2, (e, v) => e.r = v / 2],
    ['Start °', e => norm(e.a0) * D, (e, v) => e.a0 = v * R], ['End °', e => norm(e.a1) * D, (e, v) => e.a1 = v * R]],
  polyline: [], dim: [], point: [['X', e => e.x, (e, v) => e.x = v], ['Y', e => e.y, (e, v) => e.y = v]],
  xline: [['Base X', e => e.x, (e, v) => e.x = v], ['Base Y', e => e.y, (e, v) => e.y = v], ['Angle °', e => norm(e.a) * D, (e, v) => e.a = v * R]],
  ray: [['Start X', e => e.x, (e, v) => e.x = v], ['Start Y', e => e.y, (e, v) => e.y = v], ['Angle °', e => norm(e.a) * D, (e, v) => e.a = v * R]],
  text: [['X', e => e.x, (e, v) => e.x = v], ['Y', e => e.y, (e, v) => e.y = v], ['Height', e => e.h, (e, v) => e.h = v], ['Rotation °', e => norm(e.rot) * D, (e, v) => e.rot = v * R]],
  insert: [['Insert X', e => e.x, (e, v) => e.x = v], ['Insert Y', e => e.y, (e, v) => e.y = v], ['Scale', e => e.s, (e, v) => e.s = v], ['Rotation °', e => norm(e.rot) * D, (e, v) => e.rot = v * R]],
};
const fmt = v => String(+v.toFixed(6));
import { resolveDim } from '../geometry/dimensions.js';
import { LTYPE_NAMES } from '../geometry/linetypes.js';
export function createPanel(root, drawing, getSel, onChange, say, tx) {
  function render() {
    const ents = getSel().map(id => drawing.get(id)).filter(Boolean);
    root.innerHTML = '';
    const h = t => { const d = document.createElement('div'); d.className = 'prow'; d.innerHTML = t; root.appendChild(d); return d; };
    if (!ents.length) return h('<i>Nothing selected</i>');
    if (ents.length > 1) return h(`<b>${ents.length} objects selected</b>`);
    const e = ents[0];
    h(`<span>Type</span><b>${e.type}</b>`); h(`<span>ID</span><b>${e.id}</b>`);
    for (const [label, get, set] of FIELDS[e.type]) {
      const row = h(`<span>${label}</span>`), inp = document.createElement('input'); inp.value = fmt(get(e));
      inp.addEventListener('change', () => {
        const v = Number(inp.value), c = structuredClone(e);
        if (inp.value.trim() === '' || !Number.isFinite(v)) { say('Enter a number.'); return render(); }
        set(c, v); const err = validate(c);
        if (err) { say(err); return render(); }
        tx(() => Object.assign(e, c)); onChange(); render();
      });
      row.appendChild(inp);
    }
    if (e.type === 'text') { const r = h('<span>Text</span>'), ti = document.createElement('input'); ti.value = e.str.replace(/\n/g, '\\n');
      ti.addEventListener('change', () => { const c = structuredClone(e); c.str = ti.value.replace(/\\n/g, '\n'); const err = validate(c); if (err) { say(err); return render(); } tx(() => Object.assign(e, c)); onChange(); render(); }); r.appendChild(ti); }
    if (e.type === 'insert') h(`<span>Block</span><b>${e.block}</b>`);
    if (e.type === 'polyline') { h(`<span>Vertices</span><b>${e.pts.length}</b>`); h(`<span>Closed</span><b>${e.closed ? 'yes' : 'no'}</b>`); }
    if (e.type === 'dim') { const g = resolveDim(drawing, e); h(`<span>Kind</span><b>${e.dtype}${e.ref ? ' (follows its object)' : ' (fixed points)'}</b>`); h(`<span>Value</span><b>${g ? g.text.str : 'reference lost'}</b>`); }
    else if (!['text', 'insert', 'point', 'xline', 'ray'].includes(e.type)) h(`<span>${e.type === 'circle' ? 'Circumference' : 'Total length'}</span><b>${fmt(length(e))}</b>`);
    const lr = h('<span>Layer</span>'), sl = document.createElement('select');
    drawing.layers.forEach(l => sl.add(new Option(l.name, l.name, false, l.name === e.layer)));
    sl.addEventListener('change', () => { tx(() => { e.layer = sl.value; }); onChange(); render(); }); lr.appendChild(sl);
    const lr2 = h('<span>Linetype</span>'), s2 = document.createElement('select');
    ['BYLAYER', ...LTYPE_NAMES].forEach(n => s2.add(new Option(n, n, false, n === (e.lineType || 'BYLAYER'))));
    s2.addEventListener('change', () => { tx(() => { if (s2.value === 'BYLAYER') delete e.lineType; else e.lineType = s2.value; }); onChange(); render(); }); lr2.appendChild(s2);
    h(`<span>Color</span><b>${e.color === 'BYLAYER' ? 'by layer' : e.color}</b>`);
  }
  return { render };
}
