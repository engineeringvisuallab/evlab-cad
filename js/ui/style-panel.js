export function createStylePanel(root, drawing, tx, changed, say) {
  const el = (tag, props = {}, kids = []) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };
  const row = (label, input) => el('div', { className: 'prow' }, [el('span', { textContent: label }), input]);
  function render() {
    const s = drawing.dimStyle; root.innerHTML = '';
    const set = (k, v) => { tx(() => { drawing.dimStyle = { ...drawing.dimStyle, [k]: v }; }); changed(); };
    const num = (k, label, disabled) => row(label, el('input', { value: s[k], disabled, onchange: ev => { const v = Number(ev.target.value); if (!(v > 0) || !Number.isFinite(v)) { say('Enter a number greater than 0.'); return render(); } set(k, v); } }));
    root.append(row('Decimals', el('select', { onchange: ev => set('precision', +ev.target.value) }, [0, 1, 2, 3, 4, 5, 6].map(n => new Option(n, n, false, n === s.precision)))),
      num('scale', 'Measurement scale'), row('Size from layout', el('input', { type: 'checkbox', checked: !!s.auto, title: '2.5 mm text and arrows on paper at the layout scale', onchange: ev => set('auto', ev.target.checked) })),
      num('text', 'Text height', !!s.auto), num('arrow', 'Arrow size', !!s.auto));
  }
  return { render };
}
