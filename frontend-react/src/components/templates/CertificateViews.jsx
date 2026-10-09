import React from 'react';
import { BrandHero, SecurityFooter } from './CertificateElements';
import { Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

// ==============================================================
// 1. STANDARD ACADEMIC CERTIFICATE (Landscape)
// ==============================================================
export function AcademicCertificateView({ data, brand, isSigned }) {
  const recipient = data.recipient_name || data.name || 'Aarav Sharma';
  const certId = data.certificate_number || 'MIT-ENG-2026-084';
  const course = data.course || 'Bachelor of Technology in Computer Science';
  const department = data.department || 'Department of Electrical & Computer Engineering';
  const grade = data.grade || 'First Class with Distinction (9.4 CGPA)';
  const issueDate = data.issue_date || '2026-06-15';
  const sig1 = data.signatory_1 || 'Dr. R. Menon (Registrar)';
  const sig2 = data.signatory_2 || 'Prof. K. S. Ramanathan (Vice Chancellor)';

  return (
    <div className="relative w-full aspect-[1.414/1] bg-[#FDFBF7] text-[#1B2437] p-8 sm:p-10 flex flex-col justify-between border-[6px] border-[#0A1F44] select-none shadow-lg overflow-hidden font-serif">
      {/* Ornate Gold Inner Inset Border */}
      <div className="absolute inset-2 border-[1.5px] border-[#C9A227] pointer-events-none" />
      <div className="absolute inset-3 border-[0.5px] border-[#C9A227]/40 pointer-events-none" />

      {/* Guilloche Corner Accents */}
      <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-[#C9A227]" />
      <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-[#C9A227]" />
      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-[#C9A227]" />
      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-[#C9A227]" />

      {/* Watermark Initial */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] text-[180px] font-bold text-[#0A1F44]">
        {brand.monogram}
      </div>

      {/* Header */}
      <div className="relative text-center space-y-1 pt-1">
        <BrandHero brand={brand} align="center" size="lg" />
        <div className="w-48 h-px bg-[#C9A227] mx-auto mt-2" />
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#C9A227] font-bold pt-1">
          CERTIFICATE OF DEGREE CONFERRAL
        </p>
      </div>

      {/* Narrative Body */}
      <div className="relative text-center my-auto space-y-2 py-2">
        <p className="text-[11px] italic text-slate-600 font-sans">This is to certify that</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0A1F44] px-4">
          {recipient}
        </h1>
        <div className="w-36 h-0.5 bg-[#C9A227]/50 mx-auto" />
        <p className="text-[11px] text-slate-700 max-w-lg mx-auto font-sans leading-relaxed">
          having successfully fulfilled all academic requirements and regulations has been conferred the degree of
        </p>
        <p className="font-display text-base sm:text-lg font-bold text-[#0A1F44]">
          {course}
        </p>
        {department && <p className="text-[10px] text-slate-600 font-sans">{department}</p>}
        {grade && (
          <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-[#0A1F44]/5 border border-[#C9A227]/40 text-[#0A1F44] font-mono text-[10px] font-bold">
            {grade}
          </div>
        )}
      </div>

      {/* Attestation & Signatures */}
      <div className="relative grid grid-cols-3 items-end pt-3 text-center text-[9px] font-sans text-slate-700">
        <div>
          <div className="w-28 h-px bg-slate-400 mx-auto mb-1" />
          <p className="font-bold text-[#0A1F44]">{sig1}</p>
          <p className="text-[8px] text-slate-500">Authorized Signatory</p>
        </div>

        {/* Embossed Seal Emblem */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full border-2 border-[#C9A227] bg-[#FDFBF7] shadow-inner flex flex-col items-center justify-center text-[#C9A227]">
            <Award size={18} />
            <span className="font-mono text-[6px] tracking-wider font-bold">OFFICIAL</span>
          </div>
        </div>

        <div>
          <div className="w-28 h-px bg-slate-400 mx-auto mb-1" />
          <p className="font-bold text-[#0A1F44]">{sig2}</p>
          <p className="text-[8px] text-slate-500">Vice Chancellor</p>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} />
    </div>
  );
}

// ==============================================================
// 2. OFFICIAL MARKSHEET / TRANSCRIPT (Portrait)
// ==============================================================
export function MarksheetView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Priya Patel';
  const certId = data.certificate_number || '22CSB041';
  const enrollmentNo = data.enrollment_no || 'EN-2022-8819';
  const course = data.course || 'B.Tech Computer Science & Engineering';
  const semester = data.semester || 'Semester VIII';
  const session = data.exam_session || 'May–June 2026';
  const subjects = Array.isArray(data.subjects_table) ? data.subjects_table : [
    { code: 'CS801', name: 'Distributed Consensus Systems', credits: 4, internal: 28, external: 67, total: 95, grade: 'O' },
    { code: 'CS802', name: 'Applied Cryptography & ZK', credits: 4, internal: 29, external: 64, total: 93, grade: 'O' },
    { code: 'CS803', name: 'Machine Learning Infrastructure', credits: 3, internal: 27, external: 61, total: 88, grade: 'A+' },
    { code: 'CS804', name: 'Cloud Native Microservices', credits: 3, internal: 26, external: 60, total: 86, grade: 'A+' },
    { code: 'CS899', name: 'Major Capstone Project', credits: 6, internal: 48, external: 98, total: 146, grade: 'O' }
  ];
  const sgpa = data.sgpa || '9.42';
  const cgpa = data.cgpa || '9.18';
  const result = data.result_status || 'PASS - DISTINCTION';
  const issueDate = data.issue_date || '2026-06-20';

  return (
    <div className="relative w-full aspect-[1/1.414] bg-white text-slate-900 p-6 sm:p-8 flex flex-col justify-between border-2 border-slate-300 select-none shadow-md text-xs font-sans">
      {/* Header Band */}
      <div className="border-b-2 border-slate-900 pb-3">
        <BrandHero brand={brand} align="left" size="md" />
        <div className="mt-2 flex items-center justify-between text-[9px] font-mono bg-slate-100 p-1.5 border border-slate-200">
          <span className="font-bold text-slate-800">OFFICIAL STATEMENT OF GRADES & CUMULATIVE TRANSCRIPT</span>
          <span className="text-slate-500">EXAM SESSION: {session}</span>
        </div>
      </div>

      {/* Student Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono bg-slate-50 p-2.5 border border-slate-200 mt-2">
        <div><span className="text-slate-500">CANDIDATE:</span> <strong className="text-slate-900">{recipient}</strong></div>
        <div><span className="text-slate-500">ROLL NO:</span> <strong className="text-slate-900">{certId}</strong></div>
        <div><span className="text-slate-500">ENROLLMENT ID:</span> <strong>{enrollmentNo}</strong></div>
        <div><span className="text-slate-500">PROGRAM:</span> <strong>{course}</strong></div>
        <div><span className="text-slate-500">SEMESTER:</span> <strong>{semester}</strong></div>
        <div><span className="text-slate-500">STATUS:</span> <strong className="text-emerald-700">{result}</strong></div>
      </div>

      {/* High-Density Subject Table */}
      <div className="my-3 border border-slate-300 overflow-hidden">
        <table className="w-full text-left font-mono text-[8px] border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-1.5">CODE</th>
              <th className="p-1.5">COURSE TITLE</th>
              <th className="p-1.5 text-center">CR</th>
              <th className="p-1.5 text-center">INT</th>
              <th className="p-1.5 text-center">EXT</th>
              <th className="p-1.5 text-center">TOT</th>
              <th className="p-1.5 text-center">GRD</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-1.5 font-bold border-b border-slate-200">{s.code}</td>
                <td className="p-1.5 border-b border-slate-200 truncate max-w-[140px]">{s.name}</td>
                <td className="p-1.5 text-center border-b border-slate-200">{s.credits}</td>
                <td className="p-1.5 text-center border-b border-slate-200">{s.internal}</td>
                <td className="p-1.5 text-center border-b border-slate-200">{s.external}</td>
                <td className="p-1.5 text-center font-bold border-b border-slate-200">{s.total}</td>
                <td className="p-1.5 text-center font-bold text-blue-700 border-b border-slate-200">{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Scorecard & Stamp */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 font-mono text-[9px]">
        <div className="flex items-center gap-4">
          <div><span className="text-slate-500">SEMESTER SGPA:</span> <strong className="text-base text-slate-900 ml-1">{sgpa}</strong></div>
          <div className="border-l border-slate-300 pl-4"><span className="text-slate-500">CUMULATIVE CGPA:</span> <strong className="text-base text-emerald-700 ml-1">{cgpa}</strong></div>
        </div>

        {/* Circular Stamp */}
        <div className="w-12 h-12 rounded-full border-2 border-rose-600 text-rose-600 flex flex-col items-center justify-center rotate-[-12deg] font-bold text-[6px]">
          <span>VERIFIED</span>
          <span>EXAM BR</span>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} />
    </div>
  );
}

// ==============================================================
// 3. BONAFIDE CERTIFICATE (Portrait Letterhead)
// ==============================================================
export function BonafideCertificateView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Rohan Verma';
  const guardian = data.guardian_name || 'Mr. Anil Verma';
  const certId = data.certificate_number || 'BON-2026-5512';
  const course = data.course || 'Master of Science in Data Analytics';
  const year = data.academic_year || 'Final Year (Semester IV)';
  const session = data.academic_session || '2025–2026';
  const purpose = data.purpose || 'Passport Application';
  const remark = data.conduct_remark || 'Satisfactory and obedient with good moral conduct';
  const issueDate = data.issue_date || '2026-10-10';
  const sign = data.principal_sign || 'Dr. Sunita K. Rao (Dean of Student Welfare)';

  return (
    <div className="relative w-full aspect-[1/1.414] bg-[#FAFAFA] text-[#134E4A] p-8 flex flex-col justify-between border-t-8 border-[#0F766E] shadow-md select-none font-sans text-xs">
      {/* Official Letterhead */}
      <div className="border-b border-[#0F766E]/20 pb-4 text-center">
        <BrandHero brand={brand} align="center" size="md" />
      </div>

      {/* Ref Line & Date */}
      <div className="flex justify-between items-center font-mono text-[9px] text-slate-500 my-4">
        <span>REF NO: {certId}</span>
        <span>DATE: {issueDate}</span>
      </div>

      <div className="text-center my-2">
        <span className="font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1 bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/30 rounded-xs">
          BONAFIDE CERTIFICATE
        </span>
      </div>

      {/* Letter Body */}
      <div className="space-y-4 text-slate-800 leading-relaxed text-sm my-auto px-2 font-serif">
        <p className="italic text-slate-600 font-sans text-xs">To Whomsoever It May Concern,</p>
        <p className="text-justify indent-8">
          This is to certify that <strong className="text-slate-900 uppercase font-sans">{recipient}</strong>, son/daughter of <strong>{guardian}</strong>, bearing permanent roll number <strong>{certId}</strong>, is a bonafide student of this institution.
        </p>
        <p className="text-justify indent-8">
          He/She is currently pursuing <strong>{course}</strong> in the <strong>{year}</strong> during the academic session <strong>{session}</strong>.
        </p>
        <p className="text-justify indent-8">
          This certificate is formally issued upon the student's request for the specific purpose of <strong>{purpose}</strong>. To the best of our institutional knowledge, their conduct and character have been <em>{remark}</em>.
        </p>
      </div>

      {/* Signature Block */}
      <div className="flex justify-end pt-6">
        <div className="text-center font-mono text-[9px]">
          <div className="w-36 h-px bg-slate-400 mb-1.5" />
          <p className="font-bold text-slate-900">{sign}</p>
          <p className="text-slate-500">Dean / Head of Institution</p>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} />
    </div>
  );
}

// ==============================================================
// 4. HACKATHON PARTICIPATION (Landscape Cyberpunk)
// ==============================================================
export function HackathonParticipationView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Vikram Malhotra';
  const team = data.team_name || 'ByteForge Syndicate';
  const certId = data.certificate_number || 'HACK-2026-TX91';
  const hackathon = data.hackathon_name || 'ETHGlobal Nexus 2026';
  const track = data.theme_track || 'Autonomous Agentic Systems & Cryptographic Proofs';
  const mode = data.mode || '36-Hour Onsite Sprint';
  const dates = data.event_dates || 'October 8–10, 2026';
  const organizer = data.lead_organizer || 'Siddharth Sengupta (Lead Director)';
  const issueDate = data.issue_date || '2026-10-10';

  return (
    <div className="relative w-full aspect-[1.414/1] bg-[#0B0F19] text-[#F3F4F6] p-8 flex flex-col justify-between border-2 border-[#06B6D4]/40 select-none shadow-2xl overflow-hidden font-mono text-xs">
      {/* Circuit Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#06B6D4_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

      {/* Cyber Neon Corner Accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#8B5CF6]/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#06B6D4]/30 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex justify-between items-start border-b border-white/10 pb-3">
        <BrandHero brand={brand} align="left" dark size="sm" />
        <div className="text-right">
          <span className="px-2.5 py-1 bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4] text-[9px] font-bold tracking-widest uppercase rounded-xs">
            PARTICIPANT BADGE
          </span>
          <p className="text-[8px] text-slate-400 mt-1">{mode}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative my-auto space-y-2 py-2">
        <p className="text-[9px] text-[#06B6D4] uppercase tracking-widest font-bold">CERTIFICATE OF CONTENDER PARTICIPATION</p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
          {recipient}
        </h1>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-400">SQUAD:</span>
          <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-white font-bold">{team}</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed max-w-xl font-sans pt-1">
          successfully hacked, built, and shipped functional code at <strong className="text-white">{hackathon}</strong> under the track: <span className="text-[#06B6D4]">{track}</span>.
        </p>
        <p className="text-[9px] text-slate-400">Dates: {dates}</p>
      </div>

      {/* Attestation & Organizer */}
      <div className="relative flex justify-between items-end border-t border-white/10 pt-3 text-[9px]">
        <div>
          <p className="text-slate-400">AUTHORIZED ORGANIZER</p>
          <p className="text-white font-bold">{organizer}</p>
        </div>
        <div className="text-right">
          <span className="text-[#8B5CF6] font-bold">VERIFIED HACKATHON HASH</span>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} dark />
    </div>
  );
}

// ==============================================================
// 5. HACKATHON WINNER & PRESTIGE AWARD (Landscape Gold)
// ==============================================================
export function HackathonWinnerView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Ananya Sen';
  const team = data.team_name || 'Team Hyperion Alpha';
  const certId = data.certificate_number || 'WIN-2026-1ST-009';
  const rank = data.rank_position || '1ST PLACE GRAND CHAMPION';
  const hackathon = data.hackathon_name || 'National Builders Conclave 2026';
  const project = data.project_title || 'Evidentia: Realtime Multi-Modal Verification Protocol';
  const prize = data.prize_amount || '₹ 3,00,000 Cash Purse + Incubation Grant';
  const remark = data.judges_remark || 'Awarded unconditionally for breakthrough real-time forensic integrity algorithms.';
  const chair = data.jury_chair || 'Dr. A. V. Natarajan, Fellow at Indian Academy of Sciences';
  const issueDate = data.issue_date || '2026-10-10';

  // Dynamic metallic tint depending on rank
  const isSecond = rank.includes('2ND');
  const isThird = rank.includes('3RD');
  const accentColor = isSecond ? '#CBD5E1' : isThird ? '#CD7F32' : '#F59E0B';

  return (
    <div className="relative w-full aspect-[1.414/1] bg-[#090D16] text-[#FDF6B2] p-8 flex flex-col justify-between border-[3px] border-[#F59E0B]/60 select-none shadow-2xl overflow-hidden font-serif">
      {/* Metallic Gold Glow & Dust */}
      <div className="absolute inset-0 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex justify-between items-center border-b border-[#F59E0B]/20 pb-3">
        <BrandHero brand={brand} align="left" dark size="md" />
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-[9px] font-bold tracking-widest uppercase">
            <Trophy size={12} className="text-amber-400" />
            {rank}
          </div>
        </div>
      </div>

      {/* Main Commendation */}
      <div className="relative my-auto space-y-2 py-1 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#F59E0B]">PRESTIGIOUS MERIT AWARD</p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {recipient}
        </h1>
        <p className="font-mono text-[10px] text-amber-200">SQUAD: {team}</p>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />
        <p className="text-[11px] text-slate-300 max-w-lg mx-auto font-sans leading-relaxed">
          Awarded for outstanding engineering mastery and winning submission at <strong className="text-white">{hackathon}</strong> with the project:
        </p>
        <p className="font-display text-sm font-bold text-amber-300 italic">"{project}"</p>
        {prize && (
          <div className="inline-block px-3 py-0.5 bg-white/5 border border-amber-500/30 text-amber-300 font-mono text-[9px]">
            HONORARIUM: {prize}
          </div>
        )}
      </div>

      {/* Jury Remarks & Signature */}
      <div className="relative flex justify-between items-end border-t border-white/10 pt-3 text-[8px] font-mono text-slate-400">
        <div className="max-w-xs text-left">
          <span className="text-amber-400">JURY COMMENDATION:</span>
          <p className="italic text-slate-300 mt-0.5">"{remark}"</p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold">{chair}</p>
          <p className="text-slate-400">Head of Jury</p>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} dark />
    </div>
  );
}

