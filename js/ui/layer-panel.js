export function createLayerPanel(root, drawing, getSel, changed, say) {
  const run = fn => { try { fn(); } catch (e) { say(e.message); } changed(); };
  const el = (tag, props = {}, kids = []) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };
  function render() {
    root.innerHTML = '';
    const bar = el('div', { className: 'lbar' }, [
      el('button', { textContent: 'New', onclick: () => { const n = prompt('New layer name'); if (n !== null) run(() => drawing.addLayer(n)); } }),
      el('button', { textContent: 'Delete', onclick: () => run(() => drawing.removeLayer(drawing.current)), title: 'Deletes the current layer if empty' }),
      el('button', { textContent: 'Assign', title: 'Move selected objects to the current layer', onclick: () => run(() => { if (!getSel().length) throw new Error('Nothing selected.'); drawing.assign(getSel(), drawing.current); }) }),
      el('button', { textContent: 'Isolate', title: 'Show only the current layer', onclick: () => run(() => drawing.isolate(drawing.current)) }),
      el('button', { textContent: 'All', title: 'Show all layers', onclick: () => run(() => drawing.layers.forEach(l => { l.visible = true; l.frozen = false; })) })]);
    root.append(bar);
    for (const l of drawing.layers) {
      const tog = (k, txt, tip) => el('button', { textContent: txt, title: tip, className: (k === 'visible' ? l[k] : !l[k]) ? 'dim0' : 'dim1', onclick: () => run(() => { l[k] = !l[k]; }) });
      const name = el('input', { value: l.name, disabled: l.name === '0', onchange: () => run(() => drawing.renameLayer(l.name, name.value)) });
      root.append(el('div', { className: 'lrow' + (l.name === drawing.current ? ' cur' : '') }, [
        el('button', { textContent: l.name === drawing.current ? '●' : '○', title: 'Set current', onclick: () => run(() => { drawing.current = l.name; }) }),
        el('input', { type: 'color', value: l.color, onchange: e => run(() => { l.color = e.target.value; }) }), name,
        tog('visible', 'V', 'Visible'), tog('locked', 'L', 'Locked'), tog('frozen', 'F', 'Frozen')]));
    }
  }
  return { render };
}
