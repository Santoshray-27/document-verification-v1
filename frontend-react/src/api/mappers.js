/**
 * Map backend snake_case payloads to UI camelCase or expected formats
 * Adapting here prevents the UI components from tightly coupling to backend naming.
 */

export function mapUser(backendUser) {
  if (!backendUser) return null;
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: backendUser.role,
    issuerId: backendUser.issuer_id,
    issuer: backendUser.issuer || null,
  };
}

export function mapDocument(doc) {
  if (!doc) return null;
  return {
    docId: doc.doc_id,
    docType: doc.doc_type,
    issuerId: doc.issuer_id,
    fields: doc.fields || {},
    status: doc.status,
    issuedAt: doc.issued_at,
    expiresAt: doc.expires_at,
    revokedAt: doc.revoked_at,
    revokeReason: doc.revoke_reason,
    fileHash: doc.file_hash,
    pdfUrl: doc.pdf_url,
    snapshotUrl: doc.snapshot_url,
    verifications: doc.verifications || 0,
    kid: doc.kid
  };
}

export function mapDashboardStats(counts) {
  if (!counts) return null;
  return {
    issued: counts.issued || 0,
    active: counts.active || 0,
    revoked: counts.revoked || 0,
    expired: counts.expired || 0,
    checks: counts.checks || 0,
  };
}