// ==============================================================
// 6. WORKSHOP & BOOTCAMP COMPLETION (Landscape Modern Warm)
// ==============================================================
export function WorkshopBootcampView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Kabir Das';
  const title = data.workshop_title || 'Advanced Full-Stack Rust & High-Concurrency Systems';
  const certId = data.certificate_number || 'BOOT-2026-RUST-441';
  const skills = Array.isArray(data.skills_covered) ? data.skills_covered : [
    'Async Tokio Engine', 'Memory Safety & Lifetimes', 'WASM Compilation', 'Zero-Copy Serialization'
  ];
  const hours = data.duration_hours || 48;
  const instructor = data.lead_instructor || 'Tanmay Agarwal, Principal Architect';
  const score = data.score_achieved || '98% Top Decile Capstone Score';
  const issueDate = data.issue_date || '2026-10-10';

  return (
    <div className="relative w-full aspect-[1.414/1] bg-[#FDFBF7] text-[#134E4A] p-8 flex flex-col justify-between border-4 border-[#0D9488] select-none shadow-md overflow-hidden font-sans text-xs">
      {/* Decorative Pastel Corner Blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-[#0D9488]/10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-tr-full bg-[#F43F5E]/10 pointer-events-none" />

      {/* Header */}
      <div className="relative flex justify-between items-center border-b border-[#0D9488]/20 pb-3">
        <BrandHero brand={brand} align="left" size="sm" />
        <div className="w-12 h-12 rounded-full border-2 border-[#0D9488] bg-white flex flex-col items-center justify-center text-[#0D9488] font-mono text-[7px] font-bold shadow-xs">
          <span className="text-sm leading-none font-extrabold">{hours}h</span>
          <span>INTENSIVE</span>
        </div>
      </div>

      {/* Title & Body */}
      <div className="relative my-auto space-y-2 py-2">
        <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-[#F43F5E] bg-[#F43F5E]/10 px-2 py-0.5 rounded-full">
          PROFESSIONAL SKILL CERTIFICATION
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
          {recipient}
        </h1>
        <p className="text-slate-600 text-xs">
          has successfully completed the intensive hands-on bootcamp:
        </p>
        <p className="font-display text-base sm:text-lg font-bold text-[#0D9488] border-b-2 border-[#0D9488]/30 pb-1 inline-block">
          {title}
        </p>

        {/* Competencies Chips */}
        <div className="pt-2">
          <p className="font-mono text-[8px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">VERIFIED CORE COMPETENCIES:</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-white border border-[#0D9488]/40 text-[#0D9488] font-mono text-[8px] font-bold shadow-2xs">
                ✓ {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Instructor Sign */}
      <div className="relative flex justify-between items-end border-t border-[#0D9488]/20 pt-3 text-[9px] font-mono">
        <div>
          <span className="text-slate-500">ACADEMIC EVALUATION:</span>
          <p className="font-bold text-slate-900">{score}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">{instructor}</p>
          <p className="text-slate-500">Lead Instructor</p>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} />
    </div>
  );
}

