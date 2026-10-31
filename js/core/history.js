// Snapshot-based undo/redo. Every command runs inside tx() (app.js): on any error the drawing is restored, so a failed command cannot leave it half-changed.
export const stacks = { undo: [], redo: [] };
export const snapshot = d => JSON.stringify({ entities: d.entities, nextId: d.nextId, layers: d.layers, blocks: d.blocks, layout: d.layout, dimStyle: d.dimStyle, current: d.current, units: d.units });
export function restore(d, s) { Object.assign(d, JSON.parse(s)); }
export function commit(before, d) { const after = snapshot(d); if (after === before) return false; stacks.undo.push(before); stacks.redo.length = 0; if (stacks.undo.length > 200) stacks.undo.shift(); return true; }
export function undo(d) { if (!stacks.undo.length) return false; stacks.redo.push(snapshot(d)); restore(d, stacks.undo.pop()); return true; }
export function redo(d) { if (!stacks.redo.length) return false; stacks.undo.push(snapshot(d)); restore(d, stacks.redo.pop()); return true; }
