// HTTP client for the Python worker. Every call degrades gracefully:
// if the worker is down the caller gets { available:false, ... } and the crypto verdict still runs.
const axios = require('axios');
const config = require('../../config');

const client = axios.create({
  baseURL: config.pythonWorkerUrl,
  timeout: config.workerTimeoutMs,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

let cachedHealth = { ok: false, checked_at: null, services: {} };

async function health(force = false) {
  if (!force && cachedHealth.ok && Date.now() - Date.parse(cachedHealth.checked_at) < 15000) return cachedHealth;
  try {
    const { data } = await client.get('/health', { timeout: 3000 });
    cachedHealth = { ok: true, checked_at: new Date().toISOString(), services: data };
  } catch {
    cachedHealth = { ok: false, checked_at: new Date().toISOString(), services: {} };
  }
  return cachedHealth;
}

async function renderCertificate(payload) {
  const { data } = await client.post('/render-certificate', payload);
  if (!data || data.ok === false) throw new Error(data?.error || 'render failed');
  return data;
}

/** multipart upload of a buffer */
async function postFile(route, buffer, filename, extraFields = {}) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: 'application/octet-stream' });
  for (const [k, v] of Object.entries(extraFields)) form.append(k, String(v));
  const { data } = await client.post(route, form, { headers: form.getHeaders() });
  return data;
}

async function analyze(buffer, filename) {
  return postFile('/analyze', buffer, filename);
}

async function diffCheck(buffer, filename, snapshotPngBase64) {
  return postFile('/diff-check', buffer, filename, { snapshot_png_base64: snapshotPngBase64 });
}

async function extractQr(buffer, filename) {
  return postFile('/extract-qr', buffer, filename);
}

module.exports = { health, renderCertificate, analyze, diffCheck, extractQr };
