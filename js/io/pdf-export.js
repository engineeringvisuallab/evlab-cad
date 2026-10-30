import { norm } from '../core/entity.js';
import { textRuns } from '../layouts/text-runs.js';
const PT = 72 / 25.4, f = v => String(+v.toFixed(3)), esc = s => s.replace(/⌀/g, 'Ø').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\xFF]/g, '?');
function arcOps(cx, cy, r, a0, sweep) {
  const n = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9)), da = sweep / n, k = 4 / 3 * Math.tan(da / 4), P = v => `${f(v[0] * PT)} ${f(v[1] * PT)}`, ops = [];
  for (let i = 0; i < n; i++) { const a = a0 + i * da, b = a + da, p0 = [cx + r * Math.cos(a), cy + r * Math.sin(a)], p3 = [cx + r * Math.cos(b), cy + r * Math.sin(b)];
    if (!i) ops.push(`${P(p0)} m`); ops.push(`${P([p0[0] - k * r * Math.sin(a), p0[1] + k * r * Math.cos(a)])} ${P([p3[0] + k * r * Math.sin(b), p3[1] - k * r * Math.cos(b)])} ${P(p3)} c`); }
  return ops;
}
// Vector PDF 1.4, one page, built-in Helvetica. Coordinates come from the same sheet description as the preview.
export function exportPdf(sheet) {
  const ops = ['0 G 0 g 1 J 1 j'];
  for (const it of sheet.items) {
    ops.push('q'); if (it.clip) { const c = sheet.clip; ops.push(`${f(c.x * PT)} ${f(c.y * PT)} ${f(c.w * PT)} ${f(c.h * PT)} re W n`); }
    ops.push(`${f((it.lw || 0.25) * PT)} w`);
    if (it.t === 'line') ops.push(`${f(it.x1 * PT)} ${f(it.y1 * PT)} m ${f(it.x2 * PT)} ${f(it.y2 * PT)} l S`);
    else if (it.t === 'poly') ops.push(it.pts.map((p, i) => `${f(p[0] * PT)} ${f(p[1] * PT)} ${i ? 'l' : 'm'}`).join(' ') + (it.closed ? ' h' : '') + (it.fill ? ' B' : ' S'));
    else if (it.t === 'circle') ops.push(...arcOps(it.cx, it.cy, it.r, 0, 2 * Math.PI), 'h S');
    else if (it.t === 'arc') ops.push(...arcOps(it.cx, it.cy, it.r, it.a0, norm(it.a1 - it.a0) || 2 * Math.PI), 'S');
    else if (it.t === 'text') for (const r of textRuns(it)) { const c = Math.cos(it.rot), s = Math.sin(it.rot);
      ops.push(`BT /F1 ${f(it.h * PT)} Tf ${f(c)} ${f(s)} ${f(-s)} ${f(c)} ${f(r.x * PT)} ${f(r.y * PT)} Tm (${esc(r.str)}) Tj ET`); }
    ops.push('Q');
  }
  const content = ops.join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(sheet.W * PT)} ${f(sheet.H * PT)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const off = [];
  objs.forEach((o, i) => { off.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Uint8Array.from(pdf, c => c.charCodeAt(0) & 255);
}
