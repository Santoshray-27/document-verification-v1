import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Bot, Clock, Download, FileSearch, RefreshCw, Sparkles } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import VerdictBadge from '../../components/VerdictBadge.jsx';
import EvidenceList from '../../components/EvidenceList.jsx';
import FieldDiff from '../../components/FieldDiff.jsx';
import HashStrip from '../../components/HashStrip.jsx';
import HeatmapViewer from '../../components/HeatmapViewer.jsx';
import { SkeletonResult } from '../../components/Skeleton.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { fmtDate, fmtMs } from '../../lib/format';

export default function ResultPage() {
  const { jobId } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/verify/jobs/${jobId}/result`);
        if (alive) setR(data);
      } catch (e) {
        if (alive) setError(errMsg(e, 'This verification result is no longer available.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [jobId]);

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><SkeletonResult /></div>;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState icon={FileSearch} title="Result unavailable" body={error} action={<Link to="/verify" className="btn-primary">Verify another document</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6">
      {/* ---- verdict hero ---- */}
      <section className="glass overflow-hidden px-6 py-10 text-center">
        <VerdictBadge verdict={r.verdict} confidence={r.confidence_level} />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs">
          {r.issuer_name && <Meta label="Issuer" value={r.issuer_name} />}
          {r.doc_id && <Meta label="Document" value={`${r.doc_id.slice(0, 8)}…`} mono />}
          {r.issued_at && <Meta label="Issued" value={fmtDate(r.issued_at)} />}
          <Meta label="Checked" value={fmtDate(r.created_at, true)} />
          <Meta label="Took" value={fmtMs(r.duration_ms)} />
        </div>

        <div className="mx-auto mt-6 max-w-sm">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Heuristic evidence score</span>
            <span className="mono text-xs text-slate-300">{r.evidence_score}/100</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
              initial={{ width: 0 }}
              animate={{ width: `${r.evidence_score}%` }}
              transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">A weighted count of the checks that passed — not a probability.</p>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {r.report_url && (
            <a href={r.report_url} className="btn-primary">
              <Download size={16} />
              Download report
            </a>
          )}
          <Link to="/verify" className="btn-ghost">
            <RefreshCw size={15} />
            Verify another
          </Link>
        </div>
      </section>

      {/* ---- reasons ---- */}
      {r.reasons?.length > 0 && (
        <section className="glass p-6">
          <h3 className="section-title mb-4">Why — in plain language</h3>
          <ul className="space-y-3.5">
            {r.reasons.map((x, i) => (
              <motion.li
                key={x.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5"
              >
                <p className="text-sm font-semibold text-slate-100">{x.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{x.detail}</p>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- evidence ---- */}
      <section>
        <h3 className="section-title mb-3">Evidence checklist — every check that ran</h3>
        <EvidenceList checks={r.checks} />
      </section>

      {/* ---- hashes ---- */}
      <HashStrip expected={r.expected_file_hash} uploaded={r.uploaded_file_hash} match={r.hash_match} />

      {/* ---- fields ---- */}
      {r.fields?.length > 0 && (
        <section>
          <h3 className="section-title mb-3">Key fields — registry vs OCR</h3>
          <FieldDiff fields={r.fields} ocrConfidence={r.ocr_confidence} />
        </section>
      )}

      {/* ---- heatmap ---- */}
      <section>
        <HeatmapViewer visual={r.visual} snapshotUrl={r.doc_id ? `/static/snapshots/${r.doc_id}.png` : null} />
      </section>

      {/* ---- metadata ---- */}
      {r.metadata && (
        <section className="glass p-6">
          <h3 className="section-title mb-3">Metadata signals</h3>
          {r.metadata.signals?.length ? (
            <div className="flex flex-wrap gap-2">
              {r.metadata.signals.map((s) => (
                <span key={s} className="chip border border-amber-400/30 bg-amber-500/10 text-amber-200">
                  <AlertTriangle size={11} />
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No suspicious metadata signals.</p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Metadata is trivially editable, so this is supporting evidence only. It never decides the verdict on its own.
          </p>
        </section>
      )}

      {/* ---- ai explanation ---- */}
      <section className="rounded-2xl border border-dashed border-gold-400/25 bg-gold-500/[0.04] p-6">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-gold-400" />
          <h3 className="text-sm font-semibold text-gold-200">AI-assisted explanation</h3>
          <span className="chip border border-gold-400/25 bg-gold-500/10 text-[9px] text-gold-300">does not decide the verdict</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{r.ai_explanation || plainLanguage(r)}</p>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <Sparkles size={12} className="mt-0.5 shrink-0" />
          Generated from the deterministic result above by rule-based templates. The verdict, the confidence and every check come from
          cryptography and rules — no language model is involved in deciding them.
        </p>
      </section>

      <p className="pb-6 text-center text-[11px] leading-relaxed text-slate-500">
        <Clock size={11} className="mr-1 inline" />
        Automated verification aid. Not a legal certificate of authenticity.
      </p>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-slate-300 ${mono ? 'mono text-[11px]' : ''}`}>{value}</span>
    </span>
  );
}

/** Rule-based plain-language summary of the deterministic result. */
function plainLanguage(r) {
  const issuer = r.issuer_name || 'the issuer';
  switch (r.verdict) {
    case 'GENUINE':
      return `This is byte-for-byte the file ${issuer} signed. Its SHA-256 matches the registry, and the registry record itself carries a valid ECDSA signature — two separate guarantees, both satisfied. You can accept it.`;
    case 'GENUINE COPY':
      return `The content is exactly what ${issuer} signed, but the file itself has been re-encoded — most likely a screenshot, a print-and-scan or a "save as PDF". That is normal when a document is shared, so we do not treat it as tampering. Confidence is ${r.confidence_level} because this call rests on OCR and visual comparison rather than on a hash match; glance at the difference panel if you want to be sure.`;
    case 'ALTERED':
      return `The file is not the original, and at least one key field differs from what ${issuer} signed. The difference panel shows where on the page it changed. Treat this document as edited until the issuer confirms otherwise.`;
    case 'FORGED':
      return `This document did not come from ${issuer} in the form presented. Either the registry record failed signature verification, or a genuine QR code has been placed on content that does not belong to it. Do not accept it.`;
    case 'NOT ISSUED':
      return `No record with this document ID exists in the registry, so it was never issued through Agnitia by a registered issuer. We are not calling it fake — we simply have no record of it.`;
    case 'UNVERIFIABLE':
      return `We found a record, but we cannot vouch for the issuer right now (it may be suspended, or its signing key is unavailable). This is not evidence that the document is fake — it means our trust anchor is missing.`;
    case 'REVOKED':
      return `${issuer} withdrew this document. Even though the file may be the exact original, it must not be accepted. The reason recorded by the issuer is shown in the evidence list.`;
    case 'EXPIRED':
      return `This document was genuinely issued, but its validity has ended. Ask the issuer for a current one.`;
    default:
      return `We could not gather enough readable evidence to decide either way — for example the QR was missing and no document ID was supplied, or the scan was too degraded for OCR. Try a higher-quality scan of the full page, or enter the document ID manually.`;
  }
}
