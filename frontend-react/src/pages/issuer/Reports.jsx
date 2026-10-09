import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ShieldCheck, FileCheck, AlertTriangle, Download, ArrowUpRight, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api, { errMsg } from '../../api/axios';
import { fmtDate } from '../../lib/format';

export default function Reports() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['issuer-reports'],
    queryFn: async () => {
      const res = await api.get('/issuer/reports');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const summary = data?.summary || {
    total_issued: 0,
    active: 0,
    revoked: 0,
    expired: 0,
    total_verifications: 0,
  };

  const byVerdict = data?.by_verdict || [];
  const byDocType = data?.by_doc_type || [];
  const recentVerifications = data?.recent_verifications || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            Intelligence & Analytics
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mt-1">Verification Reports</h1>
          <p className="font-mono text-xs text-ink-muted mt-1">
            Real-time audit metrics, issuance volume, and forensic verification verdicts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/issuer/documents"
            className="btn-ghost flex items-center gap-2 font-mono text-xs"
          >
            All Documents <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface border border-line p-4" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-red-300 bg-red-50 p-4 font-mono text-xs text-red-700">
          {errMsg(error)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-line bg-surface p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-ink-muted">Total Certificates Issued</div>
              <div className="mt-1 font-mono text-3xl font-bold text-ink">{summary.total_issued}</div>
              <div className="mt-2 font-mono text-[10px] text-ink-muted flex items-center gap-1.5">
                <FileCheck size={12} className="text-amber-600" /> Across all templates
              </div>
            </div>

            <div className="border border-emerald-300 bg-emerald-50/50 p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-emerald-800">Active in Registry</div>
              <div className="mt-1 font-mono text-3xl font-bold text-emerald-700">{summary.active}</div>
              <div className="mt-2 font-mono text-[10px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Valid for verification
              </div>
            </div>

            <div className="border border-line bg-surface p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-ink-muted">Total Checks Run</div>
              <div className="mt-1 font-mono text-3xl font-bold text-amber-600">{summary.total_verifications}</div>
              <div className="mt-2 font-mono text-[10px] text-ink-muted flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-ink-muted" /> Public & API verifications
              </div>
            </div>

            <div className="border border-red-300 bg-red-50/50 p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-red-800">Revoked / Expired</div>
              <div className="mt-1 font-mono text-3xl font-bold text-red-700">{summary.revoked + summary.expired}</div>
              <div className="mt-2 font-mono text-[10px] text-red-700 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {summary.revoked} revoked · {summary.expired} expired
              </div>
            </div>
          </div>

          {/* Breakdown Section: By Verdict & By Document Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Verdict */}
            <div className="border border-line bg-surface p-6 shadow-sm">
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-amber-600" /> Verifications by Verdict
              </h2>

              {byVerdict.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-ink-muted border border-dashed border-line">
                  No verification verdicts recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {byVerdict.map((v) => {
                    const percent = summary.total_verifications > 0
                      ? Math.round((v.n / summary.total_verifications) * 100)
                      : 0;

                    const isGenuine = v.verdict.toLowerCase().includes('genuine');
                    const isForged = v.verdict.toLowerCase().includes('forged') || v.verdict.toLowerCase().includes('altered');

                    return (
                      <div key={v.verdict} className="space-y-1">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="font-bold text-ink uppercase">{v.verdict}</span>
                          <span className="text-ink-muted">
                            {v.n} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-2 border border-line overflow-hidden">
                          <div
                            className={`h-full ${
                              isGenuine ? 'bg-emerald-600' : isForged ? 'bg-red-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Document Type */}
            <div className="border border-line bg-surface p-6 shadow-sm">
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold mb-4 flex items-center gap-2">
                <FileCheck size={15} className="text-amber-600" /> Issuance by Document Type
              </h2>

              {byDocType.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-ink-muted border border-dashed border-line">
                  No documents issued yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {byDocType.map((dt) => {
                    const percent = summary.total_issued > 0
                      ? Math.round((dt.n / summary.total_issued) * 100)
                      : 0;

                    return (
                      <div key={dt.doc_type} className="space-y-1">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-ink uppercase">{dt.doc_type.replace(/_/g, ' ')}</span>
                          <span className="text-ink-muted">
                            {dt.n} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-2 border border-line overflow-hidden">
                          <div
                            className="h-full bg-ink"
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Verifications Feed */}
          <div className="border border-line bg-surface p-6 shadow-sm">
            <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold mb-2">
              Recent Verification Activity
            </h2>
            <p className="font-mono text-xs text-ink-muted mb-4">
              Real-time feed of verifications executed against your issued credentials.
            </p>

            {recentVerifications.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-ink-muted border border-dashed border-line">
                No verifications recorded recently.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-line">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Document ID</th>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Verdict</th>
                      <th className="px-3 py-2">Evidence Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentVerifications.map((v) => (
                      <tr key={v.id} className="hover:bg-surface-2 transition">
                        <td className="px-3 py-2 text-ink-muted">{fmtDate(v.created_at)}</td>
                        <td className="px-3 py-2 text-ink">{v.doc_id}</td>
                        <td className="px-3 py-2 text-ink font-sans">{v.fields?.name || '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 border text-[9px] font-bold ${
                              v.verdict.toLowerCase().includes('genuine')
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : v.verdict.toLowerCase().includes('forged') || v.verdict.toLowerCase().includes('altered')
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : 'border-amber-300 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {v.verdict}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-ink font-bold">{v.evidence_score}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
