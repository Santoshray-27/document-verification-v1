import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, FileCheck2, Fingerprint, Hash, QrCode, ScanSearch, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { VERDICT_META } from '../lib/format';

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Hash + digital signature',
    body: 'The issuer signs a manifest with ECDSA P-256 and the registry stores the SHA-256 of the exact file. One changed byte and the comparison fails.',
  },
  {
    icon: ScanSearch,
    title: 'OCR + visual forensics',
    body: 'When the bytes differ, Tesseract reads the key fields and OpenCV aligns the pages, so a re-save is told apart from a real edit.',
  },
  {
    icon: QrCode,
    title: 'QR and public link',
    body: 'Every document carries a QR to a public page. It proves a record exists — and says plainly that it does not prove the file is unchanged.',
  },
];

const STEPS = [
  { n: '01', title: 'Issuer signs', body: 'Fields are hashed, a PDF is rendered with its QR, the final bytes are hashed and the manifest is signed.' },
  { n: '02', title: 'Record stored', body: 'The signed manifest goes into the registry, with a page snapshot for visual comparison.' },
  { n: '03', title: 'Anyone verifies', body: 'Upload the file or scan the QR. The pipeline runs hash, signature, status, OCR, QR consistency and visual diff.' },
  { n: '04', title: 'Verdict + reasons', body: 'A verdict, a confidence level, every check that ran, and a heatmap showing exactly where something changed.' },
];

const LIMITS = [
  'Only registered issuers can be verified — an unknown issuer returns UNVERIFIABLE, never "fake".',
  'An exact hash match only works on the exact original file.',
  'Screenshot, scan and re-save detection is heuristic, not proof.',
  'Metadata is trivially editable, so it is only supporting evidence.',
  'The audit log is tamper-evident, not immutable.',
  'Tested on synthetic documents only.',
];

const DEMO_VERDICTS = ['GENUINE', 'GENUINE COPY', 'ALTERED', 'FORGED'];

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* ---------- hero ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="chip border border-gold-400/25 bg-gold-500/[0.08] text-gold-300"
            >
              <ShieldCheck size={13} />
              ECDSA P-256 · SHA-256 · Tamper-evident registry
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="text-balance mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-display"
            >
              Know if a document is <span className="text-gold-400">real, changed or fake.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-slate-400"
            >
              Certificates, offer letters and invoices get forwarded around until nobody knows where they came from. Agnitia lets an issuer
              sign a document once, then lets anyone check it — and explains <em className="not-italic text-slate-300">why</em> it passed or failed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/verify" className="btn-primary">
                Verify a document
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-ghost">
                Issuer login
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-2"
            >
              <span className="mr-1 text-[11px] uppercase tracking-wider text-slate-500">Verdicts</span>
              {DEMO_VERDICTS.map((v, i) => (
                <motion.span
                  key={v}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.36 + i * 0.08 }}
                  className="chip border"
                  style={{
                    borderColor: `${VERDICT_META[v].color}44`,
                    background: `${VERDICT_META[v].color}12`,
                    color: VERDICT_META[v].color,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: VERDICT_META[v].color }} />
                  {VERDICT_META[v].label}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* animated result-card mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gold-500/[0.06] blur-2xl" />
            <ResultMock />
          </motion.div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass card-hover p-6"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-500/10 text-gold-300">
                <f.icon size={20} />
              </span>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">How it works</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          The issuer signs once. After that, verification needs no access to the issuer — just the file and the public registry.
        </p>
        <div className="relative mt-9 grid gap-5 md:grid-cols-4">
          <span className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              <span className="mono relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/25 bg-navy-800 text-sm font-bold text-gold-300">
                {s.n}
              </span>
              <h3 className="text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- honest limits ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="glass p-7">
          <h2 className="text-lg font-semibold text-white">What Agnitia does not claim</h2>
          <p className="mt-1.5 text-sm text-slate-400">Stated up front, because a verification tool that overclaims is worse than useless.</p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-slate-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500/70" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- cta ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6">
        <div className="glass relative overflow-hidden px-7 py-12 text-center">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
          <Logo size={38} animate={false} withWord={false} />
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Got a document you are not sure about?</h2>
          <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-slate-400">
            Upload it, or scan the QR on it. No account needed to check.
          </p>
          <Link to="/verify" className="btn-primary mt-7">
            <FileCheck2 size={16} />
            Start verification
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Decorative mock of the result card that cycles through the verdicts. */
function ResultMock() {
  const checks = [
    { label: 'File format validation', ok: true },
    { label: 'SHA-256 file hash', ok: true },
    { label: 'QR code extraction', ok: true },
    { label: 'Registry lookup', ok: true },
    { label: 'Digital signature (ECDSA P-256)', ok: true },
    { label: 'Revocation / expiry status', ok: true },
    { label: 'File hash vs registry hash', ok: true },
  ];
  return (
    <div className="glass relative overflow-hidden p-6">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-sweep bg-gradient-to-b from-gold-400/[0.07] to-transparent" />
      <div className="flex items-center justify-between">
        <span className="section-title">Verification result</span>
        <span className="mono text-[10px] text-slate-500">#4821</span>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-emerald-500/12">
          <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-pulseRing" />
          <ShieldCheck size={26} className="relative text-emerald-400" />
        </span>
        <div>
          <p className="text-xl font-bold text-white">Genuine</p>
          <p className="text-xs text-slate-400">Confidence: High</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {checks.map((c, i) => (
          <motion.li
            key={c.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.09 }}
            className="flex items-center gap-2.5 text-xs text-slate-300"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/12 text-[9px] text-emerald-400">✓</span>
            {c.label}
          </motion.li>
        ))}
      </ul>
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-navy-950/50 px-3 py-2">
        <Hash size={12} className="shrink-0 text-slate-500" />
        <code className="mono truncate text-[10px] text-slate-400">a59136c949f1…fa1e275e3f1d0aaf224ab729</code>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
        <Eye size={12} />
        Checked 4 seconds ago · Meridian Institute of Technology
      </div>
    </div>
  );
}
