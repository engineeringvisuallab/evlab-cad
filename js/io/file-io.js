const KINDS = { csv: { description: 'CSV file', accept: { 'text/csv': ['.csv', '.txt'] }, ext: '.csv,.txt' }, pdf: { description: 'PDF document', accept: { 'application/pdf': ['.pdf'] }, ext: '.pdf' }, svg: { description: 'SVG image', accept: { 'image/svg+xml': ['.svg'] }, ext: '.svg' }, project: { description: 'EVLab CAD project', accept: { 'application/json': ['.evlab', '.json'] }, ext: '.evlab,.json' }, dxf: { description: 'DXF drawing', accept: { 'application/dxf': ['.dxf'] }, ext: '.dxf' } };
export async function saveText(text, name, handle, forceNew, kind = 'project') {
  const k = KINDS[kind];
  if (window.showSaveFilePicker) {
    try { if (!handle || forceNew) handle = await window.showSaveFilePicker({ suggestedName: name, types: [k] });
      const w = await handle.createWritable(); await w.write(text); await w.close(); return { handle, name: handle.name };
    } catch (e) { if (e.name === 'AbortError') return null; throw e; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); return { handle: null, name };
}
export async function openText(kind = 'project') {
  const k = KINDS[kind];
  if (window.showOpenFilePicker) {
    try { const [h] = await window.showOpenFilePicker({ types: [k] }); const f = await h.getFile(); return { text: await f.text(), handle: h, name: f.name };
    } catch (e) { if (e.name === 'AbortError') return null; throw e; }
  }
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = k.ext;
    i.onchange = async () => { const f = i.files[0]; res(f ? { text: await f.text(), handle: null, name: f.name } : null); }; i.oncancel = () => res(null); i.click(); });
}
