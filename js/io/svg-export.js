import { norm } from '../core/entity.js';
import { textRuns } from '../layouts/text-runs.js';
const n = v => String(+v.toFixed(3)), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function exportSvg(sheet) {
  const { W, H } = sheet, y = v => n(H - v), c = sheet.clip, out = [];
  for (const it of sheet.items) {
    const at = `stroke-width="${n(it.lw || 0.25)}"${it.clip ? ' clip-path="url(#vp)"' : ''}`; let el = '';
    if (it.t === 'line') el = `<line x1="${n(it.x1)}" y1="${y(it.y1)}" x2="${n(it.x2)}" y2="${y(it.y2)}" ${at}/>`;
    else if (it.t === 'poly') el = `<${it.closed ? 'polygon' : 'polyline'} points="${it.pts.map(p => n(p[0]) + ',' + y(p[1])).join(' ')}" ${it.fill ? 'fill="#000" ' : ''}${at}/>`;
    else if (it.t === 'circle') el = `<circle cx="${n(it.cx)}" cy="${y(it.cy)}" r="${n(it.r)}" ${at}/>`;
    else if (it.t === 'arc') { const sw = norm(it.a1 - it.a0) || 2 * Math.PI; el = `<path d="M${n(it.cx + it.r * Math.cos(it.a0))} ${y(it.cy + it.r * Math.sin(it.a0))} A${n(it.r)} ${n(it.r)} 0 ${sw > Math.PI ? 1 : 0} 0 ${n(it.cx + it.r * Math.cos(it.a1))} ${y(it.cy + it.r * Math.sin(it.a1))}" ${at}/>`; }
    else if (it.t === 'text') el = textRuns(it).map(r => `<text x="${n(r.x)}" y="${y(r.y)}" font-size="${n(it.h)}" transform="rotate(${n(-it.rot * 180 / Math.PI)} ${n(r.x)} ${y(r.y)})" fill="#000" stroke="none">${esc(r.str)}</text>`).join('');
    out.push(el);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<defs><clipPath id="vp"><rect x="${n(c.x)}" y="${y(c.y + c.h)}" width="${n(c.w)}" height="${n(c.h)}"/></clipPath></defs>\n<rect width="${W}" height="${H}" fill="#fff"/>\n<g fill="none" stroke="#000" stroke-linecap="round" font-family="Helvetica, Arial, sans-serif">\n${out.join('\n')}\n</g>\n</svg>\n`;
}
