import { validate, bounds } from './entity.js';
export class Drawing {
  constructor() { this.entities = []; this.units = 'mm'; this.nextId = 1; }
  get(id) { return this.entities.find(e => e.id === id); }
  add(e) { // validates first, so a bad entity never enters the drawing
    const err = validate(e); if (err) throw new Error(err);
    const ent = { id: 'E' + this.nextId++, layer: '0', color: '#e8eef2', ...e };
    this.entities.push(ent); return ent;
  }
  remove(ids) { const s = new Set(ids); const n = this.entities.length; this.entities = this.entities.filter(e => !s.has(e.id)); return n - this.entities.length; }
  extents() {
    if (!this.entities.length) return null;
    return this.entities.map(bounds).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
  }
}