// ==============================================================
// 7. CORPORATE INTERNSHIP (Portrait Executive)
// ==============================================================
export function InternshipCertificateView({ data, brand }) {
  const recipient = data.recipient_name || data.name || 'Shreya Nambiar';
  const role = data.role || 'Software Engineering Intern — Core Systems';
  const dept = data.department || 'Platform Security & Infrastructure';
  const certId = data.certificate_number || 'INT-2026-CORP-721';
  const startDate = data.start_date || '2026-04-01';
  const endDate = data.end_date || '2026-09-30';
  const projects = Array.isArray(data.projects_delivered) ? data.projects_delivered : [
    'Built deterministic ECDSA signing microservice in Node.js',
    'Implemented OpenCV SSIM diff checks with 40% memory reduction',
    'Authored SDK test kits with 100% automated test coverage'
  ];
  const rating = data.rating || '5 Stars - Outstanding Performance';
  const supervisor = data.supervisor_name || 'Arvind Swaminathan';
  const supervisorTitle = data.supervisor_title || 'VP of Engineering';
  const remark = data.conduct_remark || 'Demonstrated high technical autonomy and exceptional work ethics.';
  const issueDate = data.issue_date || '2026-10-01';

  return (
    <div className="relative w-full aspect-[1/1.414] bg-white text-slate-900 p-8 flex flex-col justify-between border-l-[12px] border-[#1E40AF] select-none shadow-md font-sans text-xs">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <BrandHero brand={brand} align="left" size="md" />
        <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span>CORPORATE INTERNSHIP EXPERIENCE RECORD</span>
          <span>EMP REF: {certId}</span>
        </div>
      </div>

      {/* Intern Details */}
      <div className="my-auto space-y-3 py-2">
        <p className="text-[10px] uppercase font-mono text-[#1E40AF] font-bold">EXPERIENCE & PERFORMANCE ATTESTATION</p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
          {recipient}
        </h1>
        <div className="bg-slate-50 border border-slate-200 p-2.5 space-y-1 font-mono text-[9px]">
          <div><span className="text-slate-500">ROLE:</span> <strong className="text-slate-900">{role}</strong></div>
          <div><span className="text-slate-500">DEPARTMENT:</span> <strong>{dept}</strong></div>
          <div><span className="text-slate-500">TENURE:</span> <strong>{startDate} &rarr; {endDate}</strong></div>
        </div>

        {/* Deliverables Scorecard */}
        <div className="space-y-1.5 pt-1">
          <p className="font-mono text-[9px] font-bold uppercase text-slate-700">KEY ENGINEERING DELIVERABLES & IMPACT:</p>
          <ul className="space-y-1 font-sans text-[11px] text-slate-700 list-disc list-inside">
            {projects.map((p, i) => (
              <li key={i} className="leading-snug">{p}</li>
            ))}
          </ul>
        </div>

        {/* Rating Block */}
        <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/20 p-2 text-center rounded-xs font-mono text-[10px]">
          <span className="text-slate-500">SUPERVISOR APPRAISAL:</span> <strong className="text-[#1E40AF] ml-1">★ {rating}</strong>
        </div>
        {remark && <p className="font-serif italic text-slate-600 text-xs">"{remark}"</p>}
      </div>

      {/* Supervisor Sign Block */}
      <div className="flex justify-between items-end border-t border-slate-200 pt-4 text-[9px] font-mono">
        <div>
          <span className="text-slate-500">ISSUED BY HR DIVISION</span>
          <p className="text-slate-800">Corporate People Operations</p>
        </div>
        <div className="text-right">
          <div className="w-32 h-px bg-slate-300 mb-1" />
          <p className="font-bold text-slate-900">{supervisor}</p>
          <p className="text-slate-500">{supervisorTitle}</p>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter docId={certId} issueDate={issueDate} />
    </div>
  );
}
