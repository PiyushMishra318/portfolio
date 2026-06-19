/**
 * Renders parser draw-command JSON on an HTML canvas element.
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r || 0, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderDrawCommands(canvas, scene) {
  if (!canvas || !scene) return { drawn: 0, types: [] };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { drawn: 0, types: [] };
  const width = scene.width || 640;
  const height = scene.height || 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const types = new Set();
  let drawn = 0;
  for (const cmd of scene.commands || []) {
    types.add(cmd.type);
    switch (cmd.type) {
      case 'rect':
      case 'roundRect':
        roundRectPath(ctx, cmd.x, cmd.y, cmd.w, cmd.h, cmd.radius || 0);
        if (cmd.fill) { ctx.fillStyle = cmd.fill; ctx.fill(); }
        if (cmd.stroke) { ctx.strokeStyle = cmd.stroke; ctx.lineWidth = cmd.lineWidth || 1; ctx.stroke(); }
        drawn += 1;
        break;
      case 'arc':
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.r, 0, Math.PI * 2);
        if (cmd.fill) { ctx.fillStyle = cmd.fill; ctx.fill(); }
        if (cmd.stroke) { ctx.strokeStyle = cmd.stroke; ctx.stroke(); }
        drawn += 1;
        break;
      case 'text':
      case 'label':
        ctx.font = cmd.font || '14px system-ui,sans-serif';
        ctx.fillStyle = cmd.fill || '#0f172a';
        ctx.fillText(cmd.text || '', cmd.x, cmd.y);
        drawn += 1;
        break;
      default:
        break;
    }
  }
  return { drawn, types: [...types] };
}

function describeScene(scene, metaEl) {
  if (!metaEl || !scene) return;
  const counts = {};
  for (const c of scene.commands || []) counts[c.type] = (counts[c.type] || 0) + 1;
  const parts = Object.entries(counts).map(([t, n]) => `${n} x ${t}`);
  metaEl.textContent = parts.length
    ? `${scene.commands.length} commands (${parts.join(', ')}) - ${scene.width}x${scene.height}px`
    : 'No drawable elements - try HTML with divs, headings, or buttons.';
}

window.renderDrawCommands = renderDrawCommands;
window.describeScene = describeScene;
