import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, CameraOff, FileUp, Hash, ScanLine, X, File, ShieldCheck, FileCheck } from 'lucide-react';
import jsQR from 'jsqr';
import api, { errMsg } from '../../api/axios';

const TABS = [
  { id: 'upload', label: 'UPLOAD', icon: FileUp },
  { id: 'scan', label: 'SCAN QR', icon: ScanLine },
  { id: 'id', label: 'ENTER ID', icon: Hash },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function VerifyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState('');
  const [job, setJob] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // Fake elapsed time for analysis state
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setMs(m => m + 47), 47);
    return () => clearInterval(t);
  }, [running]);

  const start = async (payloadFile, manualId) => {
    setError('');
    setRunning(true);
    setMs(0);
    try {
      const fd = new FormData();
      if (payloadFile) fd.append('file', payloadFile);
      if (manualId) fd.append('doc_id', manualId);
      const { data } = await api.post('/verify/start', fd);
      poll(data.job_id);
    } catch (e) {
      setError(errMsg(e));
      setRunning(false);
    }
  };

  const poll = async (jobId) => {
    for (let i = 0; i < 300; i++) {
      try {
        const { data } = await api.get(`/verify/jobs/${jobId}`);
        setJob(data);
        if (data.status === 'done') {
          // Add artificial delay so the user can enjoy the analysis console
          setTimeout(() => {
            setRunning(false);
            navigate(`/result/${jobId}`, { replace: true });
          }, 1500);
          return;
        }
        if (data.status === 'failed') {
          setError(data.error || 'Verification failed');
          setRunning(false);
          return;
        }
      } catch (e) {
        setError(errMsg(e));
        setRunning(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    setError('Verification timed out');
    setRunning(false);
  };

  const submit = (e) => {
    e.preventDefault();
    if (tab === 'upload') {
      if (!file) return setError('Choose a PDF, PNG or JPEG document first.');
      return start(file, null);
    }
    if (tab === 'id') {
      const id = docId.trim();
      if (!UUID_RE.test(id)) return setError('Invalid document ID (UUID format required).');
      if (!file) return setError('Please attach the file — an ID alone only proves a record exists.');
      return start(file, id);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (f.size > 5 * 1024 * 1024) return setError('File exceeds 5MB limit.');
      setFile(f);
      setError('');
    }
  };

  // --------------------------------------------------------
  // STATE 2: ANALYSIS CONSOLE
  // --------------------------------------------------------
  if (running) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 h-full flex flex-col relative z-10">
        <div className="mb-6">
          <span className="font-mono text-[10px] uppercase text-amber-600 tracking-wider">Analysis Console</span>
          <h1 className="font-display text-4xl text-ink">Executing Deterministic Verification</h1>
        </div>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* LEFT: Scan Frame */}
          <div className="lg:col-span-5 border border-line bg-surface rounded-sm relative flex flex-col overflow-hidden">
            <div className="h-8 border-b border-line bg-surface-2/50 flex items-center px-3 shrink-0">
              <span className="font-mono text-[9px] text-ink-muted">INSPECTING ARTIFACT</span>
            </div>
            <div className="flex-1 relative bg-bg p-8 flex items-center justify-center">
              {/* Brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500 transition-all" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500 transition-all" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500 transition-all" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500 transition-all" />
              
              {file && (
                <div className="w-48 h-64 bg-surface border border-line shadow-sm relative overflow-hidden flex items-center justify-center">
                  <File className="text-ink-muted w-12 h-12 opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent h-[150%] animate-[float_2s_linear_infinite]" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Pipeline & Log */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="h-[180px] border border-line bg-surface rounded-sm flex flex-col">
              <div className="h-8 border-b border-line bg-surface-2/50 flex items-center px-3 shrink-0">
                <span className="font-mono text-[9px] text-ink-muted">PIPELINE STATUS</span>
              </div>
              <div className="flex-1 p-4 flex items-end overflow-hidden">
                <PipelineBars steps={job?.steps || []} />
              </div>
            </div>

            <div className="flex-1 border border-line bg-surface rounded-sm flex flex-col min-h-[200px]">
              <div className="h-8 border-b border-line bg-surface-2/50 flex items-center justify-between px-3 shrink-0">
                <span className="font-mono text-[9px] text-ink-muted">LIVE LOG</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div className="flex-1 p-4 bg-surface-2/30 font-mono text-[10px] text-ink-muted overflow-y-auto space-y-1.5">
                <p>{(ms/1000).toFixed(3)}s | <span className="text-amber-600">SYS</span> | Engine initialized</p>
                <p>{((ms+100)/1000).toFixed(3)}s | <span className="text-amber-600">UPLOAD</span> | Artifact received in memory</p>
                {job?.steps?.map((step, i) => (
                  <p key={i}>{(ms/1000 + i*0.2).toFixed(3)}s | <span className="text-verdict-genuine">{step.id}</span> | {step.message || step.label}</p>
                ))}
                <p className="flex items-center gap-2 mt-2 text-ink">
                  <span>&gt; Processing<span className="animate-pulse">_</span></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // STATE 1: INPUT
  // --------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 relative z-10 flex flex-col items-center">
      <header className="mb-12 text-center">
        <span className="font-mono text-[10px] uppercase text-ink-muted tracking-wider">Cryptographic & Forensic Verification</span>
        <h1 className="mt-4 font-display text-5xl sm:text-6xl text-ink tracking-tight">Verify Document</h1>
      </header>

      <div className="w-full relative">
        {/* Decorative background grid and rulers for the panel */}
        <div className="absolute -inset-4 sm:-inset-8 border border-line bg-surface-2/20 -z-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ink" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-ink" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-ink" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-ink" />
        </div>

        <div className="border border-line bg-surface shadow-hard p-1 sm:p-2">
          {/* Tabs */}
          <div className="flex border-b border-line mb-6 relative">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(''); }}
                className={`flex-1 flex justify-center items-center gap-2 py-3 font-mono text-[11px] outline-none transition-colors ${tab === t.id ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
              >
                <t.icon size={14} />
                {t.label}
                {tab === t.id && (
                  <motion.div layoutId="verifyTab" className="absolute bottom-0 h-0.5 bg-ink w-1/3" />
                )}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="px-4 pb-6 sm:px-8 sm:pb-8 space-y-6">
            {/* TABS CONTENT */}
            {(tab === 'upload' || tab === 'id') && (
              <div 
                className={`relative border border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 sm:p-12 
                  ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-ink-muted bg-surface-2/30 hover:border-ink hover:bg-surface-2'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 transition-all ${isDragging ? 'border-amber-500 translate-x-1 translate-y-1' : 'border-ink-muted'}`} />
                <div className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 transition-all ${isDragging ? 'border-amber-500 -translate-x-1 translate-y-1' : 'border-ink-muted'}`} />
                <div className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 transition-all ${isDragging ? 'border-amber-500 translate-x-1 -translate-y-1' : 'border-ink-muted'}`} />
                <div className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 transition-all ${isDragging ? 'border-amber-500 -translate-x-1 -translate-y-1' : 'border-ink-muted'}`} />
                
                {file ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-20 bg-surface border border-line shadow-sm mb-4 flex items-center justify-center">
                      <FileCheck size={24} className="text-verdict-genuine" />
                    </div>
                    <span className="font-mono text-xs text-ink truncate max-w-[200px]">{file.name}</span>
                    <span className="font-mono text-[10px] text-ink-muted mt-1">{(file.size/1024/1024).toFixed(2)} MB</span>
                    <button type="button" onClick={() => setFile(null)} className="mt-4 text-[10px] text-verdict-forged hover:underline font-mono">
                      REMOVE FILE
                    </button>
                  </div>
                ) : (
                  <>
                    <FileUp size={32} className={`mb-4 transition-transform ${isDragging ? 'text-amber-500 -translate-y-2' : 'text-ink-muted'}`} />
                    <span className="font-mono text-xs text-ink">Drag & Drop or Click to Select</span>
                    <span className="font-mono text-[10px] text-ink-muted mt-2">PDF, PNG, JPEG up to 5MB</span>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        setError('');
                      }
                    }} />
                  </>
                )}
              </div>
            )}

            {tab === 'scan' && (
              <QrScanTab onDocId={(id) => { setDocId(id); setTab('id'); }} onError={setError} />
            )}

            {tab === 'id' && (
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase text-ink-muted">DOCUMENT ID (UUID)</label>
                <input 
                  type="text" 
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx"
                  className="w-full bg-surface-2 border border-line p-3 font-mono text-xs text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                />
              </div>
            )}

            {error && (
              <div className="p-3 border border-verdict-forged bg-verdict-forged-bg flex gap-3 text-verdict-forged text-xs items-center font-mono">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-amber-500 text-ink font-mono font-bold text-xs uppercase tracking-widest border border-ink shadow-hard hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink"
            >
              Run Deterministic Verification
            </button>
          </form>
        </div>
      </div>

      {/* VERDICTS LEGEND */}
      <div className="mt-12 flex flex-wrap justify-center gap-2 max-w-2xl">
        {[
          { id: 'genuine', label: 'GENUINE', c: 'border-verdict-genuine-border text-verdict-genuine-text bg-verdict-genuine-bg' },
          { id: 'copy', label: 'GENUINE COPY', c: 'border-verdict-copy-border text-verdict-copy-text bg-verdict-copy-bg' },
          { id: 'altered', label: 'ALTERED', c: 'border-verdict-altered-border text-verdict-altered-text bg-verdict-altered-bg' },
          { id: 'forged', label: 'FORGED', c: 'border-verdict-forged-border text-verdict-forged-text bg-verdict-forged-bg' },
          { id: 'revoked', label: 'REVOKED', c: 'border-verdict-revoked-border text-verdict-revoked-text bg-verdict-revoked-bg' },
          { id: 'unverifiable', label: 'UNVERIFIABLE', c: 'border-verdict-unverifiable-border text-verdict-unverifiable-text bg-verdict-unverifiable-bg' },
        ].map(v => (
          <div key={v.id} className={`border px-2 py-1 rounded-sm font-mono text-[9px] uppercase tracking-wider cursor-help transition-transform hover:scale-105 ${v.c}`}>
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// HELPER COMPONENTS
// ----------------------------------------------------

function PipelineBars({ steps = [] }) {
  const defaultStages = ['UPLOAD', 'SHA-256', 'QR', 'REGISTRY', 'SIGNATURE', 'OCR', 'VERDICT'];
  
  // Use backend steps if available, fallback to defaults
  const displayStages = steps.length > 0 ? steps.filter(s => ['upload', 'hash', 'qr_extract', 'registry_lookup', 'signature_verify', 'ocr_fields', 'verdict'].includes(s.id)) : defaultStages.map(label => ({ label }));
  const renderedStages = displayStages.length > 0 ? displayStages : defaultStages.map(label => ({ label }));

  return (
    <div className="flex w-full h-full gap-1 sm:gap-2 items-end">
      {renderedStages.map((stage, i) => {
        const isActive = stage.status === 'running';
        const isDone = stage.status === 'passed' || stage.status === 'skipped' || stage.status === 'warning';
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 relative">
            <div className={`w-full max-w-[24px] rounded-t-sm transition-all duration-300 flex flex-col justify-end
              ${isDone ? 'h-full bg-verdict-genuine' : ''}
              ${isActive ? 'h-[50%] bg-amber-500 animate-pulse' : ''}
              ${!isDone && !isActive ? 'h-full border border-dashed border-line' : ''}
            `} />
            <span className="font-mono text-[9px] text-ink-muted -rotate-45 sm:rotate-0 origin-bottom-left sm:origin-center sm:text-center mt-2 w-full truncate">
              {stage.label || stage.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QrScanTab({ onDocId, onError }) {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');

  const stop = () => {
    const v = videoRef.current;
    if (v?.srcObject) v.srcObject.getTracks().forEach((t) => t.stop());
    setScanning(false);
  };

  const startCam = async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      setScanning(true);
      const canvas = document.createElement('canvas');
      const tick = () => {
        if (!v.srcObject) return;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
             const id = code.data.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
             stop();
             if (id) return onDocId(id);
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setCamError('Camera unavailable or permission denied.');
      setScanning(false);
    }
  };

  return (
    <div className="border border-line bg-surface-2 p-4 text-center min-h-[200px] flex flex-col items-center justify-center">
      {!scanning && (
        <>
          <Camera size={32} className="text-ink-muted mb-4" />
          <p className="font-mono text-xs text-ink mb-4">{camError || 'Scan physical document QR code'}</p>
          <button type="button" onClick={startCam} className="px-4 py-2 border border-ink text-ink font-mono text-[10px] uppercase shadow-sm hover:bg-surface transition-colors">
            Start Camera
          </button>
        </>
      )}
      {scanning && (
        <div className="relative w-full max-w-sm overflow-hidden border border-line">
           <video ref={videoRef} playsInline muted className="w-full object-cover" />
           <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-500 animate-pulse shadow-[0_0_12px_2px_rgba(245,158,11,0.6)]" />
           <button type="button" onClick={stop} className="absolute bottom-2 right-2 bg-bg border border-line px-2 py-1 font-mono text-[9px]">Stop</button>
        </div>
      )}
    </div>
  );
}
