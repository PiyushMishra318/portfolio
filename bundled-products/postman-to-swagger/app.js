const collectionEl = document.getElementById('collection');
const fileEl = document.getElementById('file');
const convertBtn = document.getElementById('convert');
const sampleBtn = document.getElementById('sample');
const errorEl = document.getElementById('error');
const loadingEl = document.getElementById('loading');
const swaggerWrap = document.getElementById('swagger-wrap');

fileEl.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  collectionEl.value = await file.text();
});

sampleBtn.addEventListener('click', async () => {
  errorEl.hidden = true;
  try {
    const res = await fetch('/postman.json');
    if (!res.ok) throw new Error('Sample not found');
    collectionEl.value = await res.text();
  } catch {
    collectionEl.value = JSON.stringify(
      {
        info: {
          name: 'Sample API',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'Health',
            request: { method: 'GET', url: '{{baseUrl}}/health' },
          },
        ],
      },
      null,
      2,
    );
  }
});

convertBtn.addEventListener('click', async () => {
  errorEl.hidden = true;
  let body;
  try {
    body = JSON.parse(collectionEl.value.trim() || '{}');
  } catch {
    errorEl.textContent = 'Invalid JSON in collection field.';
    errorEl.hidden = false;
    return;
  }
  convertBtn.disabled = true;
  sampleBtn.disabled = true;
  loadingEl.hidden = false;
  try {
    const res = await fetch('/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || res.statusText);
    }
    swaggerWrap.hidden = false;
    SwaggerUIBundle({
      spec: data,
      dom_id: '#swagger-ui',
      deepLinking: true,
    });
  } catch (err) {
    errorEl.textContent = err.message || String(err);
    errorEl.hidden = false;
  } finally {
    convertBtn.disabled = false;
    sampleBtn.disabled = false;
    loadingEl.hidden = true;
  }
});
