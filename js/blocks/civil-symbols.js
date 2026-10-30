// Symbols are ordinary drawing geometry (editable after EXPLODE), defined in drawing units around (0,0). Scale on insertion.
const c = (cx, cy, r) => ({ type: 'circle', cx, cy, r, color: 'BYLAYER' }), l = (x1, y1, x2, y2) => ({ type: 'line', x1, y1, x2, y2, color: 'BYLAYER' });
const p = (pts, closed) => ({ type: 'polyline', pts, closed, color: 'BYLAYER' });
export const SYMBOLS = {
  NORTH_ARROW: [c(0, 0, 5), p([[0, 5], [-2.5, -3], [0, -1], [2.5, -3]], true), { type: 'text', x: 0, y: 6.5, h: 3, rot: 0, str: 'N', center: true, color: 'BYLAYER' }],
  MANHOLE: [c(0, 0, 1), c(0, 0, 0.7), l(-0.7, 0, 0.7, 0), l(0, -0.7, 0, 0.7)],
  VALVE: [p([[-1, -0.6], [1, 0.6], [1, -0.6], [-1, 0.6]], true), l(0, 0, 0, 1.2)],
  TREE: [c(0, 0, 2), l(-0.5, 0, 0.5, 0), l(0, -0.5, 0, 0.5)],
  SURVEY_POINT: [c(0, 0, 0.5), l(-1, 0, 1, 0), l(0, -1, 0, 1)],
};
export function addCivilSymbols(d) {
  let n = 0; for (const [k, es] of Object.entries(SYMBOLS)) if (!d.blocks[k]) { d.blocks[k] = { base: [0, 0], entities: structuredClone(es) }; n++; }
  return n;
}
