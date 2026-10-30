const BASIC = { 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#e8eef2', 8: '#808080', 9: '#c0c0c0' };
const GRAY = { 250: '#333333', 251: '#505050', 252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff' };
export const intToHex = n => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
export const hexToInt = h => parseInt(h.slice(1), 16);
function hsv(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
// AutoCAD Color Index -> hex. 10-249 follow the standard 24-hue x 10-shade pattern (approximation of the official table).
export function aciToHex(n) {
  n = Math.abs(n); if (BASIC[n]) return BASIC[n]; if (GRAY[n]) return GRAY[n];
  if (n >= 10 && n <= 249) { const i = n - 10, k = i % 10; return hsv(Math.floor(i / 10) * 15, k % 2 ? 0.5 : 1, [1, 0.65, 0.5, 0.3, 0.15][k >> 1]); }
  return null;
}
export function hexToAci(hex) {
  if (hex === BASIC[7]) return 7; const c = hexToInt(hex), r = c >> 16, g = (c >> 8) & 255, b = c & 255; let best = 7, bd = Infinity;
  for (let n = 1; n <= 7; n++) { const q = hexToInt(n === 7 ? '#ffffff' : BASIC[n]), d = (r - (q >> 16)) ** 2 + (g - ((q >> 8) & 255)) ** 2 + (b - (q & 255)) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
export const DEFAULT_HEX = BASIC[7];
