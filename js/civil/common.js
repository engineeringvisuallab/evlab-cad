import { unitMM } from '../layouts/paper-space.js';
export const unitsPerMetre = d => d.units === 'm' ? 1 : 1000;
export const paperToModel = (d, mm) => mm * d.layout.scale / unitMM(d);   // size on paper (mm) -> drawing units at the layout scale
export function ensureLayer(d, name, color) {
  let l = d.layers.find(x => x.name.toLowerCase() === name.toLowerCase()); if (!l) { l = d.addLayer(name); if (color) l.color = color; } return l.name;
}
