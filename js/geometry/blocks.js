export function createBlock(d, name, ids, base) {
  name = (name || '').trim(); if (!/^[\w-]+$/.test(name)) throw new Error('Block names may use letters, digits, _ and - only.');
  if (Object.keys(d.blocks).some(k => k.toLowerCase() === name.toLowerCase())) throw new Error(`A block named "${name}" already exists.`);
  const es = ids.map(i => d.get(i)).filter(Boolean); if (!es.length) throw new Error('Nothing selected.');
  if (es.some(e => e.type === 'dim' || e.type === 'insert')) throw new Error('Dimensions and block references cannot be put inside a block.');
  if (d.entities.some(x => x.type === 'dim' && ids.includes(x.ref))) throw new Error('Remove the dimensions attached to these objects first.');
  d.blocks[name] = { base: [base.x, base.y], entities: es.map(e => { const { id, layer, ...rest } = structuredClone(e); return rest; }) };
  const layer = es[0].layer; d.remove(ids); d.add({ type: 'insert', block: name, x: base.x, y: base.y, s: 1, rot: 0, layer });
}
export function deleteBlock(d, name) {
  if (!d.blocks[name]) throw new Error(`No block named "${name}".`);
  if (d.entities.some(e => e.type === 'insert' && e.block === name)) throw new Error(`Block "${name}" is still used in the drawing.`);
  delete d.blocks[name];
}
