import { validate } from '../core/entity.js';
import { defaultLayout, validateLayout } from '../layouts/paper-space.js';
export const FORMAT = 'evlab-cad', VERSION = 2;
const LAYER_DEFAULTS = { color: '#e8eef2', lineType: 'CONTINUOUS', lineWeight: 0.25, visible: true, locked: false, frozen: false, plot: true };
export const serialize = (d, meta = {}) => JSON.stringify({ format: FORMAT, version: VERSION, meta, units: d.units, dimStyle: d.dimStyle, blocks: d.blocks, layout: d.layout, current: d.current, nextId: d.nextId, layers: d.layers, entities: d.entities }, null, 1);
// Validates everything before anything is applied, so a bad file can never replace the open drawing.
export function parse(text) {
  const fail = m => { throw new Error(m + ' Nothing was changed.'); };
  let o; try { o = JSON.parse(text); } catch { fail('This is not an EVLab CAD file: it is not valid JSON.'); }
  if (!o || typeof o !== 'object' || o.format !== FORMAT) fail('This is not an EVLab CAD project file (missing format marker).');
  if (!Number.isInteger(o.version) || o.version < 1) fail('The file has an invalid version number.');
  if (o.version > VERSION) fail(`This file was saved by a newer EVLab CAD (format v${o.version}); this app reads up to v${VERSION}.`);
  if (!Array.isArray(o.layers) || !Array.isArray(o.entities)) fail('The file is missing its layers or entities.');
  const names = new Set();
  o.layers = o.layers.map(l => { if (!l || typeof l.name !== 'string' || !l.name.trim()) fail('A layer has no name.');
    if (names.has(l.name)) fail(`Layer "${l.name}" appears twice.`); names.add(l.name); return { ...LAYER_DEFAULTS, ...l }; });
  if (!names.has('0')) fail('Layer "0" is missing.');
  if (!names.has(o.current)) o.current = '0';
  o.blocks = o.blocks && typeof o.blocks === 'object' && !Array.isArray(o.blocks) ? o.blocks : {};
  for (const [bn, b] of Object.entries(o.blocks)) {
    if (!b || !Array.isArray(b.base) || b.base.length !== 2 || !b.base.every(Number.isFinite) || !Array.isArray(b.entities)) fail(`Block "${bn}" is damaged.`);
    for (const be of b.entities) if (validate(be) || be.type === 'insert' || be.type === 'dim') fail(`Block "${bn}" contains an invalid object.`);
  }
  o.layout = { ...defaultLayout(), ...(o.layout && typeof o.layout === 'object' ? o.layout : {}) }; const lerr = validateLayout(o.layout); if (lerr) fail(`Layout is invalid: ${lerr}.`);
  const ids = new Set(); let max = 0;
  for (const e of o.entities) {
    if (!e || typeof e.id !== 'string') fail('An object has no ID.'); if (ids.has(e.id)) fail(`Object ID ${e.id} appears twice.`); ids.add(e.id);
    const err = validate(e); if (err) fail(`Object ${e.id}: ${err}.`);
    if (e.type === 'insert' && !o.blocks[e.block]) fail(`Object ${e.id} uses missing block "${e.block}".`);
    if (!names.has(e.layer)) fail(`Object ${e.id} is on missing layer "${e.layer}".`);
    max = Math.max(max, parseInt(e.id.replace(/\D/g, ''), 10) || 0);
  }
  if (!Number.isInteger(o.nextId) || o.nextId <= max) o.nextId = max + 1; // repair so new IDs never collide
  o.units = o.units === 'm' ? 'm' : 'mm'; o.meta = o.meta && typeof o.meta === 'object' ? o.meta : {};
  return o;
}
export function applyProject(d, o) {
  d.entities = o.entities; d.layers = o.layers; d.blocks = o.blocks || {}; d.layout = o.layout || defaultLayout(); d.current = o.current; d.nextId = o.nextId; d.units = o.units;
  d.dimStyle = { ...d.dimStyle, ...(o.dimStyle || {}) };
}
