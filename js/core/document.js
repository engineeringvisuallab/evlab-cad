import { validate, bounds } from './entity.js';
const PAL = ['#ff5f5f', '#5cb85c', '#6fd3ff', '#f0b441', '#c792ea', '#ff9f43'];
const base = n => ({ name: n, color: '#e8eef2', lineType: 'Continuous', lineWeight: 0.25, visible: true, locked: false, frozen: false, plot: true });
export class Drawing {
  constructor() { this.entities = []; this.units = 'mm'; this.nextId = 1; this.layers = [base('0')]; this.current = '0'; }
  layer(n) { return this.layers.find(l => l.name === n); }
  isVisible(e) { const l = this.layer(e.layer); return !!l && l.visible && !l.frozen; }
  isSelectable(e) { return this.isVisible(e) && !this.layer(e.layer).locked; }
  colorOf(e) { return e.color === 'BYLAYER' ? this.layer(e.layer)?.color ?? '#e8eef2' : e.color; }
  checkName(n, except) { n = (n ?? '').trim(); if (!n) throw new Error('Layer name cannot be empty.');
    if (this.layers.some(l => l.name.toLowerCase() === n.toLowerCase() && l.name !== except)) throw new Error(`Layer "${n}" already exists.`); return n; }
  addLayer(name) { const l = { ...base(this.checkName(name)), color: PAL[this.layers.length % PAL.length] }; this.layers.push(l); return l; }
  removeLayer(name) {
    if (name === '0') throw new Error('Layer 0 cannot be deleted.');
    if (name === this.current) throw new Error('Cannot delete the current layer.');
    if (this.entities.some(e => e.layer === name)) throw new Error(`Layer "${name}" has objects on it. Move or erase them first.`);
    this.layers = this.layers.filter(l => l.name !== name);
  }
  renameLayer(old, nw) {
    if (old === '0') throw new Error('Layer 0 cannot be renamed.'); nw = this.checkName(nw, old);
    this.layer(old).name = nw; this.entities.forEach(e => { if (e.layer === old) e.layer = nw; }); if (this.current === old) this.current = nw;
  }
  isolate(name) { this.layers.forEach(l => { l.visible = l.name === name; }); }
  assign(ids, layer) { if (!this.layer(layer)) throw new Error('No such layer.'); ids.forEach(id => { const e = this.get(id); if (e) e.layer = layer; }); }
  get(id) { return this.entities.find(e => e.id === id); }
  add(e) { // validates first, so a bad entity never enters the drawing
    const err = validate(e); if (err) throw new Error(err);
    const ent = { id: 'E' + this.nextId++, layer: this.current, color: 'BYLAYER', ...e };
    this.entities.push(ent); return ent;
  }
  remove(ids) { const s = new Set(ids); const n = this.entities.length; this.entities = this.entities.filter(e => !s.has(e.id)); return n - this.entities.length; }
  extents() {
    if (!this.entities.length) return null;
    return this.entities.map(bounds).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
  }
}
