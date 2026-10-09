/**
 * Typed Template Registry for Evidentia Verifiable Credential Platform
 * Defines 7 distinct credential templates with complete field schemas,
 * validation rules, and realistic sample preview data.
 */

export const TEMPLATE_REGISTRY = [
  // 1. STANDARD ACADEMIC CERTIFICATE
  {
    id: 'tpl_academic',
    name: 'Standard Academic Certificate',
    category: 'COLLEGES & UNIVERSITIES',
    description: 'Formal degree/diploma certificate awarded for successful completion of academic programs.',
    layoutVariant: 'landscape',
    accentPalette: {
      primary: '#0A1F44',     // Deep Navy
      secondary: '#C9A227',   // Classic Gold
      background: '#FDFBF7',  // Warm Parchment
      text: '#1B2437',
      presets: ['#C9A227', '#1E3A8A', '#047857', '#991B1B', '#4C1D95']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'RECIPIENT FULL NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Aarav Sharma',
        helpText: 'Full legal name of the student as per university records',
        step: 'recipient',
        validation: { min: 2, max: 70 }
      },
      {
        key: 'certificate_number',
        label: 'ENROLLMENT / ROLL NUMBER',
        type: 'text',
        required: true,
        placeholder: 'e.g. MIT-ENG-2026-084',
        helpText: 'Permanent academic registration or enrollment number',
        step: 'recipient',
        validation: { min: 4, max: 40 }
      },
      {
        key: 'course',
        label: 'COURSE / DEGREE TITLE',
        type: 'text',
        required: true,
        placeholder: 'e.g. Bachelor of Technology in Computer Science',
        helpText: 'Degree or diploma conferral program title',
        step: 'recipient',
        validation: { min: 3, max: 90 }
      },
      {
        key: 'department',
        label: 'DEPARTMENT / FACULTY',
        type: 'text',
        required: false,
        placeholder: 'e.g. Department of Engineering & Technology',
        step: 'recipient',
        validation: { max: 80 }
      },
      {
        key: 'grade',
        label: 'DIVISION / GRADE / CGPA',
        type: 'text',
        required: true,
        placeholder: 'e.g. First Class with Distinction (9.4 CGPA)',
        helpText: 'Cumulative performance honours or division awarded',
        step: 'recipient',
        validation: { min: 1, max: 40 }
      },
      {
        key: 'start_date',
        label: 'PROGRAM START DATE',
        type: 'date',
        required: false,
        step: 'customize'
      },
      {
        key: 'completion_date',
        label: 'COMPLETION DATE',
        type: 'date',
        required: false,
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'DATE OF ISSUANCE',
        type: 'date',
        required: true,
        step: 'customize'
      },
      {
        key: 'signatory_1',
        label: 'PRIMARY SIGNATORY (DEAN / REGISTRAR)',
        type: 'text',
        required: false,
        placeholder: 'e.g. Dr. R. Menon (Registrar)',
        step: 'customize'
      },
      {
        key: 'signatory_2',
        label: 'SECONDARY SIGNATORY (VICE CHANCELLOR)',
        type: 'text',
        required: false,
        placeholder: 'e.g. Prof. K. S. Ramanathan (Vice Chancellor)',
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Aarav Sharma',
      certificate_number: 'MIT-ENG-2026-084',
      course: 'Bachelor of Technology in Computer Science & AI',
      department: 'Department of Electrical & Computer Engineering',
      grade: 'First Class with Distinction (9.4 CGPA)',
      start_date: '2022-08-01',
      completion_date: '2026-05-30',
      issue_date: '2026-06-15',
      signatory_1: 'Dr. R. Menon (Registrar)',
      signatory_2: 'Prof. K. S. Ramanathan (Vice Chancellor)'
    }
  },

  // 2. OFFICIAL MARKSHEET / TRANSCRIPT
  {
    id: 'tpl_marksheet',
    name: 'Official Marksheet / Transcript',
    category: 'ACADEMIC RECORDS',
    description: 'Comprehensive subject-level marksheet with credit distribution, SGPA, CGPA and examination result.',
    layoutVariant: 'portrait',
    accentPalette: {
      primary: '#1E293B',     // Slate Grey
      secondary: '#DC2626',   // Stamp Red
      background: '#FFFFFF',  // Clean White
      text: '#0F172A',
      presets: ['#1E293B', '#1E3A8A', '#065F46', '#7C2D12', '#374151']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'STUDENT FULL NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Priya Patel',
        step: 'recipient',
        validation: { min: 2, max: 70 }
      },
      {
        key: 'certificate_number',
        label: 'ROLL NUMBER',
        type: 'text',
        required: true,
        placeholder: 'e.g. 22CSB041',
        step: 'recipient'
      },
      {
        key: 'enrollment_no',
        label: 'ENROLLMENT ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. EN-2022-8819',
        step: 'recipient'
      },
      {
        key: 'course',
        label: 'ACADEMIC PROGRAM',
        type: 'text',
        required: true,
        placeholder: 'e.g. B.Tech Computer Engineering',
        step: 'recipient'
      },
      {
        key: 'semester',
        label: 'SEMESTER / YEAR',
        type: 'select',
        required: true,
        step: 'recipient',
        options: [
          { label: 'Semester I', value: 'Semester I' },
          { label: 'Semester II', value: 'Semester II' },
          { label: 'Semester III', value: 'Semester III' },
          { label: 'Semester IV', value: 'Semester IV' },
          { label: 'Semester V', value: 'Semester V' },
          { label: 'Semester VI', value: 'Semester VI' },
          { label: 'Semester VII', value: 'Semester VII' },
          { label: 'Semester VIII', value: 'Semester VIII' }
        ]
      },
      {
        key: 'exam_session',
        label: 'EXAMINATION SESSION',
        type: 'text',
        required: true,
        placeholder: 'e.g. May–June 2026',
        step: 'recipient'
      },
      {
        key: 'subjects_table',
        label: 'SUBJECT GRADES & CREDITS',
        type: 'table',
        required: true,
        step: 'recipient',
        columns: [
          { key: 'code', label: 'Code', type: 'text' },
          { key: 'name', label: 'Subject Name', type: 'text' },
          { key: 'credits', label: 'Credits', type: 'number' },
          { key: 'internal', label: 'Internal', type: 'number' },
          { key: 'external', label: 'External', type: 'number' },
          { key: 'total', label: 'Total', type: 'number' },
          { key: 'grade', label: 'Grade', type: 'text' }
        ]
      },
      {
        key: 'sgpa',
        label: 'SEMESTER GPA (SGPA)',
        type: 'text',
        required: true,
        placeholder: 'e.g. 9.18',
        step: 'customize'
      },
      {
        key: 'cgpa',
        label: 'CUMULATIVE GPA (CGPA)',
        type: 'text',
        required: true,
        placeholder: 'e.g. 9.04',
        step: 'customize'
      },
      {
        key: 'result_status',
        label: 'FINAL RESULT STATUS',
        type: 'select',
        required: true,
        step: 'customize',
        options: [
          { label: 'PASS - FIRST CLASS WITH DISTINCTION', value: 'PASS - DISTINCTION' },
          { label: 'PASS - FIRST CLASS', value: 'PASS - FIRST CLASS' },
          { label: 'PASS - SECOND CLASS', value: 'PASS - SECOND CLASS' },
          { label: 'ATKT / PROVISIONAL', value: 'PROVISIONAL - ATKT' },
          { label: 'FAIL', value: 'FAIL' }
        ]
      },
      {
        key: 'controller_of_exams',
        label: 'CONTROLLER OF EXAMINATIONS',
        type: 'text',
        required: false,
        placeholder: 'e.g. Dr. H. L. Deshmukh',
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'MARKSHEET ISSUED ON',
        type: 'date',
        required: true,
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Priya Patel',
      certificate_number: '22CSB041',
      enrollment_no: 'EN-2022-8819',
      course: 'B.Tech Computer Science & Engineering',
      semester: 'Semester VIII',
      exam_session: 'May–June 2026',
      subjects_table: [
        { code: 'CS801', name: 'Distributed Consensus Systems', credits: 4, internal: 28, external: 67, total: 95, grade: 'O' },
        { code: 'CS802', name: 'Applied Cryptography & Zero-Knowledge', credits: 4, internal: 29, external: 64, total: 93, grade: 'O' },
        { code: 'CS803', name: 'Machine Learning Infrastructure', credits: 3, internal: 27, external: 61, total: 88, grade: 'A+' },
        { code: 'CS804', name: 'Cloud Native Microservices', credits: 3, internal: 26, external: 60, total: 86, grade: 'A+' },
        { code: 'CS899', name: 'Major Capstone Project', credits: 6, internal: 48, external: 98, total: 146, grade: 'O' }
      ],
      sgpa: '9.42',
      cgpa: '9.18',
      result_status: 'PASS - DISTINCTION',
      controller_of_exams: 'Dr. H. L. Deshmukh, Controller of Examinations',
      issue_date: '2026-06-20'
    }
  },

  // 3. BONAFIDE CERTIFICATE
  {
    id: 'tpl_bonafide',
    name: 'Bonafide Student Certificate',
    category: 'INSTITUTIONAL LETTERS',
    description: 'Official letterhead certifying active enrollment and bonafide status for passport, visa, or banking.',
    layoutVariant: 'portrait',
    accentPalette: {
      primary: '#0F766E',     // Deep Teal
      secondary: '#0D9488',
      background: '#FAFAFA',
      text: '#134E4A',
      presets: ['#0F766E', '#1E3A8A', '#374151', '#7C2D12', '#4338CA']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'STUDENT NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Rohan Verma',
        step: 'recipient'
      },
      {
        key: 'guardian_name',
        label: "FATHER / GUARDIAN'S NAME",
        type: 'text',
        required: true,
        placeholder: 'e.g. Mr. Anil Verma',
        step: 'recipient'
      },
      {
        key: 'certificate_number',
        label: 'ROLL / REGISTRATION NUMBER',
        type: 'text',
        required: true,
        placeholder: 'e.g. BON-2026-5512',
        step: 'recipient'
      },
      {
        key: 'course',
        label: 'PROGRAM OF STUDY',
        type: 'text',
        required: true,
        placeholder: 'e.g. Master of Science in Data Analytics',
        step: 'recipient'
      },
      {
        key: 'academic_year',
        label: 'CURRENT YEAR / SEMESTER',
        type: 'text',
        required: true,
        placeholder: 'e.g. 2nd Year (Semester IV)',
        step: 'recipient'
      },
      {
        key: 'academic_session',
        label: 'ACADEMIC SESSION',
        type: 'text',
        required: true,
        placeholder: 'e.g. 2025–2026',
        step: 'recipient'
      },
      {
        key: 'purpose',
        label: 'PURPOSE OF CERTIFICATE',
        type: 'select',
        required: true,
        step: 'customize',
        options: [
          { label: 'Passport Application & Police Verification', value: 'Passport Application' },
          { label: 'Embassy Student Visa Formalities', value: 'Student Visa Application' },
          { label: 'Bank Education Loan Documentation', value: 'Bank Education Loan' },
          { label: 'Government State Scholarship', value: 'State Scholarship Scheme' },
          { label: 'Public Transit Student Pass', value: 'Transit Concession Pass' },
          { label: 'Other Official Purpose', value: 'Official Verification' }
        ]
      },
      {
        key: 'conduct_remark',
        label: 'CHARACTER & CONDUCT REMARK',
        type: 'text',
        required: false,
        placeholder: 'e.g. Good and exemplary to the best of our knowledge',
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'ISSUE DATE',
        type: 'date',
        required: true,
        step: 'customize'
      },
      {
        key: 'principal_sign',
        label: 'HEAD OF INSTITUTION / PRINCIPAL',
        type: 'text',
        required: false,
        placeholder: 'e.g. Dr. Sunita K. Rao (Dean of Student Welfare)',
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Rohan Verma',
      guardian_name: 'Mr. Anil Verma',
      certificate_number: 'BON-2026-5512',
      course: 'Master of Science in Data Analytics',
      academic_year: 'Final Year (Semester IV)',
      academic_session: '2025–2026',
      purpose: 'Passport Application',
      conduct_remark: 'Satisfactory and obedient with good moral conduct',
      issue_date: '2026-10-10',
      principal_sign: 'Dr. Sunita K. Rao (Dean of Student Welfare)'
    }
  },

  // 4. HACKATHON PARTICIPATION
  {
    id: 'tpl_hack_part',
    name: 'Hackathon Participation Certificate',
    category: 'EVENTS & HACKATHONS',
    description: 'Dynamic cyberpunk tech aesthetic certificate honoring hackathon contenders and engineering builders.',
    layoutVariant: 'landscape',
    accentPalette: {
      primary: '#06B6D4',     // Neon Cyan
      secondary: '#8B5CF6',   // Electric Violet
      background: '#0B0F19',  // Deep Near-Black
      text: '#F3F4F6',
      presets: ['#06B6D4', '#10B981', '#EC4899', '#F59E0B', '#3B82F6']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'PARTICIPANT NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Vikram Malhotra',
        step: 'recipient'
      },
      {
        key: 'team_name',
        label: 'TEAM NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. ByteForge Syndicate',
        step: 'recipient'
      },
      {
        key: 'certificate_number',
        label: 'HACKATHON BADGE ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. HACK-2026-TX91',
        step: 'recipient'
      },
      {
        key: 'hackathon_name',
        label: 'HACKATHON TITLE',
        type: 'text',
        required: true,
        placeholder: 'e.g. DevHacks Global 2026',
        step: 'recipient'
      },
      {
        key: 'theme_track',
        label: 'THEME / TRACK',
        type: 'text',
        required: true,
        placeholder: 'e.g. Web3 Security & Agentic AI Systems',
        step: 'recipient'
      },
      {
        key: 'mode',
        label: 'EVENT MODE',
        type: 'select',
        required: true,
        step: 'customize',
        options: [
          { label: 'In-Person 36h Onsite', value: '36-Hour Onsite Sprint' },
          { label: 'Hybrid Grand Finale', value: 'Hybrid Hackathon' },
          { label: 'Global Online Sprint', value: 'Global Virtual Sprint' }
        ]
      },
      {
        key: 'venue',
        label: 'VENUE / HOST CAMPUS',
        type: 'text',
        required: false,
        placeholder: 'e.g. Tech Innovation Arena, Bengaluru',
        step: 'customize'
      },
      {
        key: 'event_dates',
        label: 'EVENT DATES',
        type: 'text',
        required: true,
        placeholder: 'e.g. October 8–10, 2026',
        step: 'customize'
      },
      {
        key: 'lead_organizer',
        label: 'LEAD ORGANIZER / MENTOR',
        type: 'text',
        required: false,
        placeholder: 'e.g. Siddharth Sengupta, Head of Community',
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'AWARDED ON',
        type: 'date',
        required: true,
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Vikram Malhotra',
      team_name: 'ByteForge Syndicate',
      certificate_number: 'HACK-2026-TX91',
      hackathon_name: 'ETHGlobal Nexus 2026',
      theme_track: 'Autonomous Agentic Systems & Cryptographic Proofs',
      mode: '36-Hour Onsite Sprint',
      venue: 'Innovation Hub, Karnataka',
      event_dates: 'October 8–10, 2026',
      lead_organizer: 'Siddharth Sengupta (Lead Hackathon Director)',
      issue_date: '2026-10-10'
    }
  },

  // 5. HACKATHON WINNER & EXCELLENCE
  {
    id: 'tpl_hack_win',
    name: 'Hackathon Winner & Prestige Award',
    category: 'EVENTS & HACKATHONS',
    description: 'Elite gold-plated prestigious honor certificate for hackathon champions, runners-up and track winners.',
    layoutVariant: 'landscape',
    accentPalette: {
      primary: '#F59E0B',     // Champion Gold
      secondary: '#D97706',
      background: '#090D16',  // Deep Obsidian
      text: '#FDF6B2',
      presets: ['#F59E0B', '#94A3B8', '#D97706', '#10B981', '#A855F7']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'WINNER NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Ananya Sen',
        step: 'recipient'
      },
      {
        key: 'team_name',
        label: 'WINNING SQUAD / TEAM',
        type: 'text',
        required: true,
        placeholder: 'e.g. Team Hyperion Alpha',
        step: 'recipient'
      },
      {
        key: 'certificate_number',
        label: 'AWARD REGISTRATION ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. WIN-2026-1ST-009',
        step: 'recipient'
      },
      {
        key: 'rank_position',
        label: 'AWARD RANK / TITLE',
        type: 'select',
        required: true,
        step: 'recipient',
        options: [
          { label: '🏆 GRAND CHAMPION (1ST PLACE)', value: '1ST PLACE GRAND CHAMPION' },
          { label: '🥈 1ST RUNNER UP (2ND PLACE)', value: '2ND PLACE RUNNER UP' },
          { label: '🥉 2ND RUNNER UP (3RD PLACE)', value: '3RD PLACE PODIUM' },
          { label: '⭐ BEST INNOVATION IN AI AWARD', value: 'TRACK WINNER - AI INNOVATION' },
          { label: '⚡ BEST CRYPTOGRAPHY & PRIVACY', value: 'TRACK WINNER - ZERO KNOWLEDGE' }
        ]
      },
      {
        key: 'hackathon_name',
        label: 'HACKATHON ARENA',
        type: 'text',
        required: true,
        placeholder: 'e.g. National Builders Conclave 2026',
        step: 'recipient'
      },
      {
        key: 'project_title',
        label: 'WINNING PROJECT TITLE',
        type: 'text',
        required: true,
        placeholder: 'e.g. Evidentia: Realtime Decentralized Document Trust Mesh',
        step: 'recipient'
      },
      {
        key: 'prize_amount',
        label: 'CASH PRIZE / GRANT PURSE',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹ 2,50,000 INR Cash Purse + Cloud Credits',
        step: 'customize'
      },
      {
        key: 'judges_remark',
        label: "JURY'S COMMENDATION",
        type: 'textarea',
        required: false,
        placeholder: 'e.g. Recognized for outstanding architectural depth and fault-tolerant cryptographic engineering.',
        step: 'customize'
      },
      {
        key: 'jury_chair',
        label: 'HEAD OF JURY / CHIEF GUEST',
        type: 'text',
        required: false,
        placeholder: 'e.g. Dr. A. V. Natarajan, Chief Scientist',
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'CEREMONY DATE',
        type: 'date',
        required: true,
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Ananya Sen',
      team_name: 'Team Hyperion Alpha',
      certificate_number: 'WIN-2026-1ST-009',
      rank_position: '1ST PLACE GRAND CHAMPION',
      hackathon_name: 'National Builders Conclave 2026',
      project_title: 'Evidentia: Realtime Multi-Modal Verification Protocol',
      prize_amount: '₹ 3,00,000 Cash Purse + Incubation Grant',
      judges_remark: 'Awarded unconditionally for breakthrough real-time forensic integrity algorithms.',
      jury_chair: 'Dr. A. V. Natarajan, Fellow at Indian Academy of Sciences',
      issue_date: '2026-10-10'
    }
  },

  // 6. WORKSHOP & BOOTCAMP COMPLETION
  {
    id: 'tpl_workshop',
    name: 'Workshop & Bootcamp Completion',
    category: 'SKILLS & TRAINING',
    description: 'Friendly, modern skill certification with covered competencies tags and completed training hours.',
    layoutVariant: 'landscape',
    accentPalette: {
      primary: '#0D9488',     // Teal
      secondary: '#F43F5E',   // Coral Pink
      background: '#FDFBF7',  // Soft Warm
      text: '#134E4A',
      presets: ['#0D9488', '#2563EB', '#D97706', '#7C3AED', '#059669']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'TRAINEE / LEARNER NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Kabir Das',
        step: 'recipient'
      },
      {
        key: 'workshop_title',
        label: 'WORKSHOP / BOOTCAMP TITLE',
        type: 'text',
        required: true,
        placeholder: 'e.g. Production Rust & Low-Latency Systems',
        step: 'recipient'
      },
      {
        key: 'certificate_number',
        label: 'COMPLETION ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. BOOT-2026-RUST-441',
        step: 'recipient'
      },
      {
        key: 'skills_covered',
        label: 'CORE COMPETENCIES & SKILLS COVERED (COMMA-SEPARATED)',
        type: 'list',
        required: true,
        placeholder: 'e.g. Async Tokio, Memory Lifetimes, SIMD, Cryptographic Hashing',
        step: 'recipient'
      },
      {
        key: 'duration_hours',
        label: 'INTENSIVE HOURS COMPLETED',
        type: 'number',
        required: true,
        placeholder: 'e.g. 48',
        step: 'recipient'
      },
      {
        key: 'mode',
        label: 'LEARNING DELIVERY MODE',
        type: 'select',
        required: true,
        step: 'customize',
        options: [
          { label: 'Interactive Live Hands-on Cohort', value: 'Live Interactive Cohort' },
          { label: 'Weekend Intensive Bootcamp', value: 'Weekend Intensive' },
          { label: 'Executive Masterclass', value: 'Executive Masterclass' }
        ]
      },
      {
        key: 'lead_instructor',
        label: 'LEAD INSTRUCTOR / MENTOR',
        type: 'text',
        required: true,
        placeholder: 'e.g. Tanmay Agarwal, Staff Infrastructure Engineer',
        step: 'customize'
      },
      {
        key: 'score_achieved',
        label: 'CAPSTONE ASSESSMENT SCORE',
        type: 'text',
        required: false,
        placeholder: 'e.g. 96% (Distinction in System Benchmark)',
        step: 'customize'
      },
      {
        key: 'start_date',
        label: 'START DATE',
        type: 'date',
        required: false,
        step: 'customize'
      },
      {
        key: 'end_date',
        label: 'COMPLETION DATE',
        type: 'date',
        required: false,
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'CREDENTIAL ISSUED ON',
        type: 'date',
        required: true,
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Kabir Das',
      workshop_title: 'Advanced Full-Stack Rust & High-Concurrency Systems',
      certificate_number: 'BOOT-2026-RUST-441',
      skills_covered: ['Async Tokio Engine', 'Memory Safety & Lifetimes', 'WASM Compilation', 'Zero-Copy Serialization', 'Micro-benchmarking'],
      duration_hours: 48,
      mode: 'Live Interactive Cohort',
      lead_instructor: 'Tanmay Agarwal, Principal Architect',
      score_achieved: '98% Top Decile Capstone Score',
      start_date: '2026-09-01',
      end_date: '2026-10-05',
      issue_date: '2026-10-10'
    }
  },

  // 7. INTERNSHIP COMPLETION
  {
    id: 'tpl_internship',
    name: 'Corporate Internship Experience Certificate',
    category: 'EMPLOYMENT & INTERNSHIPS',
    description: 'Corporate certification with role timeline bar, key projects deliverables, and supervisor performance rating.',
    layoutVariant: 'portrait',
    accentPalette: {
      primary: '#1E40AF',     // Corporate Indigo
      secondary: '#F59E0B',   // Star Gold
      background: '#FFFFFF',
      text: '#1E293B',
      presets: ['#1E40AF', '#0F766E', '#18181B', '#B45309', '#4338CA']
    },
    fields: [
      {
        key: 'recipient_name',
        label: 'INTERN FULL NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Shreya Nambiar',
        step: 'recipient'
      },
      {
        key: 'role',
        label: 'INTERN ROLE / DESIGNATION',
        type: 'text',
        required: true,
        placeholder: 'e.g. Software Engineering Intern',
        step: 'recipient'
      },
      {
        key: 'department',
        label: 'DIVISION / DEPARTMENT',
        type: 'text',
        required: true,
        placeholder: 'e.g. Platform Security & Infrastructure',
        step: 'recipient'
      },
      {
        key: 'certificate_number',
        label: 'EMPLOYEE / INTERN REF ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. INT-2026-CORP-721',
        step: 'recipient'
      },
      {
        key: 'start_date',
        label: 'INTERNSHIP COMMENCEMENT DATE',
        type: 'date',
        required: true,
        step: 'recipient'
      },
      {
        key: 'end_date',
        label: 'INTERNSHIP CONCLUSION DATE',
        type: 'date',
        required: true,
        step: 'recipient'
      },
      {
        key: 'projects_delivered',
        label: 'KEY PROJECTS & DELIVERABLES (COMMA-SEPARATED)',
        type: 'list',
        required: true,
        placeholder: 'e.g. Multi-Tenant Key Vault, Automated Forensics Pipeline, SDK v2',
        step: 'customize'
      },
      {
        key: 'rating',
        label: 'SUPERVISOR PERFORMANCE RATING',
        type: 'select',
        required: true,
        step: 'customize',
        options: [
          { label: '★★★★★ Outstanding (Exceeded All Milestones)', value: '5 Stars - Outstanding Performance' },
          { label: '★★★★☆ Exceeds Expectations', value: '4 Stars - Exceeded Expectations' },
          { label: '★★★☆☆ Successfully Met Standards', value: '3 Stars - Satisfactory' }
        ]
      },
      {
        key: 'supervisor_name',
        label: 'SUPERVISOR NAME',
        type: 'text',
        required: true,
        placeholder: 'e.g. Arvind Swaminathan',
        step: 'customize'
      },
      {
        key: 'supervisor_title',
        label: 'SUPERVISOR DESIGNATION',
        type: 'text',
        required: true,
        placeholder: 'e.g. VP of Engineering',
        step: 'customize'
      },
      {
        key: 'conduct_remark',
        label: 'EXPERIENCE & CONDUCT STATEMENT',
        type: 'text',
        required: false,
        placeholder: 'e.g. Showed exemplary technical initiative and strong team ethics throughout.',
        step: 'customize'
      },
      {
        key: 'issue_date',
        label: 'ISSUANCE DATE',
        type: 'date',
        required: true,
        step: 'customize'
      }
    ],
    samplePreviewData: {
      recipient_name: 'Shreya Nambiar',
      role: 'Software Engineering Intern — Core Systems',
      department: 'Infrastructure & Forensic Security Engineering',
      certificate_number: 'INT-2026-CORP-721',
      start_date: '2026-04-01',
      end_date: '2026-09-30',
      projects_delivered: [
        'Built deterministic ECDSA signing microservice in Node.js',
        'Implemented OpenCV SSIM diff checks with 40% memory reduction',
        'Authored SDK test kits with 100% automated test coverage'
      ],
      rating: '5 Stars - Outstanding Performance',
      supervisor_name: 'Arvind Swaminathan',
      supervisor_title: 'VP of Engineering, Core Cloud',
      conduct_remark: 'Demonstrated high technical autonomy and exceptional work ethics.',
      issue_date: '2026-10-01'
    }
  }
];

export function getTemplateById(id) {
  return TEMPLATE_REGISTRY.find(t => t.id === id) || TEMPLATE_REGISTRY[0];
}
