// Dash patterns in millimetres on PAPER (scaled by the layout scale on screen, so they plot at the same size at any scale). Even entries = dash, odd = gap.
export const LTYPES = { CONTINUOUS: null, DASHED: [6, 3], HIDDEN: [3, 1.5], CENTER: [12, 2, 2, 2], PHANTOM: [12, 2, 2, 2, 2, 2], DOT: [0.5, 2.5], DASHDOT: [8, 2, 0.5, 2] };
export const LTYPE_NAMES = Object.keys(LTYPES);
export const canon = n => { const u = String(n || '').toUpperCase().replace(/X?\d+$/, ''); return LTYPES[u] !== undefined ? u : null; };   // 'Dashed2' -> 'DASHED'; unknown -> null
export const dashMm = n => LTYPES[canon(n)] ?? null;
export function dashPx(d, e, vpScale) {
  const m = dashMm(d.lineTypeOf(e)); if (!m) return [];
  const k = d.layout.scale / (d.units === 'm' ? 1000 : 1) * vpScale, a = m.map(v => v * k);
  return a.reduce((s, v) => s + v, 0) < 4 ? [] : a;   // too small to see: draw solid
}
