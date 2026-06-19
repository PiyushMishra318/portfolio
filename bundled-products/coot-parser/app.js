let mode = 'ast';

const preview = document.getElementById('preview');
const canvasMeta = document.getElementById('canvas-meta');

function clearCanvas() {
  if (!preview) return;
  const ctx = preview.getContext('2d');
  ctx.clearRect(0, 0, preview.width, preview.height);
  if (canvasMeta) canvasMeta.textContent = '';
}

async function updateCanvasPreview(body) {
  if (!preview || typeof renderDrawCommands !== 'function') return;
  try {
    const res = await fetch('/parse/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const scene = await res.json();
    if (!res.ok) throw new Error(scene.error || 'Canvas preview failed');
    const stats = renderDrawCommands(preview, scene);
    describeScene(scene, canvasMeta);
    if (canvasMeta && stats.drawn) {
      canvasMeta.textContent += ` · rendered ${stats.drawn}`;
    }
  } catch (e) {
    clearCanvas();
    if (canvasMeta) canvasMeta.textContent = `Preview: ${e.message}`;
  }
}

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    const input = document.getElementById('input');
    input.placeholder =
      mode === 'compose'
        ? '[{"elementID":"hero","html":"..."}]'
        : mode === 'split'
          ? 'HTML with data-component attributes (or leave empty to use sample file)'
          : 'Paste HTML…';
  });
});

document.getElementById('load-template').addEventListener('click', async () => {
  const res = await fetch('/fixtures/template.html');
  document.getElementById('input').value = await res.text();
});

document.getElementById('load-canvas-demo').addEventListener('click', async () => {
  const res = await fetch('/fixtures/canvas-demo.html');
  document.getElementById('input').value = await res.text();
});

document.getElementById('load-compose').addEventListener('click', async () => {
  const res = await fetch('/fixtures/components.sample.json');
  document.getElementById('input').value = await res.text();
});

document.getElementById('run').addEventListener('click', async () => {
  const raw = document.getElementById('input').value;
  const out = document.getElementById('output');
  const btn = document.getElementById('run');
  out.textContent = 'Loading…';
  btn.disabled = true;
  clearCanvas();

  try {
    let res;
    let canvasBody = null;

    if (mode === 'compose') {
      const components = JSON.parse(raw);
      res = await fetch('/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(components),
      });
      out.textContent = await res.text();
      canvasBody = { components };
    } else if (mode === 'react') {
      res = await fetch('/parse/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: raw }),
      });
      out.textContent = await res.text();
      canvasBody = { html: raw };
    } else if (mode === 'split') {
      if (raw.trim()) {
        res = await fetch('/parse/ast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: raw }),
        });
        const ast = await res.json();
        if (!res.ok) throw new Error(ast.error || 'Parse failed');
        const names = [];
        const walk = (n) => {
          if (n && typeof n === 'object') {
            const attrs = n.attributes || n.attrs || [];
            const comp = attrs.find((a) => a.key === 'data-component');
            if (comp) names.push(comp.value);
            (n.children || []).forEach(walk);
          }
        };
        walk({ children: ast });
        out.textContent = JSON.stringify({ components: names }, null, 2);
        canvasBody = { html: raw };
      } else {
        res = await fetch('/split?file=fixtures/template.html');
        const split = await res.json();
        out.textContent = JSON.stringify(split, null, 2);
        const tpl = await fetch('/fixtures/template.html');
        canvasBody = { html: await tpl.text() };
      }
    } else {
      res = await fetch('/parse/ast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: raw }),
      });
      const ast = await res.json();
      if (!res.ok) throw new Error(ast.error || 'Parse failed');
      out.textContent = JSON.stringify(ast, null, 2);
      canvasBody = { html: raw };
    }

    if (res && !res.ok && mode !== 'split') {
      out.textContent = `Error: ${out.textContent}`;
    } else if (canvasBody) {
      await updateCanvasPreview(canvasBody);
    }
  } catch (e) {
    out.textContent = e.message;
    clearCanvas();
  } finally {
    btn.disabled = false;
  }
});

// Initial canvas demo on load
(async () => {
  const res = await fetch('/fixtures/canvas-demo.html');
  if (!res.ok) return;
  const html = await res.text();
  document.getElementById('input').value = html;
  await updateCanvasPreview({ html });
  if (canvasMeta) {
    canvasMeta.textContent = 'Sample loaded — click Parse to refresh output and preview.';
  }
})();
