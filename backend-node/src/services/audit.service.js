// Tamper-evident (NOT immutable) hash-chained audit log.
// entry_hash = sha256(prev_hash + canonical_event_json)
const db = require('../db');
const { canonicalize, sha256Hex } = require('./crypto.service');

const GENESIS = sha256Hex('EVIDENTIA-GENESIS');

function lastHash() {
  const row = db.prepare('SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
  return row ? row.entry_hash : GENESIS;
}

/**
 * Append one entry. Returns the stored row.
 * detail is sanitized to a plain object of primitives/arrays.
 */
function append({ actorId = null, actorRole = null, action, docId = null, detail = {} }) {
  const time = new Date().toISOString();
  const prev = lastHash();
  const safeDetail = sanitizeDetail(detail);
  // id is assigned by AUTOINCREMENT; chain over the values we control + prev_hash.
  const candidate = {
    actor_id: actorId,
    actor_role: actorRole,
    action,
    doc_id: docId,
    detail_json: safeDetail,
    time,
    prev_hash: prev,
  };
  const entryHash = sha256Hex(prev + canonicalize(candidate));
  const info = db
    .prepare(
      `INSERT INTO audit_log (actor_id, actor_role, action, doc_id, detail_json, time, prev_hash, entry_hash)
       VALUES (@actor_id, @actor_role, @action, @doc_id, @detail_json, @time, @prev_hash, @entry_hash)`
    )
    .run({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      doc_id: docId,
      detail_json: JSON.stringify(safeDetail),
      time,
      prev_hash: prev,
      entry_hash: entryHash,
    });
  return db.prepare('SELECT * FROM audit_log WHERE id = ?').get(info.lastInsertRowid);
}

function sanitizeDetail(detail) {
  if (!detail || typeof detail !== 'object') return { note: String(detail ?? '') };
  const out = {};
  for (const [k, v] of Object.entries(detail)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).slice(0, 50);
    else out[k] = String(v);
  }
  return out;
}

function list({ limit = 100, offset = 0, docId = null, action = null } = {}) {
  const where = [];
  const params = {};
  if (docId) {
    where.push('doc_id = @doc_id');
    params.doc_id = docId;
  }
  if (action) {
    where.push('action = @action');
    params.action = action;
  }
  const sql = `SELECT * FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY id DESC LIMIT @limit OFFSET @offset`;
  return db.prepare(sql).all({ ...params, limit, offset });
}

/** Recompute the whole chain. Returns { valid, entries_checked, broken_at }. */
function verifyChain() {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id ASC').all();
  let prev = GENESIS;
  for (const r of rows) {
    let detail;
    try {
      detail = JSON.parse(r.detail_json);
    } catch {
      return { valid: false, entries_checked: rows.length, broken_at: r.id, reason: 'unparseable detail_json' };
    }
    const candidate = {
      actor_id: r.actor_id,
      actor_role: r.actor_role,
      action: r.action,
      doc_id: r.doc_id,
      detail_json: detail,
      time: r.time,
      prev_hash: r.prev_hash,
    };
    const expected = sha256Hex(r.prev_hash + canonicalize(candidate));
    if (expected !== r.entry_hash) {
      return { valid: false, entries_checked: rows.length, broken_at: r.id, reason: 'entry_hash mismatch' };
    }
    if (r.prev_hash !== prev) {
      return { valid: false, entries_checked: rows.length, broken_at: r.id, reason: 'prev_hash link broken' };
    }
    prev = r.entry_hash;
  }
  return { valid: true, entries_checked: rows.length, broken_at: null, reason: null };
}

module.exports = { append, list, verifyChain, GENESIS };
