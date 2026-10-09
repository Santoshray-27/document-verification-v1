/**
 * EVIDENTIA LANDING PAGE COPY
 * All user-facing text is centralised here.
 * Replace any line marked [PLACEHOLDER] with your real content.
 */

export const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Verdicts',     href: '#verdicts'     },
  { label: 'FAQ',          href: '#faq'          },
  { label: 'Contact',      href: '#contact'      },
];

export const HERO = {
  headline: ['Verify Any Document.', 'Trust Every Verdict.'],
  sub: 'Cryptographic, deterministic verification — not AI guesswork. Every result comes with evidence.',
  ctaPrimary:   { label: 'Verify a Document', to: '/verify' },
  ctaSecondary: { label: 'Issue Documents',   to: '/login'  },
};

export const FORENSICS_CARDS = {
  heading: 'Forensic Evidence, Not Guesswork',
  left: {
    tabs: [
      {
        key:   'verdict',
        label: 'Verdict Engine',
        desc:  'Six distinct verdicts, each backed by deterministic cryptographic checks and rules.',
      },
      {
        key:   'heatmap',
        label: 'Tamper Heatmap',
        desc:  'OpenCV + scikit-image aligns pages and highlights exactly where content was changed.',
      },
      {
        key:   'pipeline',
        label: 'Live Pipeline',
        desc:  'Server-Sent Events stream each step in real time — no polling, no blank screens.',
      },
    ],
    verdictChips: ['GENUINE', 'GENUINE COPY', 'ALTERED', 'FORGED', 'REVOKED', 'UNVERIFIABLE'],
    pipelineSteps: [
      'Extract QR code',
      'Validate ECDSA signature',
      'Registry lookup',
      'Run OCR (Tesseract)',
      'Generate visual diff',
      'Deliver verdict',
    ],
  },
  right: {
    stats: [
      { label: 'Signature scheme',   value: 'ECDSA P-256' },
      { label: 'Signatures per doc', value: '2'           },
      { label: 'AI in verdict',      value: '0'           },
      { label: 'Hash function',      value: 'SHA-256'     },
    ],
  },
};

export const HOW_IT_WORKS = {
  heading: 'How it works',
  chip:    'in 3 steps',
  steps: [
    {
      n:     '01',
      color: '#FF7A2F',
      title: 'Issue',
      body:  'Issuers sign documents with ECDSA P-256 and embed a secure QR carrying the content signature.',
    },
    {
      n:     '02',
      color: '#F0568F',
      title: 'Verify',
      body:  'Upload a file or scan the QR. Get a verdict, confidence level, concrete reasons and a heatmap.',
    },
    {
      n:     '03',
      color: '#F59E0B',
      title: 'Audit',
      body:  'Every action is logged in a hash-chained, tamper-evident trail — verifiable by an admin at any time.',
    },
  ],
};

export const STATEMENT = {
  words: 'Evidentia verifies documents with deterministic cryptography and forensic evidence — never with AI guesses.',
};

export const BIG_NUMBERS = [
  { n: '6',   suffix: '',     label: 'Distinct verdict categories',          desc: 'GENUINE · GENUINE COPY · ALTERED · FORGED · REVOKED · UNVERIFIABLE' },
  { n: '2',   suffix: '',     label: 'Cryptographic signatures per document', desc: 'sig_content embedded in QR · sig_record stored in registry'          },
  { n: '256', suffix: '-bit', label: 'ECDSA key strength',                   desc: 'NIST P-256 — same curve used in TLS and passkeys'                    },
  { n: '100', suffix: '%',    label: 'Deterministic verdicts',               desc: 'Same file, same issuer, same result — every single time'              },
];

// [PLACEHOLDER] Replace with real use-case copy. Do NOT invent real names or organisations.
export const USE_CASES = [
  {
    role:  'University Registrar',
    icon:  '\uD83C\uDF93',
    quote: 'We issue hundreds of degree certificates every semester. Evidentia lets any employer verify one in seconds — without calling us.',
    attr:  'Registrar, sample academic institution', // [PLACEHOLDER]
  },
  {
    role:  'HR Team',
    icon:  '\uD83C\uDFE2',
    quote: 'We used to spend days chasing original offer letters. Now candidates upload their document and we get a verdict with evidence before the interview.',
    attr:  'Talent acquisition team, sample enterprise', // [PLACEHOLDER]
  },
  {
    role:  'Compliance Officer',
    icon:  '\uD83D\uDD12',
    quote: 'The hash-chained audit trail means I can show regulators exactly what was verified, when, and by whom — without rebuilding anything.',
    attr:  'Compliance lead, sample regulated industry', // [PLACEHOLDER]
  },
];

export const FAQ_ITEMS = [
  {
    q: 'How does Evidentia decide a verdict?',
    a: 'The verdict engine runs a deterministic pipeline: QR extraction → ECDSA signature check → registry lookup → revocation/expiry status → SHA-256 file hash → OCR field comparison → visual diff. Each check produces evidence; the engine maps that evidence to one of six verdicts by fixed rules. No model, no probability, no guessing.',
  },
  {
    q: 'Is AI used to decide authenticity?',
    a: 'No. AI is explicitly excluded from the verdict and confidence level. It can appear as an optional advisory annotation (plain-language explanation), clearly labelled separately. The cryptographic and forensic checks alone decide the outcome.',
  },
  {
    q: 'What happens if someone screenshots or rescans a document?',
    a: 'The file hash will differ from the registered one, but OCR + visual similarity can detect that the content is unchanged. If both signal "same", the verdict is GENUINE COPY — not ALTERED or FORGED. Most systems wrongly call screenshots tampering; Evidentia distinguishes them.',
  },
  {
    q: 'What is the difference between ALTERED and FORGED?',
    a: 'ALTERED means a valid registry record exists and the signature is good, but the uploaded content differs from what was signed. FORGED means either no record exists, the ECDSA signature fails, or a genuine QR was pasted onto different content. ALTERED is "it was real, then changed". FORGED is "it was never legitimately issued".',
  },
  {
    q: 'Who can issue documents?',
    a: 'Only organisations registered by an admin (university, company, etc.). An unregistered issuer returns UNVERIFIABLE — Evidentia never calls an unknown document "fake", because it simply cannot know.',
  },
  {
    q: 'How is the audit trail protected?',
    a: "Every event (issue, verify, revoke, admin action) is appended with a SHA-256 chain hash — each entry's hash covers the previous entry's hash. An admin can run an integrity check; if any row is altered or deleted, the chain breaks and the check fails.",
  },
];

export const CTA_SECTION = {
  heading: 'Stop Trusting Documents. Start Verifying Them.',
  sub:     'No account needed to check. Upload the file, scan the QR, get a verdict in seconds.',
  btn:     { label: 'Verify a Document', to: '/verify' },
};

export const FOOTER_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Verdicts',     href: '#verdicts'     },
  { label: 'FAQ',          href: '#faq'          },
  { label: 'Contact',      href: '#contact'      },
];
