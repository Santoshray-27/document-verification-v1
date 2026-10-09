/**
 * Query Key Factory for standardizing all React Query cache keys.
 */
export const queries = {
  // Auth
  auth: {
    me: () => ['auth', 'me'],
  },
  
  // Issuer
  issuer: {
    dashboard: () => ['issuer', 'dashboard'],
    documents: (filters) => ['issuer', 'documents', filters],
    document: (docId) => ['issuer', 'document', docId],
  },
  
  // Verification
  verify: {
    job: (jobId) => ['verify', 'job', jobId],
    result: (jobId) => ['verify', 'result', jobId],
  },

  // Public
  public: {
    doc: (docId) => ['public', 'doc', docId],
    issuers: () => ['public', 'issuers'],
  },
  
  // Admin
  admin: {
    audit: (filters) => ['admin', 'audit', filters],
  }
};
