const SAMPLE_COLLECTION = {
  info: {
    name: 'My API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    {
      name: 'Get Users',
      request: {
        method: 'GET',
        url: {
          raw: 'https://api.example.com/users',
          host: ['api.example.com'],
          path: ['users'],
        },
      },
    },
    {
      name: 'Create User',
      request: {
        method: 'POST',
        url: { raw: 'https://api.example.com/users' },
        body: { mode: 'raw', raw: '{"name": "John"}' },
      },
    },
  ],
};

const collectionEl  = document.getElementById('collection');
const fileEl        = document.getElementById('file');
const convertBtn    = document.getElementById('convert');
const sampleBtn     = document.getElementById('sample');
const errorEl       = document.getElementById('error');
const loadingEl     = document.getElementById('loading');
const swaggerWrap   = document.getElementById('swagger-wrap');
const outputPanel   = document.getElementById('output-panel');
const jsonOutputCode= document.getElementById('json-output-code');
const copyBtn       = document.getElementById('copy-btn');

// Pre-fill textarea with sample on load
collectionEl.value = JSON.stringify(SAMPLE_COLLECTION, null, 2);

// File upload
fileEl.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  collectionEl.value = await file.text();
});

// Load sample button
sampleBtn.addEventListener('click', () => {
  errorEl.hidden = true;
  collectionEl.value = JSON.stringify(SAMPLE_COLLECTION, null, 2);
});

// Copy JSON output
copyBtn.addEventListener('click', () => {
  const text = jsonOutputCode.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
    }, 1800);
  }).catch(() => {});
});

// Convert
convertBtn.addEventListener('click', async () => {
  errorEl.hidden = true;
  let body;
  try {
    body = JSON.parse(collectionEl.value.trim() || '{}');
  } catch {
    errorEl.textContent = 'Invalid JSON — please check your Postman collection.';
    errorEl.hidden = false;
    return;
  }

  convertBtn.disabled = true;
  sampleBtn.disabled  = true;
  loadingEl.hidden    = false;
  outputPanel.hidden  = true;
  swaggerWrap.hidden  = true;

  try {
    const res = await fetch('/products/postman-to-swagger/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || res.statusText);
    }

    // Show raw JSON output
    jsonOutputCode.textContent = JSON.stringify(data, null, 2);
    outputPanel.hidden = false;

    // Show Swagger UI
    swaggerWrap.hidden = false;
    // Clear previous render
    document.getElementById('swagger-ui').innerHTML = '';
    SwaggerUIBundle({
      spec: data,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  } catch (err) {
    errorEl.textContent = err.message || String(err);
    errorEl.hidden = false;
  } finally {
    convertBtn.disabled = false;
    sampleBtn.disabled  = false;
    loadingEl.hidden    = true;
  }
});
