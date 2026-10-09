import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, CameraOff, FileUp, Hash, ScanLine } from 'lucide-react';
import jsQR from 'jsqr';
import api, { errMsg } from '../../api/axios';
import UploadBox from '../../components/UploadBox.jsx';
import Stepper, { useElapsed } from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { fmtMs } from '../../lib/format';

const TABS = [
  { id: 'upload', label: 'Upload file', icon: FileUp },
  { id: 'scan', label: 'Scan QR', icon: ScanLine },
  { id: 'id', label: 'Enter document ID', icon: Hash },
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
      if (!file) return setError('Choose a PDF, PNG or JPEG first.');
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
      <header className="mb-8 text-center">
        <p className="section-title">Verification</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Check a document</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          Upload the file you hold. We compare it against the signed registry record — hash, signature, status, then OCR and visual
          forensics if the bytes differ. No account needed.
        </p>
      </header>

      <div className="glass p-6">
        <div className="mb-6 flex gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === t.id ? 'bg-gold-500 text-navy-900' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
              }`}
            >
              <t.icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-5">
          {(tab === 'upload' || tab === 'id') && (
            <UploadBox file={file} onFile={(f) => { setFile(f); setError(''); }} onError={setError} disabled={running} />
          )}

          {tab === 'scan' && <QrScanTab onDocId={(id) => { setDocId(id); setTab('id'); toast.success('QR read — now attach the file for exact verification'); }} onError={setError} />}

          {tab === 'id' && (
            <div>
              <label className="label" htmlFor="doc_id">Document ID</label>
              <input
                id="doc_id"
                className="input mono"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx"
                spellCheck={false}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Found on the document, or inside its QR link. If the file also carries a readable QR, the QR wins — it is harder to mistype.
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={running} className="btn-primary w-full py-3">
            {running ? `Verifying… ${fmtMs(elapsed)}` : 'Run verification'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
        Your file is analysed and then deleted from the upload folder. Only the hash, the verdict and the evidence are stored.
      </p>

      <AnimatePresence>
        {job && running && (
          <Stepper
            overlay
            steps={job.steps}
            progress={job.progress}
            title="Verifying your document"
            subtitle={`Running for ${fmtMs(elapsed)} — each step below really executed`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Camera QR scanning with jsQR. If the camera is unavailable or denied, we fall back to
 * uploading an image of the QR — which uses the server-side OpenCV decoder.
 */
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
            onError('That QR does not contain an Agnitia document ID.');
            return;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setCamError('Camera unavailable or permission denied — upload a photo of the QR instead.');
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
      onError('No QR code could be decoded from that image.');
    } catch (e) {
      onError(errMsg(e, 'QR decoding failed'));
    }
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-navy-950/60">
        <video ref={videoRef} playsInline muted className={`mx-auto max-h-[320px] w-full object-contain ${scanning ? '' : 'hidden'}`} />
        {!scanning && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/25 bg-gold-500/10 text-gold-300">
              {camError ? <CameraOff size={24} /> : <Camera size={24} />}
            </span>
            <p className="text-sm font-semibold text-white">{camError ? 'Camera not available' : 'Point the camera at the QR code'}</p>
            {camError && <p className="max-w-sm text-xs leading-relaxed text-slate-400">{camError}</p>}
            <button type="button" onClick={startCam} className="btn-ghost btn-sm mt-1">
              <Camera size={14} /> Start camera
            </button>
          </div>
        )}
        {scanning && (
          <>
            <span className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-gold-400/80 shadow-[0_0_16px_2px_rgba(212,175,55,0.6)]" />
            <button type="button" onClick={stop} className="absolute bottom-3 right-3 rounded-lg bg-navy-950/80 px-3 py-1.5 text-xs text-slate-300">
              Stop
            </button>
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
        <p className="text-xs text-slate-400">No camera, or it will not start?</p>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost btn-sm mt-2.5">
          Upload a photo of the QR
        </button>
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
      </div>
    </div>
  );
}
