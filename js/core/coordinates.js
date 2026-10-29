// "100,200" absolute | "@50,0" relative | "@100<45" relative polar | "100<45" absolute polar. Angles in degrees.
const N = '([-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?)';
const RE = new RegExp(`^${N}\\s*([,<])\\s*${N}$`, 'i');
export function parsePoint(str, base) {
  let s = str.trim(); const rel = s.startsWith('@'); if (rel) s = s.slice(1);
  const m = RE.exec(s); if (!m) return null;
  if (rel && !base) return { error: 'No previous point yet: relative coordinates (@) need one.' };
  const a = +m[1], b = +m[3], o = rel ? base : { x: 0, y: 0 };
  return m[2] === ',' ? { x: o.x + a, y: o.y + b } : { x: o.x + a * Math.cos(b * Math.PI / 180), y: o.y + a * Math.sin(b * Math.PI / 180) };
}
export function parseNumber(str) { const s = str.trim(); return s !== '' && Number.isFinite(+s) ? +s : null; }
export function orthoPoint(p, from) { return Math.abs(p.x - from.x) >= Math.abs(p.y - from.y) ? { x: p.x, y: from.y } : { x: from.x, y: p.y }; }
