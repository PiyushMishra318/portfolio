const SAMPLES = {
  equal: {
    left: 'line one\nline two\nline three',
    right: 'line one\nline two\nline three',
  },
  diff: {
    left: 'line one\nline two\nline three',
    right: 'line one\nline two\nCHANGED',
  },
};

let lastDiff = [];
let viewMode = 'split';

const diffSection = document.getElementById('diff-section');
const diffViewer = document.getElementById('diff-viewer');
const diffSummary = document.getElementById('diff-summary');
const viewSplitBtn = document.getElementById('view-split');
const viewUnifiedBtn = document.getElementById('view-unified');

document.getElementById('load-equal').addEventListener('click', () => {
  document.getElementById('left').value = SAMPLES.equal.left;
  document.getElementById('right').value = SAMPLES.equal.right;
});

document.getElementById('load-diff').addEventListener('click', () => {
  document.getElementById('left').value = SAMPLES.diff.left;
  document.getElementById('right').value = SAMPLES.diff.right;
});

viewSplitBtn.addEventListener('click', () => setViewMode('split'));
viewUnifiedBtn.addEventListener('click', () => setViewMode('unified'));

function setViewMode(mode) {
  viewMode = mode;
  viewSplitBtn.classList.toggle('is-active', mode === 'split');
  viewUnifiedBtn.classList.toggle('is-active', mode === 'unified');
  renderDiff(lastDiff);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gutter(num) {
  return num == null ? '' : String(num);
}

function renderSplit(rows) {
  const oldPane = rows
    .map((row) => {
      if (row.kind === 'equal') {
        return `<div class="diff-row diff-row--equal"><span class="diff-gutter">${gutter(row.leftNum)}</span><span class="diff-code">${escapeHtml(row.content)}</span></div>`;
      }
      if (row.kind === 'delete') {
        return `<div class="diff-row diff-row--delete"><span class="diff-gutter">${gutter(row.leftNum)}</span><span class="diff-code">${escapeHtml(row.left)}</span></div>`;
      }
      if (row.kind === 'insert') {
        return `<div class="diff-row diff-row--empty"><span class="diff-gutter"></span><span class="diff-code"></span></div>`;
      }
      return `<div class="diff-row diff-row--delete"><span class="diff-gutter">${gutter(row.leftNum)}</span><span class="diff-code">${escapeHtml(row.left)}</span></div>`;
    })
    .join('');

  const newPane = rows
    .map((row) => {
      if (row.kind === 'equal') {
        return `<div class="diff-row diff-row--equal"><span class="diff-gutter">${gutter(row.rightNum)}</span><span class="diff-code">${escapeHtml(row.content)}</span></div>`;
      }
      if (row.kind === 'insert') {
        return `<div class="diff-row diff-row--insert"><span class="diff-gutter">${gutter(row.rightNum)}</span><span class="diff-code">${escapeHtml(row.right)}</span></div>`;
      }
      if (row.kind === 'delete') {
        return `<div class="diff-row diff-row--empty"><span class="diff-gutter"></span><span class="diff-code"></span></div>`;
      }
      return `<div class="diff-row diff-row--insert"><span class="diff-gutter">${gutter(row.rightNum)}</span><span class="diff-code">${escapeHtml(row.right)}</span></div>`;
    })
    .join('');

  return `<div class="diff-split"><div class="diff-pane diff-pane--old">${oldPane}</div><div class="diff-pane diff-pane--new">${newPane}</div></div>`;
}

function renderUnified(rows) {
  const lines = [];

  for (const row of rows) {
    if (row.kind === 'equal') {
      lines.push(
        `<div class="diff-row diff-row--equal"><span class="diff-gutter diff-gutter--old">${gutter(row.leftNum)}</span><span class="diff-gutter diff-gutter--new">${gutter(row.rightNum)}</span><span class="diff-sign"> </span><span class="diff-code">${escapeHtml(row.content)}</span></div>`
      );
    } else if (row.kind === 'delete') {
      lines.push(
        `<div class="diff-row diff-row--delete"><span class="diff-gutter diff-gutter--old">${gutter(row.leftNum)}</span><span class="diff-gutter diff-gutter--new"></span><span class="diff-sign">-</span><span class="diff-code">${escapeHtml(row.left)}</span></div>`
      );
    } else if (row.kind === 'insert') {
      lines.push(
        `<div class="diff-row diff-row--insert"><span class="diff-gutter diff-gutter--old"></span><span class="diff-gutter diff-gutter--new">${gutter(row.rightNum)}</span><span class="diff-sign">+</span><span class="diff-code">${escapeHtml(row.right)}</span></div>`
      );
    } else {
      lines.push(
        `<div class="diff-row diff-row--delete"><span class="diff-gutter diff-gutter--old">${gutter(row.leftNum)}</span><span class="diff-gutter diff-gutter--new"></span><span class="diff-sign">-</span><span class="diff-code">${escapeHtml(row.left)}</span></div>`,
        `<div class="diff-row diff-row--insert"><span class="diff-gutter diff-gutter--old"></span><span class="diff-gutter diff-gutter--new">${gutter(row.rightNum)}</span><span class="diff-sign">+</span><span class="diff-code">${escapeHtml(row.right)}</span></div>`
      );
    }
  }

  return `<div class="diff-unified">${lines.join('')}</div>`;
}

function renderDiff(rows) {
  if (!rows.length) {
    diffViewer.innerHTML = '';
    return;
  }
  diffViewer.innerHTML = viewMode === 'split' ? renderSplit(rows) : renderUnified(rows);
}

function summarizeDiff(rows) {
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.kind === 'insert') added += 1;
    else if (row.kind === 'delete') removed += 1;
    else if (row.kind === 'change') {
      added += 1;
      removed += 1;
    }
  }
  return { added, removed };
}

document.getElementById('compare').addEventListener('click', async () => {
  const left = document.getElementById('left').value;
  const right = document.getElementById('right').value;
  const el = document.getElementById('result');
  const btn = document.getElementById('compare');
  el.textContent = 'Comparing…';
  el.className = 'result';
  btn.disabled = true;
  diffSection.classList.add('hidden');

  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left, right }),
    });
    const data = await res.json();
    if (!res.ok) {
      el.textContent = data.error || 'Error';
      return;
    }
    el.className = data.equal ? 'result equal' : 'result diff';
    el.textContent = data.equal
      ? `Equal (1) — ${data.elapsedMs} ms`
      : `Different (0) — ${data.elapsedMs} ms`;

    lastDiff = Array.isArray(data.diff) ? data.diff : [];
    const { added, removed } = summarizeDiff(lastDiff);
    diffSummary.textContent = data.equal
      ? 'No line changes.'
      : `${added} addition${added === 1 ? '' : 's'}, ${removed} deletion${removed === 1 ? '' : 's'}.`;
    renderDiff(lastDiff);
    diffSection.classList.remove('hidden');
  } catch (err) {
    el.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
