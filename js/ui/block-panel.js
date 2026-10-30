import { addCivilSymbols } from '../blocks/civil-symbols.js';
import { deleteBlock } from '../geometry/blocks.js';
export function createBlockPanel(root, drawing, tx, changed, startInsert) {
  const el = (tag, props = {}, kids = []) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };
  function render() {
    root.innerHTML = ''; root.append(el('div', { className: 'lbar' }, [el('button', { textContent: 'Add civil symbols', title: 'North arrow, manhole, valve, tree, survey point', onclick: () => { tx(() => addCivilSymbols(drawing)); changed(); } })]));
    const names = Object.keys(drawing.blocks); if (!names.length) root.append(el('div', { className: 'prow', innerHTML: '<i>No blocks. Select objects, then BLOCK name.</i>' }));
    for (const n of names) root.append(el('div', { className: 'lrow' }, [el('span', { textContent: n, style: 'flex:1;overflow:hidden;text-overflow:ellipsis' }),
      el('button', { textContent: 'Insert', onclick: () => startInsert(n) }), el('button', { textContent: '×', title: 'Delete block (only if unused)', onclick: () => { tx(() => deleteBlock(drawing, n)); changed(); } })]));
  }
  return { render };
}
