// In-memory job store powering the UI steppers. Jobs carry ordered steps with live status.
const crypto = require('crypto');

const jobs = new Map();
const TTL_MS = 30 * 60 * 1000;

function newJob(type, ownerId, steps) {
  const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  jobs.set(jobId, {
    job_id: jobId,
    type,
    owner_id: ownerId ?? null,
    status: 'running',
    progress: 0,
    started_at: now,
    finished_at: null,
    error: null,
    steps: steps.map((s, i) => ({
      id: s.id,
      label: s.label,
      status: i === 0 ? 'running' : 'queued',
      message: '',
      ms: null,
      detail: null,
      _t: null,
    })),
    result: null,
  });
  return jobId;
}

function get(jobId) {
  const j = jobs.get(jobId);
  if (!j) return null;
  return publicView(j);
}

function raw(jobId) {
  return jobs.get(jobId) || null;
}

function publicView(j) {
  return {
    job_id: j.job_id,
    type: j.type,
    status: j.status,
    progress: j.progress,
    started_at: j.started_at,
    finished_at: j.finished_at,
    error: j.error,
    steps: j.steps.map(({ _t, ...s }) => s),
    result: j.result,
  };
}

function stepIndex(j, id) {
  return j.steps.findIndex((s) => s.id === id);
}

/** Mark a step running (and finish the previous one implicitly). */
function start(jobId, id, message = '') {
  const j = jobs.get(jobId);
  if (!j) return;
  const i = stepIndex(j, id);
  if (i < 0) return;
  j.steps.forEach((s, k) => {
    if (k < i && s.status === 'running') s.status = 'passed';
    if (k < i && s.status === 'queued') s.status = 'skipped';
  });
  j.steps[i].status = 'running';
  j.steps[i].message = message || j.steps[i].message;
  j.steps[i]._t = Date.now();
  j.progress = Math.round((i / j.steps.length) * 100);
}

/** Finish a step. status: passed | warning | failed | skipped */
function finish(jobId, id, status, message = '', detail = null) {
  const j = jobs.get(jobId);
  if (!j) return;
  const i = stepIndex(j, id);
  if (i < 0) return;
  const s = j.steps[i];
  s.status = status;
  if (message) s.message = message;
  if (detail !== null) s.detail = detail;
  s.ms = s._t ? Date.now() - s._t : s.ms;
  j.progress = Math.round(((i + 1) / j.steps.length) * 100);
}

function skip(jobId, id, message = 'not applicable') {
  finish(jobId, id, 'skipped', message);
}

function done(jobId, result) {
  const j = jobs.get(jobId);
  if (!j) return;
  j.status = 'done';
  j.progress = 100;
  j.finished_at = new Date().toISOString();
  j.result = result;
}

function fail(jobId, error, stepId) {
  const j = jobs.get(jobId);
  if (!j) return;
  if (stepId) {
    const i = stepIndex(j, stepId);
    if (i >= 0) {
      j.steps[i].status = 'failed';
      j.steps[i].message = error;
      j.steps[i].ms = j.steps[i]._t ? Date.now() - j.steps[i]._t : null;
    }
  }
  j.status = 'failed';
  j.error = error;
  j.finished_at = new Date().toISOString();
}

function cleanup() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, j] of jobs) {
    if (Date.parse(j.started_at) < cutoff) jobs.delete(id);
  }
}

setInterval(cleanup, 5 * 60 * 1000).unref();

module.exports = { newJob, get, raw, start, finish, skip, done, fail, size: () => jobs.size };
