import { parseSurveyCsv, plotSurvey } from '../civil/survey.js';
import { addChainage } from '../civil/chainage.js';
import { parseProfileCsv, drawProfile } from '../civil/profile.js';
import { quantities, quantitiesText, quantitiesCsv, coordinatesCsv } from '../civil/quantities.js';
export function createCivilPanel(root, drawing, h) {
  const el = (tag, props = {}, kids = []) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };
  const num = (input, fallback) => input.value.trim() === '' ? fallback : Number(input.value);
  const field = (label, ph = '', value = '') => { const i = el('input', { value, placeholder: ph }); return [i, el('label', { className: 'prow' }, [el('span', { textContent: label }), i])]; };
  const run = fn => { if (h.tx(fn)) h.changed(); };
  const area = (ph, rows = 4) => el('textarea', { rows, placeholder: ph, spellcheck: false, className: 'civ-ta' });
  const sec = (title, kids) => el('details', {}, [el('summary', { textContent: title }), ...kids]);
  const note = t => el('div', { className: 'prow', innerHTML: `<i>${t}</i>` });
  // survey
  const sTa = area('ID, X, Y, Z, description\n1, 1000.0, 2000.0, 45.123, MH'), order = el('select', {}, [new Option('ID, E(X), N(Y)', 'EN'), new Option('ID, N(Y), E(X)', 'NE')]);
  const [sH, sHr] = field('Text height', 'auto'), [sS, sSr] = field('Marker size', 'auto'), elev = el('input', { type: 'checkbox', checked: true }), desc = el('input', { type: 'checkbox', checked: true });
  const survey = sec('Survey points', [sTa, el('div', { className: 'prow' }, [el('span', { textContent: 'Column order' }), order]), sHr, sSr,
    el('div', { className: 'prow' }, [el('span', { textContent: 'Elevations' }), elev]), el('div', { className: 'prow' }, [el('span', { textContent: 'Descriptions' }), desc]),
    el('div', { className: 'lbar' }, [el('button', { textContent: 'Plot points', onclick: () => { try { const rows = parseSurveyCsv(sTa.value, order.value); run(() => plotSurvey(drawing, rows, { h: num(sH, 0), size: num(sS, 0), elev: elev.checked, desc: desc.checked })); h.say(`Plotted ${rows.length} survey point(s).`); } catch (e) { h.say(e.message); } } }),
      el('button', { textContent: 'Load CSV…', onclick: async () => { try { const r = await h.openCsv(); if (r) sTa.value = r.text; } catch (e) { h.say(e.message); } } })]),
    note('Auto sizes follow the layout scale (2.5 mm text, 1.5 mm marker on paper).')]);
  // chainage
  const [cs, csr] = field('Start chainage (m)', '0', '0'), [ci, cir] = field('Interval (m)', '20', '20');
  const chain = sec('Chainage along centreline', [note('Select one line or polyline, then add ticks and labels.'), csr, cir,
    el('div', { className: 'lbar' }, [el('button', { textContent: 'Add chainage marks', onclick: () => { const e = h.getSel().length === 1 ? drawing.get(h.getSel()[0]) : null; let res;
      if (!e) return h.say('Select exactly one line or polyline first.'); run(() => { res = addChainage(drawing, e, { start: num(cs, 0), interval: num(ci, 20) }); }); if (res) h.say(`Added ${res.marks} marks along ${res.lengthM.toFixed(3)} m.`); } })])]);
  // profile
  const pTa = area('chainage, level (m)\n0, 45.20\n20, 45.85\n40, 46.10'), [pd, pdr] = field('Datum level (m)', 'auto'), [pv, pvr] = field('Vertical exaggeration', '10', '10'), [px, pxr] = field('Origin X', '0', '0'), [py, pyr] = field('Origin Y', '0', '0');
  const prof = sec('Longitudinal profile', [pTa, pdr, pvr, pxr, pyr, el('div', { className: 'lbar' }, [el('button', { textContent: 'Draw profile', onclick: () => { try { const rows = parseProfileCsv(pTa.value);
    run(() => drawProfile(drawing, rows, { datum: pd.value.trim() === '' ? NaN : Number(pd.value), ve: num(pv, 10), x: num(px, 0), y: num(py, 0) })); h.say(`Profile drawn from ${rows.length} points.`); } catch (e) { h.say(e.message); } } })])]);
  // quantities
  const qty = sec('Quantities and export', [el('div', { className: 'lbar' }, [
    el('button', { textContent: 'Report', onclick: () => quantitiesText(quantities(drawing)).forEach(h.log) }),
    el('button', { textContent: 'Quantities CSV', onclick: () => h.saveCsv(quantitiesCsv(quantities(drawing)), 'quantities.csv') }),
    el('button', { textContent: 'Coordinates CSV', onclick: () => h.saveCsv(coordinatesCsv(drawing), 'coordinates.csv') })])]);
  root.append(note('<b>Drafting tools only.</b> No design calculations are performed or validated; verify everything independently.'), survey, chain, prof, qty);
  return {};
}
