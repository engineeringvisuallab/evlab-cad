// Autosave records live under one key per project id, so autosaving one project never touches another.
const P = 'evlab:autosave:';
export const autosave = (rec, st = globalThis.localStorage) => st.setItem(P + rec.id, JSON.stringify(rec)); // may throw (quota): caller must report it
export const discard = (id, st = globalThis.localStorage) => st.removeItem(P + id);
export function listRecoverable(st = globalThis.localStorage) {
  const out = [];
  for (let i = 0; i < st.length; i++) { const k = st.key(i); if (!k.startsWith(P)) continue; try { const r = JSON.parse(st.getItem(k)); if (r && r.id && typeof r.data === 'string') out.push(r); } catch { /* damaged record: left in place */ } }
  return out.sort((a, b) => b.modified - a.modified);
}
