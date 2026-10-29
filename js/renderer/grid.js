export function gridSteps(scale, minPx = 12) {
  const step = Math.pow(10, Math.ceil(Math.log10(minPx / scale)));
  return { minor: step, major: step * 10 };
}
export function drawGrid(ctx, vp) {
  const { minor, major } = gridSteps(vp.scale);
  const tl = vp.toWorld(0, 0), br = vp.toWorld(vp.w, vp.h);
  const line = (x1, y1, x2, y2) => { const a = vp.toScreen(x1, y1), b = vp.toScreen(x2, y2);
    ctx.moveTo(Math.round(a.x) + .5, Math.round(a.y) + .5); ctx.lineTo(Math.round(b.x) + .5, Math.round(b.y) + .5); };
  for (const [step, color] of [[minor, '#17303d'], [major, '#27495b']]) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1;
    for (let x = Math.ceil(tl.x / step); x * step <= br.x; x++) line(x * step, tl.y, x * step, br.y);
    for (let y = Math.ceil(br.y / step); y * step <= tl.y; y++) line(tl.x, y * step, br.x, y * step);
    ctx.stroke();
  }
}
export function drawAxes(ctx, vp) {
  const o = vp.toScreen(0, 0);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#d9534f'; ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(vp.w, o.y); ctx.stroke();
  ctx.strokeStyle = '#5cb85c'; ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, vp.h); ctx.stroke();
}
