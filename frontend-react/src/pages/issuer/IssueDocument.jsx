import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, CalendarDays, Check, Copy, Download, FileText, QrCode, 
  Sparkles, Wand2, X, FileCheck, Stamp, Loader2, Award, BookOpen, 
  FileCheck2, Trophy, Briefcase, GraduationCap, ChevronRight, Maximize2, 
  Minimize2, ZoomIn, ZoomOut, Eye
} from 'lucide-react';
import api, { assetUrl, errMsg } from '../../api/axios';
import Stepper from '../../components/Stepper.jsx';
import { useToast } from '../../components/Toast.jsx';
import { copyText, fmtDate, shortHash } from '../../lib/format';
import { TEMPLATE_REGISTRY, getTemplateById } from '../../templates/registry';
import { useIssuerBrand } from '../../hooks/useIssuerBrand';
import {
  AcademicCertificateView,
  MarksheetView,
  BonafideCertificateView,
  HackathonParticipationView,
  HackathonWinnerView,
  WorkshopBootcampView,
  InternshipCertificateView
} from '../../components/templates/CertificateViews';

const STEPS = ['TEMPLATE', 'RECIPIENT', 'CUSTOMIZE', 'REVIEW & SIGN'];

export default function IssueDocument() {
  const toast = useToast();
  const brand = useIssuerBrand();
  const [step, setStep] = useState(0);

  // Selected template from single typed registry
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_REGISTRY[0].id);
  const currentTemplate = useMemo(() => getTemplateById(selectedTemplateId), [selectedTemplateId]);

  // Form state initialized with template schema defaults
  const [form, setForm] = useState(() => ({
    ...currentTemplate.samplePreviewData,
    issue_date: new Date().toISOString().slice(0, 10),
    expires_at: '',
  }));

  const [touched, setTouched] = useState({});
  const [job, setJob] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Draft save & restore via localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`evidentia_draft_${selectedTemplateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setForm(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [selectedTemplateId]);

  // Auto-save draft on changes
  useEffect(() => {
    try {
      localStorage.setItem(`evidentia_draft_${selectedTemplateId}`, JSON.stringify(form));
    } catch (e) {
      // Ignore
    }
  }, [form, selectedTemplateId]);

  // Zoom and fullscreen state for preview
  const [zoomLevel, setZoomLevel] = useState(1); // 1, 1.25, 1.5
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState('html'); // 'html' or 'pdf'
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Marksheet subjects helper
  const addSubjectRow = (fieldKey) => {
    setForm(prev => {
      const currentRows = Array.isArray(prev[fieldKey]) ? prev[fieldKey] : [];
      const newRow = { code: `CS${401 + currentRows.length}`, title: 'Elective Course', credits: '4', grade: 'A+' };
      return { ...prev, [fieldKey]: [...currentRows, newRow] };
    });
  };

  const removeSubjectRow = (fieldKey, index) => {
    setForm(prev => {
      const currentRows = Array.isArray(prev[fieldKey]) ? prev[fieldKey] : [];
      if (currentRows.length <= 1) return prev;
      return { ...prev, [fieldKey]: currentRows.filter((_, i) => i !== index) };
    });
  };

  const updateSubjectCell = (fieldKey, index, colKey, val) => {
    setForm(prev => {
      const currentRows = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      if (currentRows[index]) {
        currentRows[index] = { ...currentRows[index], [colKey]: val };
      }
      return { ...prev, [fieldKey]: currentRows };
    });
  };

  // Helper to render the matching Certificate View component
  const renderCertificateView = (data, isSignedState) => {
    switch (selectedTemplateId) {
      case 'tpl_academic':
        return <AcademicCertificateView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_marksheet':
        return <MarksheetView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_bonafide':
        return <BonafideCertificateView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_hack_part':
        return <HackathonParticipationView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_hack_win':
        return <HackathonWinnerView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_workshop':
        return <WorkshopBootcampView data={data} brand={brand} isSigned={isSignedState} />;
      case 'tpl_internship':
        return <InternshipCertificateView data={data} brand={brand} isSigned={isSignedState} />;
      default:
        return <AcademicCertificateView data={data} brand={brand} isSigned={isSignedState} />;
    }
  };

  // Template switch handler: preserve shared fields (name, cert no, issue_date)
  const handleSelectTemplate = (newTemplateId) => {
    if (newTemplateId === selectedTemplateId) return;
    const newTemplate = getTemplateById(newTemplateId);
    setSelectedTemplateId(newTemplateId);

    setForm((prev) => {
      const merged = { ...newTemplate.samplePreviewData };
      // Preserve shared fields if already entered by user
      if (prev.recipient_name) merged.recipient_name = prev.recipient_name;
      if (prev.name) merged.recipient_name = prev.name;
      if (prev.certificate_number && !prev.certificate_number.startsWith('PREVIEW')) {
        merged.certificate_number = prev.certificate_number;
      }
      if (prev.issue_date) merged.issue_date = prev.issue_date;
      if (prev.expires_at) merged.expires_at = prev.expires_at;
      return merged;
    });

    setTouched({});
    setError('');
  };

  // Group fields by wizard step
  const recipientFields = useMemo(() => {
    return currentTemplate.fields.filter(f => f.step === 'recipient');
  }, [currentTemplate]);

  const customizeFields = useMemo(() => {
    return currentTemplate.fields.filter(f => f.step === 'customize');
  }, [currentTemplate]);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Validation based on template schema
  const errors = useMemo(() => {
    const e = {};
    currentTemplate.fields.forEach((f) => {
      const val = form[f.key];
      if (f.required) {
        if (val === undefined || val === null || String(val).trim() === '') {
          e[f.key] = `${f.label} is required`;
        }
      }
      if (f.validation?.min && String(val || '').trim().length < f.validation.min) {
        e[f.key] = `Min ${f.validation.min} characters required`;
      }
      if (f.validation?.max && String(val || '').trim().length > f.validation.max) {
        e[f.key] = `Max ${f.validation.max} characters allowed`;
      }
    });

    if (form.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.issue_date)) {
      e.issue_date = 'Use YYYY-MM-DD';
    }
    if (form.expires_at && form.expires_at <= form.issue_date) {
      e.expires_at = 'Expiry must be after issue date';
    }
    return e;
  }, [form, currentTemplate]);

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) {
      return !recipientFields.some(f => errors[f.key]);
    }
    if (step === 2) {
      return !customizeFields.some(f => errors[f.key]) && !errors.issue_date && !errors.expires_at;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1) {
      const t = {};
      recipientFields.forEach(f => { t[f.key] = 1; });
      setTouched(prev => ({ ...prev, ...t }));
    }
    if (step === 2) {
      const t = { issue_date: 1, expires_at: 1 };
      customizeFields.forEach(f => { t[f.key] = 1; });
      setTouched(prev => ({ ...prev, ...t }));
    }

    if (canProceed()) {
      setError('');
      setStep(s => Math.min(3, s + 1));
    } else {
      setError('Please resolve all validation errors before proceeding.');
    }
  };

  const suggestId = () => {
    const prefix = currentTemplate.id.replace('tpl_', '').toUpperCase().slice(0, 4);
    const chars = `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
    let i = 0;
    setField('certificate_number', '');
    const t = setInterval(() => {
      setField('certificate_number', chars.slice(0, i + 1));
      i++;
      if (i >= chars.length) clearInterval(t);
    }, 40);
  };

  // Debounced real ReportLab preview fetching
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const payloadFields = { ...form };
        // Normalize name field for backward compatibility
        if (form.recipient_name) payloadFields.name = form.recipient_name;

        const res = await api.post('/templates/preview', {
          templateId: currentTemplate.id,
          doc_type: currentTemplate.id,
          sample_fields: payloadFields
        });
        if (active && res.data?.preview_png_base64) {
          setPreviewImage(`data:image/png;base64,${res.data.preview_png_base64}`);
        }
      } catch (err) {
        console.warn('Failed to fetch certificate preview:', err?.message);
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentTemplate.id, form]);

  const submit = async () => {
    if (!canProceed()) return setError('Please complete all required fields.');
    setError('');
    setPolling(true);
    setResult(null);
    try {
      const payloadFields = {
        ...form,
        name: (form.recipient_name || form.name || '').trim(),
        certificate_number: (form.certificate_number || '').trim(),
        issue_date: form.issue_date,
      };

      const res = await api.post('/issue/start', {
        doc_type: currentTemplate.id,
        template_id: currentTemplate.id,
        fields: payloadFields,
        expires_at: form.expires_at || null,
      });

      const data = res?.data;
      if (!data?.job_id) {
        throw new Error(data?.message || 'Failed to start issuance job');
      }

      // If backend already completed synchronously and returned result immediately
      if (data.status === 'done' && data.result) {
        setJob(data);
        setResult(data.result);
        setPolling(false);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        return;
      }

      poll(data.job_id);
    } catch (err) {
      console.error('Issuance submit failed:', err);
      setError(errMsg(err, 'Failed to initialize document issuance. Please verify connection.'));
      setPolling(false);
    }
  };

  const poll = async (jobId) => {
    let consecutiveNetworkErrors = 0;
    for (let i = 0; i < 240; i++) {
      try {
        const { data } = await api.get(`/issue/jobs/${jobId}`);
        consecutiveNetworkErrors = 0;
        setJob(data);
        if (data.status === 'done') {
          setTimeout(() => {
            setResult(data.result);
            setPolling(false);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }, 600);
          return;
        }
        if (data.status === 'failed') {
          setError(data.error || 'Issuing failed');
          setPolling(false);
          return;
        }
      } catch (err) {
        consecutiveNetworkErrors++;
        console.warn(`Poll attempt ${i} error (count ${consecutiveNetworkErrors}):`, err?.message);
        // Only terminate if 6 consecutive network failures occur (3+ seconds sustained downtime)
        if (consecutiveNetworkErrors >= 6) {
          setError(errMsg(err, 'Lost connection while processing issuance.'));
          setPolling(false);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    setError('Issuing operation timed out');
    setPolling(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row gap-12 items-start">
      
      {/* LEFT: WIZARD */}
      <div className="flex-1 w-full max-w-2xl shrink-0 space-y-10">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-700 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 font-bold">
              {brand.orgName}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">/ Issuance Enclave</span>
          </div>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl tracking-tight text-ink">Issue Verifiable Credential</h1>
        </header>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between relative mb-12 mt-8">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-line -z-10" />
          <motion.div 
            className="absolute top-1/2 left-0 h-[2px] bg-amber-500 -z-10 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: step / 3 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => i < step && setStep(i)} className="flex flex-col items-center gap-2 group outline-none">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${step >= i ? 'bg-amber-500 border-amber-500' : 'bg-surface border-line group-hover:border-ink-muted'}`}>
                {step > i && <Check size={10} className="text-bg" />}
              </div>
              <span className={`font-mono text-[9px] uppercase tracking-wider ${step >= i ? 'text-ink font-bold' : 'text-ink-muted group-hover:text-ink'}`}>{s}</span>
            </button>
          ))}
        </div>

        {/* Form Steps Container */}
        <div className="min-h-[420px]">
          {error && (
            <div className="mb-6 p-4 border border-verdict-forged bg-verdict-forged-bg flex gap-3 text-verdict-forged text-xs items-center font-mono">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* STEP 0: TEMPLATE SELECTION (All 7 distinct templates from Registry) */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-mono text-[11px] text-ink-muted tracking-widest uppercase">7 CREDENTIAL TEMPLATES REGISTRY</h2>
                <span className="font-mono text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                  {currentTemplate.layoutVariant.toUpperCase()} A4
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TEMPLATE_REGISTRY.map((t) => {
                  const isSelected = selectedTemplateId === t.id;
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`relative cursor-pointer border p-5 flex flex-col justify-between transition-all duration-200 ${
                        isSelected 
                          ? 'border-ink bg-surface shadow-hard -translate-y-1 ring-1 ring-ink' 
                          : 'border-line bg-surface-2 hover:border-ink-muted hover:bg-surface'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-ink text-bg rounded-sm flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-line bg-surface font-bold text-ink-muted">
                            {t.category}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-amber-500/30 bg-amber-500/10 text-amber-800 font-bold">
                            {t.layoutVariant}
                          </span>
                        </div>
                        <h3 className="font-mono text-[11px] font-bold text-ink uppercase mb-1.5 pr-6 leading-snug">{t.name}</h3>
                        <p className="font-sans text-[11px] text-ink-muted leading-relaxed line-clamp-2">{t.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[10px] font-mono text-ink-muted">
                        <span>{t.fields.length} Fields Defined</span>
                        <span className="text-amber-700 flex items-center gap-1 font-bold">
                          Select <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 1: RECIPIENT DETAILS (Dynamic fields from Template Schema) */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-mono text-[11px] text-ink-muted tracking-widest uppercase">
                  {currentTemplate.name} / RECIPIENT DATA
                </h2>
                <span className="font-mono text-[10px] text-ink-muted">Step 2 of 4</span>
              </div>

              {recipientFields.map((f) => (
                <div key={f.key} className="relative group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-mono text-[10px] text-ink uppercase tracking-wider font-bold">
                      {f.label} {f.required && <span className="text-rose-600">*</span>}
                    </label>
                    {f.key === 'certificate_number' && (
                      <button type="button" onClick={suggestId} className="flex items-center gap-1 font-mono text-[9px] text-amber-600 hover:underline">
                        <Wand2 size={10} /> AUTO-GENERATE ID
                      </button>
                    )}
                  </div>

                  {f.type === 'select' ? (
                    <select
                      value={form[f.key] || ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, [f.key]: 1 }))}
                      className={`w-full bg-surface-2 border p-3 font-mono text-xs outline-none transition-colors ${
                        touched[f.key] && errors[f.key] ? 'border-verdict-forged' : 'border-line focus:border-ink'
                      }`}
                    >
                      <option value="">-- SELECT {f.label} --</option>
                      {f.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : f.type === 'table' ? (
                    <div className="border border-line bg-surface-2 p-3 rounded-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] text-ink-muted">Course curriculum & score ledger. Edit grades below:</p>
                        <button 
                          type="button" 
                          onClick={() => addSubjectRow(f.key)}
                          className="font-mono text-[9px] text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 border border-amber-500/30 font-bold"
                        >
                          + ADD SUBJECT
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-[10px] border border-line bg-surface">
                          <thead className="bg-surface-2 border-b border-line text-ink-muted">
                            <tr>
                              {f.columns?.map(col => <th key={col.key} className="p-1.5">{col.label}</th>)}
                              <th className="p-1.5 text-right w-10">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(form[f.key]) && form[f.key].map((row, idx) => (
                              <tr key={idx} className="border-b border-line/60">
                                {f.columns?.map(col => (
                                  <td key={col.key} className="p-1">
                                    <input 
                                      type="text"
                                      value={row[col.key] || ''}
                                      onChange={(e) => updateSubjectCell(f.key, idx, col.key, e.target.value)}
                                      className="w-full bg-transparent px-1.5 py-1 text-[10px] border border-transparent focus:border-amber-500 rounded-xs outline-none"
                                    />
                                  </td>
                                ))}
                                <td className="p-1 text-right">
                                  <button 
                                    type="button" 
                                    onClick={() => removeSubjectRow(f.key, idx)}
                                    className="text-rose-500 hover:text-rose-700 px-1 font-bold text-xs"
                                    title="Delete subject row"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <input
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, [f.key]: 1 }))}
                      placeholder={f.placeholder}
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      className={`w-full bg-transparent border-b-2 py-2 text-sm outline-none transition-colors ${
                        touched[f.key] && errors[f.key] 
                          ? 'border-verdict-forged text-verdict-forged focus:border-verdict-forged' 
                          : 'border-line text-ink focus:border-ink placeholder:text-ink-muted'
                      }`}
                    />
                  )}

                  {f.helpText && <p className="font-mono text-[9px] text-ink-muted mt-1">{f.helpText}</p>}
                  {touched[f.key] && errors[f.key] && (
                    <p className="font-mono text-[9px] text-verdict-forged mt-1">{errors[f.key]}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* STEP 2: CUSTOMIZE STEP (Template-specific customizations & Signatures) */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="font-mono text-[11px] text-ink-muted tracking-widest uppercase">
                  CUSTOMIZE SPECIFICATIONS & ATTESTATION
                </h2>
                <span className="font-mono text-[10px] text-ink-muted">Step 3 of 4</span>
              </div>

              {customizeFields.map((f) => (
                <div key={f.key} className="relative group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-mono text-[10px] text-ink uppercase tracking-wider font-bold">
                      {f.label} {f.required && <span className="text-rose-600">*</span>}
                    </label>
                  </div>

                  {f.type === 'select' ? (
                    <select
                      value={form[f.key] || ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, [f.key]: 1 }))}
                      className="w-full bg-surface-2 border border-line p-3 font-mono text-xs outline-none focus:border-ink"
                    >
                      <option value="">-- SELECT {f.label} --</option>
                      {f.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-surface-2 border border-line p-3 font-mono text-xs outline-none focus:border-ink"
                    />
                  ) : (
                    <input
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      className="w-full bg-transparent border-b-2 border-line py-2 text-sm text-ink outline-none focus:border-ink placeholder:text-ink-muted"
                    />
                  )}
                  {touched[f.key] && errors[f.key] && (
                    <p className="font-mono text-[9px] text-verdict-forged mt-1">{errors[f.key]}</p>
                  )}
                </div>
              ))}

              {/* Accent Color Customization Swatches */}
              {currentTemplate.accentPalette?.presets?.length > 0 && (
                <div className="pt-2 pb-2">
                  <label className="font-mono text-[10px] text-ink uppercase tracking-wider font-bold mb-2 block">
                    ACCENT THEME PALETTE
                  </label>
                  <div className="flex items-center gap-3">
                    {currentTemplate.accentPalette.presets.map((colorHex) => {
                      const isColorActive = (form.accent_color || currentTemplate.accentPalette.secondary) === colorHex;
                      return (
                        <button
                          key={colorHex}
                          type="button"
                          onClick={() => setField('accent_color', colorHex)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            isColorActive ? 'scale-110 border-ink shadow-sm ring-2 ring-ink/30' : 'border-line hover:scale-105'
                          }`}
                          style={{ backgroundColor: colorHex }}
                          title={`Select accent color ${colorHex}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-line">
                <div>
                  <label className="font-mono text-[10px] text-ink uppercase tracking-wider font-bold mb-1 block">
                    DATE OF ISSUANCE *
                  </label>
                  <input 
                    type="date" 
                    value={form.issue_date} 
                    onChange={(e) => setField('issue_date', e.target.value)} 
                    className="w-full bg-surface-2 border border-line p-3 font-mono text-xs outline-none focus:border-ink" 
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-ink uppercase tracking-wider font-bold mb-1 block">
                    EXPIRY DATE (OPTIONAL)
                  </label>
                  <input 
                    type="date" 
                    value={form.expires_at} 
                    onChange={(e) => setField('expires_at', e.target.value)} 
                    className="w-full bg-surface-2 border border-line p-3 font-mono text-xs outline-none focus:border-ink" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: REVIEW & SIGN */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between border-b border-line pb-3 mb-6">
                <h2 className="font-mono text-[11px] text-ink-muted tracking-widest uppercase">
                  FINAL CRYPTOGRAPHIC AUDIT & SIGNATURE
                </h2>
                <span className="font-mono text-[10px] text-ink-muted">Step 4 of 4</span>
              </div>

              <div className="border border-line bg-surface p-6 shadow-sm space-y-4 mb-8">
                <div className="flex justify-between border-b border-line pb-3">
                  <span className="font-mono text-[10px] text-ink-muted">ISSUING AUTHORITY</span>
                  <span className="font-mono text-[11px] text-ink font-bold">{brand.orgName}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-3">
                  <span className="font-mono text-[10px] text-ink-muted">CREDENTIAL TEMPLATE</span>
                  <span className="font-mono text-[11px] text-amber-700 font-bold">{currentTemplate.name}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-3">
                  <span className="font-mono text-[10px] text-ink-muted">RECIPIENT NAME</span>
                  <span className="font-mono text-[11px] text-ink font-bold">{form.recipient_name || form.name}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-3">
                  <span className="font-mono text-[10px] text-ink-muted">CREDENTIAL REF ID</span>
                  <span className="font-mono text-[11px] text-ink">{form.certificate_number}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-3">
                  <span className="font-mono text-[10px] text-ink-muted">ISSUE DATE</span>
                  <span className="font-mono text-[11px] text-ink">{form.issue_date}</span>
                </div>
                <div className="pt-2">
                  <p className="font-mono text-[9px] text-ink-muted leading-relaxed">
                    By holding the button below, your organization ({brand.orgName}) signs this manifest using hardware/software enclave ECDSA P-256 keys, binding the payload with SHA-256 into the public verifier ledger.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Wizard Controls */}
        <div className="flex items-center justify-between border-t border-line pt-6">
          <button 
            onClick={() => setStep(s => Math.max(0, s - 1))} 
            className={`font-mono text-[10px] uppercase tracking-wider text-ink hover:underline outline-none ${step === 0 ? 'invisible' : ''}`}
          >
            &larr; BACK
          </button>
          
          {step < 3 ? (
            <button 
              onClick={nextStep} 
              className="px-8 py-3 bg-ink text-bg font-mono font-bold text-[11px] uppercase tracking-wide shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink"
            >
              CONTINUE
            </button>
          ) : (
            <HoldToSignButton onSign={submit} isLoading={polling} />
          )}
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW (Desktop sticky, Mobile sheet) */}
      <div className={`fixed inset-0 z-50 bg-bg p-4 flex flex-col items-center justify-center lg:static lg:bg-transparent lg:p-0 lg:w-[500px] lg:flex lg:shrink-0 lg:sticky lg:top-20 h-[100dvh] lg:h-max transition-transform duration-300 ${showMobilePreview ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
        <button onClick={() => setShowMobilePreview(false)} className="absolute top-4 right-4 lg:hidden p-2 bg-surface-2 border border-line rounded-sm">
          <X size={20} />
        </button>
        <div className="w-full max-w-[500px]">
          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between mb-3 bg-surface border border-line px-3 py-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted font-bold">
                {currentTemplate.layoutVariant.toUpperCase()} A4
              </span>
              <div className="h-3 w-px bg-line" />
              {/* Preview Mode Switcher */}
              <button 
                type="button"
                onClick={() => setPreviewMode(m => m === 'html' ? 'pdf' : 'html')}
                className={`font-mono text-[9px] px-2 py-0.5 border rounded-xs transition-colors ${
                  previewMode === 'html' 
                    ? 'bg-ink text-bg border-ink' 
                    : 'bg-surface-2 text-ink-muted border-line hover:text-ink'
                }`}
                title="Switch between dynamic interactive preview and rendered PDF raster"
              >
                {previewMode === 'html' ? '⚡ LIVE HTML' : '📄 PDF CANVAS'}
              </button>
            </div>

            {/* Zoom & Fullscreen Toolbar */}
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => setZoomLevel(z => Math.max(0.75, +(z - 0.25).toFixed(2)))} 
                title="Zoom Out"
                className="p-1 hover:bg-surface-2 text-ink-muted hover:text-ink rounded-xs transition-colors"
              >
                <ZoomOut size={13} />
              </button>
              <span className="font-mono text-[9px] text-ink w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button 
                type="button" 
                onClick={() => setZoomLevel(z => Math.min(1.5, +(z + 0.25).toFixed(2)))} 
                title="Zoom In"
                className="p-1 hover:bg-surface-2 text-ink-muted hover:text-ink rounded-xs transition-colors"
              >
                <ZoomIn size={13} />
              </button>
              <div className="h-3 w-px bg-line mx-1" />
              <button 
                type="button" 
                onClick={() => setIsFullscreen(true)} 
                title="Fullscreen Preview"
                className="p-1 hover:bg-surface-2 text-ink-muted hover:text-ink rounded-xs transition-colors"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Paper Canvas Shadow Container */}
          <div className="border border-line bg-surface p-2 shadow-hard relative group overflow-hidden">
            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-ink z-10 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-ink z-10 pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-ink z-10 pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-ink z-10 pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplateId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                className="transition-transform duration-150"
              >
                <PreviewCard 
                  form={form} 
                  isSigned={!!result} 
                  previewImage={result ? assetUrl(result.snapshot_url) : previewImage} 
                  previewLoading={previewLoading} 
                  previewMode={previewMode}
                  renderHtml={() => renderCertificateView(form, !!result)}
                  layoutVariant={currentTemplate.layoutVariant}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-ink-muted px-1">
            <span>ISSUER: {brand.orgName}</span>
            <span className="text-amber-700 font-bold">DIGITALLY ATTESTED</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
              <span className="font-mono text-xs uppercase tracking-wider">
                {currentTemplate.name} · Fullscreen Inspection
              </span>
              <button 
                onClick={() => setIsFullscreen(false)} 
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xs transition-colors flex items-center gap-1 font-mono text-xs"
              >
                <Minimize2 size={16} /> Close
              </button>
            </div>
            <div className="w-full max-w-4xl max-h-[85vh] overflow-auto flex items-center justify-center p-2 bg-neutral-900 border border-neutral-700 shadow-2xl">
              <div className="w-full max-w-3xl">
                {renderCertificateView(form, !!result)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Preview Toggle Button */}
      <button 
        onClick={() => setShowMobilePreview(true)} 
        className="lg:hidden fixed bottom-6 right-6 px-4 py-3 bg-amber-500 text-ink font-mono font-bold text-[10px] uppercase border border-ink shadow-hard rounded-full z-40"
      >
        VIEW PREVIEW
      </button>

      {/* Success Modal */}
      <AnimatePresence>
        {result && (
          <SuccessCard
            result={result}
            onClose={() => { 
              setResult(null); 
              setJob(null); 
              setForm({
                ...currentTemplate.samplePreviewData,
                issue_date: new Date().toISOString().slice(0, 10),
                expires_at: '',
              }); 
              setStep(0); 
            }}
          />
        )}
      </AnimatePresence>

      {/* Polling Modal */}
      <AnimatePresence>
        {polling && !result && (
          <Stepper overlay steps={job?.steps || []} progress={job?.progress || 0} title="EXECUTING CRYPTOGRAPHIC PIPELINE" />
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------
// COMPONENTS
// ----------------------------------------------------

function HoldToSignButton({ onSign, isLoading }) {
  const [holding, setHolding] = useState(false);
  const controls = useAnimation();
  
  const startHold = async () => {
    if (isLoading) return;
    setHolding(true);
    await controls.start({ width: "100%", transition: { duration: 1, ease: "linear" } });
    onSign();
  };
  
  const endHold = () => {
    if (isLoading) return;
    setHolding(false);
    controls.stop();
    controls.set({ width: "0%" });
  };

  return (
    <button 
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      disabled={isLoading}
      className={`relative overflow-hidden px-8 py-3 border border-ink shadow-hard-sm transition-all outline-none select-none
        ${isLoading ? 'bg-amber-600 text-bg shadow-none translate-x-[2px] translate-y-[2px]' : 'bg-amber-500 text-ink hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none'}`}
    >
      <div className="relative z-10 flex items-center gap-2 font-mono font-bold text-[11px] uppercase tracking-wide">
        {isLoading ? <span className="animate-pulse">SIGNING MANIFEST...</span> : 'HOLD TO SIGN'}
      </div>
      <motion.div 
        animate={controls}
        initial={{ width: "0%" }}
        className="absolute top-0 left-0 bottom-0 bg-amber-600 z-0 origin-left"
      />
    </button>
  );
}

function PreviewCard({ form, isSigned, previewImage, previewLoading, previewMode, renderHtml, layoutVariant }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX(-((y - centerY) / centerY) * 2);
    setRotateY(((x - centerX) / centerX) * 2);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const isLandscape = layoutVariant === 'landscape';

  return (
    <motion.div 
      className={`w-full ${isLandscape ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'} bg-[#FBFAF6] border border-line relative overflow-hidden transition-transform duration-200 ease-out preserve-3d shadow-md`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Glare effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 mix-blend-overlay pointer-events-none transition-opacity duration-700 z-20" />

      {/* Loading overlay badge */}
      {previewLoading && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 px-2 py-1 bg-surface/90 border border-line font-mono text-[9px] text-amber-700 shadow-sm backdrop-blur-xs">
          <Loader2 size={11} className="animate-spin" />
          <span>SYNCING PDF...</span>
        </div>
      )}

      {/* Mode 1: LIVE INTERACTIVE HTML VIEW */}
      {previewMode === 'html' ? (
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
          {renderHtml ? renderHtml() : null}
          {isSigned && (
            <motion.div 
              initial={{ scale: 2, opacity: 0, rotate: -20 }} 
              animate={{ scale: 1, opacity: 1, rotate: -8 }} 
              className="absolute bottom-20 right-8 w-24 h-24 border-4 border-amber-600 rounded-full flex items-center justify-center text-amber-600 font-display font-bold text-lg mix-blend-multiply opacity-85 z-20 pointer-events-none"
            >
              VERIFIED
            </motion.div>
          )}
        </div>
      ) : (
        /* Mode 2: REAL REPORTLAB RENDERED PDF SNAPSHOT */
        previewImage ? (
          <div className="relative w-full h-full bg-white flex items-center justify-center">
            <img 
              src={previewImage} 
              alt="Real Certificate Preview" 
              className="w-full h-full object-contain select-none"
            />
            {isSigned && (
              <motion.div 
                initial={{ scale: 2, opacity: 0, rotate: -20 }} 
                animate={{ scale: 1, opacity: 1, rotate: -8 }} 
                className="absolute bottom-28 right-8 w-24 h-24 border-4 border-amber-600 rounded-full flex items-center justify-center text-amber-600 font-display font-bold text-lg mix-blend-multiply opacity-85 z-20"
              >
                VERIFIED
              </motion.div>
            )}
          </div>
        ) : (
          <div className="relative h-full px-6 py-8 text-center flex flex-col justify-between items-center w-full">
            <div className="absolute inset-2 border-[3px] border-double border-amber-600/30" />
            <div className="w-full my-auto flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-amber-600" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Generating Exact PDF Canvas...</p>
            </div>
          </div>
        )
      )}
    </motion.div>
  );
}

function SuccessCard({ result, onClose }) {
  const [hashText, setHashText] = useState('');
  
  useEffect(() => {
    const full = result.file_hash;
    let i = 0;
    const t = setInterval(() => {
      setHashText(full.slice(0, i+1));
      i++;
      if (i >= full.length) clearInterval(t);
    }, 10);
    return () => clearInterval(t);
  }, [result]);

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-surface border border-line shadow-hard p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-verdict-genuine-bg border border-verdict-genuine rounded-full flex items-center justify-center text-verdict-genuine">
            <Check size={32} strokeWidth={3} />
          </div>
        </div>
        
        <h2 className="font-display text-4xl text-ink text-center mb-2">Cryptographic Issuance Complete</h2>
        <p className="font-mono text-[10px] text-ink-muted text-center uppercase tracking-widest mb-8">ECDSA P-256 Signature Appended</p>
        
        <div className="bg-surface-2 border border-line p-4 font-mono text-[10px] text-ink-muted space-y-3 mb-8">
          <div className="flex justify-between border-b border-line pb-2">
            <span>RECIPIENT</span><span className="text-ink">{result.fields?.name}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span>CERT ID</span><span className="text-ink">{result.fields?.certificate_number}</span>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <span>SHA-256 HASH COMMITTED</span>
            <span className="text-amber-600 break-all leading-relaxed">{hashText}<span className="animate-pulse">_</span></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to={`/issuer/documents/${result.doc_id}`} className="flex-1">
            <button className="w-full py-3 bg-amber-500 text-ink font-mono font-bold text-[11px] uppercase border border-ink shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
              VIEW RECORD
            </button>
          </Link>
          <button 
            onClick={async () => {
              const url = assetUrl(result.pdf_url);
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Download failed');
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `${result.fields?.certificate_number || result.doc_id}.pdf`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                }, 1000);
              } catch (e) {
                // Fallback to direct navigation / new tab
                window.open(url, '_blank');
              }
            }}
            className="flex-1 py-3 bg-ink text-bg font-mono font-bold text-[11px] uppercase border border-ink shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
          >
            DOWNLOAD PDF
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-6 py-3 text-ink-muted font-mono text-[10px] uppercase hover:text-ink hover:underline">
          ISSUE ANOTHER
        </button>
      </motion.div>
    </motion.div>
  );
}
