const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

const CORE_METRICS = [
  'Largest Contentful Paint',
  'First Input Delay',
  'Cumulative Layout Shift',
  'First Contentful Paint',
  'Speed Index',
  'Time To Interactive',
  'Total Blocking Time',
];

function scoreClass(score) {
  if (score >= 90) return 'score--good';
  if (score >= 50) return 'score--ok';
  return 'score--poor';
}

function showStatus(message, type = 'loading') {
  statusEl.hidden = false;
  statusEl.className = `status status--${type}`;
  statusEl.innerHTML =
    type === 'loading'
      ? `<span class="spinner" aria-hidden="true"></span><span>${message}</span>`
      : message;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = '';
}

function renderMetrics(stats) {
  const entries = CORE_METRICS.filter((key) => stats[key])
    .map(
      (key) =>
        `<div class="metric"><dt>${key}</dt><dd>${stats[key]}</dd></div>`,
    )
    .join('');

  if (!entries) {
    return '<p class="muted">No metrics returned for this run.</p>';
  }

  return `<dl class="metrics">${entries}</dl>`;
}

function renderOpportunities(opportunities) {
  if (!opportunities?.length) {
    return '';
  }

  const items = opportunities
    .slice(0, 5)
    .map(
      (item) =>
        `<li><strong>${item.title ?? 'Opportunity'}</strong>${item.displayValue ? ` · ${item.displayValue}` : ''}</li>`,
    )
    .join('');

  return `
    <section class="opportunities">
      <h3>Top opportunities</h3>
      <ul>${items}</ul>
    </section>
  `;
}

function renderStrategy(label, data) {
  const score = Math.round(data.score ?? 0);
  return `
    <article class="strategy card">
      <header class="strategy__header">
        <h2>${label}</h2>
        <div class="score ${scoreClass(score)}" aria-label="Performance score ${score}">
          <span class="score__value">${score}</span>
          <span class="score__label">Performance</span>
        </div>
      </header>
      ${renderMetrics(data.stats ?? {})}
      ${renderOpportunities(data.opportunities)}
    </article>
  `;
}

function renderResults(data) {
  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <p class="results__url"><span>Analyzed</span> ${data.url}</p>
    <div class="strategies">
      ${renderStrategy('Desktop', data.desktop)}
      ${renderStrategy('Mobile', data.mobile)}
    </div>
  `;
}

function clearResults() {
  resultsEl.hidden = true;
  resultsEl.innerHTML = '';
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  urlInput.disabled = loading;
  submitBtn.textContent = loading ? 'Analyzing…' : 'Analyze';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = urlInput.value.trim();
  clearResults();
  setLoading(true);
  showStatus('Running PageSpeed for desktop and mobile. This may take up to a minute.', 'loading');

  try {
    const response = await fetch(`/api/pagespeed?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || response.statusText);
    }

    hideStatus();
    renderResults(data);
  } catch (error) {
    showStatus(error.message || String(error), 'error');
  } finally {
    setLoading(false);
  }
});
