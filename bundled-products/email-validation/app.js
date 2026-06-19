const PRESETS = {
  clean: { spf: false, dkim: false, spam: false, virus: false },
  spam: { spf: false, dkim: false, spam: true, virus: false },
  'all-fail': { spf: true, dkim: true, spam: true, virus: true },
};

function setVerdicts(preset) {
  const p = PRESETS[preset];
  document.querySelectorAll('[data-key]').forEach((el) => {
    const key = el.dataset.key;
    const map = {
      spfVerdict: p.spf,
      dkimVerdict: p.dkim,
      spamVerdict: p.spam,
      virusVerdict: p.virus,
    };
    el.checked = map[key] ?? false;
  });
}

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => setVerdicts(btn.dataset.preset));
});

function buildReceipt() {
  const receipt = {
    recipients: document
      .getElementById('recipients')
      .value.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  document.querySelectorAll('[data-key]').forEach((el) => {
    receipt[el.dataset.key] = { status: el.checked ? 'FAIL' : 'PASS' };
  });
  return receipt;
}

document.getElementById('run').addEventListener('click', async () => {
  const out = document.getElementById('out');
  const verdictEl = document.getElementById('verdict');
  const btn = document.getElementById('run');
  out.textContent = 'Evaluating…';
  verdictEl.hidden = true;
  btn.disabled = true;
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt: buildReceipt(),
        messageId: 'demo-' + Date.now(),
      }),
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);

    const bounce = data.bounce === true || data.disposition === 'bounce';
    verdictEl.hidden = false;
    verdictEl.className = bounce ? 'verdict verdict--bounce' : 'verdict verdict--accept';
    verdictEl.innerHTML = bounce
      ? `<strong>Bounce</strong> — message would be rejected (${data.note || 'simulation'})`
      : `<strong>Accept</strong> — message would be delivered (${data.note || 'simulation'})`;
  } catch (err) {
    out.textContent = err.message;
    verdictEl.hidden = true;
  } finally {
    btn.disabled = false;
  }
});
