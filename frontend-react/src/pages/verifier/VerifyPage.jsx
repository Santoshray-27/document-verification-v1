import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, CameraOff, FileUp, Hash, ScanLine, ShieldCheck } from 'lucide-react';
import jsQR from 'jsqr';
import api, { errMsg } from '../../api/axios';
import UploadBox from '../../components/UploadBox.jsx';
import Stepper, { useElapsed } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtMs } from '../../lib/format';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';

const TABS = [
  { id: 'upload', label: 'Upload Document', icon: FileUp },
  { id: 'scan', label: 'Scan QR Camera', icon: ScanLine },
  { id: 'id', label: 'Enter Document ID', icon: Hash },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function VerifyPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState('');
  const [job, setJob] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const elapsed = useElapsed(running);

  const start = async (payloadFile, manualId) => {
    setError('');
    setRunning(true);
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
          setRunning(false);
          navigate(`/result/${jobId}`, { replace: true });
          return;
        }
        if (data.status === 'failed') {
          setError(data.error || 'Verification failed');
          setRunning(false);
          toast.error(data.error || 'Verification failed');
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
      if (!UUID_RE.test(id)) return setError('That is not a valid document ID (UUID format).');
      if (!file) return setError('Also attach the file — an ID alone can only prove a record exists.');
      return start(file, id);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Page Header */}
      <header className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cryptographic & Forensic Verification
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Verify Any Document
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Upload any file you hold. The platform cross-references the signed registry record — verifying ECDSA digital signatures, SHA-256 hashes, OCR text, and visual difference forensics.
        </p>
      </header>

      {/* Main Verification Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 text-card-foreground shadow-xl">
        {/* Tab Selector */}
        <div className="mb-6 flex gap-1.5 rounded-2xl border border-border bg-muted/30 p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <t.icon size={15} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-6">
          {(tab === 'upload' || tab === 'id') && (
            <UploadBox
              file={file}
              onFile={(f) => { setFile(f); setError(''); }}
              onError={setError}
              disabled={running}
            />
          )}

          {tab === 'scan' && (
            <QrScanTab
              onDocId={(id) => {
                setDocId(id);
                setTab('id');
                toast.success('QR successfully decoded — now attach your document for forensic cross-check');
              }}
              onError={setError}
            />
          )}

          {tab === 'id' && (
            <div>
              <Label htmlFor="doc_id" className="mb-1.5 block">Document UUID</Label>
              <Input
                id="doc_id"
                className="font-mono text-sm"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx"
                spellCheck={false}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Found on the physical or digital document, or inside its QR URL. If the file contains an embedded QR code, the embedded code takes precedence.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={running}
            loading={running}
            className="w-full text-base font-semibold py-3"
          >
            {running ? `Executing Verification… (${fmtMs(elapsed)})` : 'Run Deterministic Verification'}
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
        Your uploaded file is inspected in-memory and removed immediately after forensic processing. Only cryptographic proofs and evidence hashes are preserved.
      </p>

      {/* SSE Pipeline Live Stepper Modal */}
      <AnimatePresence>
        {job && running && (
          <Stepper
            overlay
            steps={job.steps}
            progress={job.progress}
            title="Running Multi-Layer Verification Pipeline"
            subtitle={`Elapsed: ${fmtMs(elapsed)} · Extracting QR, validating ECDSA signature, inspecting OCR fields and SSIM differences`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Camera QR scanning with jsQR with photo fallback */
function QrScanTab({ onDocId, onError }) {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const fileRef = useRef(null);

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
            onError('The scanned QR does not contain an authentic Agnitia document identifier.');
            return;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setCamError('Camera unavailable or permission denied. You can upload an image containing the QR code below.');
      setScanning(false);
    }
  };

  const onImage = async (f) => {
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/public/extract-qr', fd);
      if (data.found && data.doc_id) return onDocId(data.doc_id);
      onError('No QR code could be decoded from that file.');
    } catch (e) {
      onError(errMsg(e, 'QR decoding failed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/40">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`mx-auto max-h-[320px] w-full object-contain ${scanning ? '' : 'hidden'}`}
        />
        {!scanning && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-amber-700 dark:text-amber-400">
              {camError ? <CameraOff size={24} /> : <Camera size={24} />}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {camError ? 'Camera Access Required' : 'Scan Physical QR Code'}
            </p>
            {camError && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{camError}</p>}
            <Button type="button" variant="outline" size="sm" onClick={startCam} className="mt-1">
              <Camera size={14} className="mr-1.5" /> Start Camera
            </Button>
          </div>
        )}
        {scanning && (
          <>
            <span className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-amber-500 shadow-[0_0_12px_2px_rgba(245,158,11,0.6)]" />
            <button
              type="button"
              onClick={stop}
              className="absolute bottom-3 right-3 rounded-lg bg-card/90 px-3 py-1.5 text-xs text-foreground border border-border shadow-xs"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">Prefer uploading a photo or screenshot of the QR?</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          className="mt-2.5"
        >
          Select QR Image
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          className="hidden"
          onChange={(e) => onImage(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
