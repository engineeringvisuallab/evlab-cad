import { SIZES, SCALES, fitLayout } from '../layouts/paper-space.js';
export function createLayoutPanel(root, drawing, set, exportSheet) {
  const el = (tag, props = {}, kids = []) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };
  const row = (label, input) => el('div', { className: 'prow' }, [el('span', { textContent: label }), input]);
  const text = (k, label) => row(label, el('input', { value: drawing.layout[k], onchange: ev => set(l => { l[k] = ev.target.value; }) }));
  const sel = (k, label, opts, conv = v => v) => row(label, el('select', { onchange: ev => set(l => { l[k] = conv(ev.target.value); }) }, opts.map(o => new Option(String(o), o, false, String(o) === String(drawing.layout[k])))));
  function render() {
    const l = drawing.layout; root.innerHTML = '';
    const scales = SCALES.includes(l.scale) ? SCALES : [...SCALES, l.scale].sort((a, b) => a - b);
    root.append(sel('size', 'Sheet', Object.keys(SIZES)), sel('orientation', 'Orientation', ['landscape', 'portrait']), text('title', 'Title'), text('number', 'Drawing no.'), text('project', 'Project'), text('revision', 'Revision'),
      el('div', { className: 'prow' }, [el('span', { textContent: 'Scale 1:' }), el('select', { onchange: ev => set(x => { x.scale = +ev.target.value; }) }, scales.map(s => new Option(s, s, false, s === l.scale)))]),
      row('View centre X', el('input', { value: +l.center[0].toFixed(4), onchange: ev => set(x => { const v = Number(ev.target.value); if (!Number.isFinite(v)) throw new Error('Enter a number.'); x.center = [v, x.center[1]]; }) })),
      row('View centre Y', el('input', { value: +l.center[1].toFixed(4), onchange: ev => set(x => { const v = Number(ev.target.value); if (!Number.isFinite(v)) throw new Error('Enter a number.'); x.center = [x.center[0], v]; }) })),
      row('North arrow', el('input', { type: 'checkbox', checked: l.northArrow, onchange: ev => set(x => { x.northArrow = ev.target.checked; }) })),
      el('div', { className: 'lbar' }, [el('button', { textContent: 'Fit model to viewport', onclick: () => set(x => Object.assign(x, fitLayout(drawing))) }),
        el('button', { textContent: 'Export PDF', onclick: () => exportSheet('pdf') }), el('button', { textContent: 'Export SVG', onclick: () => exportSheet('svg') })]),
      el('div', { className: 'prow', innerHTML: '<i>Plots layers that are visible, thawed and have plot on. Printed in black; line weights come from layers.</i>' }));
  }
  return { render };
}
