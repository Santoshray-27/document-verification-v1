import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, RefreshCw, Eye, ShieldCheck, FileCheck, Layers, HelpCircle,
  FileText, Check, AlertCircle, ChevronDown
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function BulkIssuance() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Workflow steps: 1: 'select_template', 2: 'upload_validate', 3: 'preview_confirm', 4: 'processing_results'
  const [step, setStep] = useState(1);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('tpl_acad_01');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // File & Upload
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Validation response
  const [batchData, setBatchData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [skipInvalid, setSkipInvalid] = useState(true);

  // Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Execution & Live Progress
  const [starting, setStarting] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [pollActive, setPollActive] = useState(false);

  // Load available templates
  useEffect(() => {
    async function fetchTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await api.get('/templates');
        const list = res.data?.templates || [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(list[0].id);
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Download sample CSV
  const handleDownloadSample = () => {
    window.open(`/api/issue/bulk/sample-template?template_id=${encodeURIComponent(selectedTemplateId)}`, '_blank');
  };

  // Handle file select
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setValidationError('');
    }
  };

  // Upload and validate spreadsheet
  const handleValidateSpreadsheet = async () => {
    if (!file) {
      setValidationError('Please select a CSV or XLSX file');
      return;
    }

    setValidating(true);
    setValidationError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('template_id', selectedTemplateId);
    if (Object.keys(columnMapping).length > 0) {
      formData.append('mapping', JSON.stringify(columnMapping));
    }

    try {
      const res = await api.post('/issue/bulk/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.ok) {
        setBatchData(res.data);
        setColumnMapping(res.data.mapping || {});
        setStep(3); // Go to Preview & Confirm
      } else {
        setValidationError(res.data?.error?.message || 'Validation failed');
      }
    } catch (e) {
      setValidationError(e.response?.data?.error?.message || e.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Generate synthetic preview using first valid row or template defaults
  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    try {
      const firstValidRow = batchData?.rows_preview?.find(r => r.is_valid);
      const sampleFields = firstValidRow?.mapped_data || {};
      const res = await api.post('/templates/preview', {
        templateId: selectedTemplateId,
        sample_fields: sampleFields
      });
      if (res.data?.preview_png_base64) {
        setPreviewImage(`data:image/png;base64,${res.data.preview_png_base64}`);
      }
    } catch (e) {
      console.error('Failed to generate preview:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Start batch issuance
  const handleStartIssuance = async () => {
    if (!batchData?.batch_id) return;

    setStarting(true);
    try {
      const res = await api.post('/issue/bulk/start', {
        batch_id: batchData.batch_id,
        skip_invalid: skipInvalid,
        doc_type: selectedTemplate?.doc_type || 'academic_certificate'
      });

      if (res.data?.ok) {
        setStep(4); // Go to Progress & Results
        setPollActive(true);
      }
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Failed to start batch issuance');
    } finally {
      setStarting(false);
    }
  };

  // Polling for live batch progress
  useEffect(() => {
    let timer;
    if (pollActive && batchData?.batch_id) {
      const fetchStatus = async () => {
        try {
          const res = await api.get(`/issue/bulk/jobs/${batchData.batch_id}`);
          if (res.data?.ok) {
            setJobStatus(res.data);
            const status = res.data.batch?.status;
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
              setPollActive(false);
            }
          }
        } catch (e) {
          console.error('Error polling batch status:', e);
        }
      };

      fetchStatus();
      timer = setInterval(fetchStatus, 1500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pollActive, batchData?.batch_id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Bulk Certificate Issuance
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Upload spreadsheets, map columns, validate records, and issue cryptographically signed certificates in bulk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <ShieldCheck size={14} /> Deterministic ECDSA P-256 Signing
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mt-6 flex items-center justify-between border-y border-white/[0.08] py-3 text-xs sm:text-sm">
          {[
            { num: 1, label: '1. Select Template' },
            { num: 2, label: '2. Upload & Map' },
            { num: 3, label: '3. Validate & Preview' },
            { num: 4, label: '4. Issue & Download' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                if (s.num < step || (s.num === 2 && selectedTemplateId)) {
                  setStep(s.num);
                }
              }}
              disabled={s.num > step}
              className={`flex items-center gap-1.5 font-medium transition ${
                step === s.num
                  ? 'text-gold-400'
                  : s.num < step
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  step === s.num
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-400/30'
                    : s.num < step
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {s.num < step ? <Check size={12} /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Template */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
            <p className="mt-1 text-sm text-slate-400">
              Select the certificate design and schema for your recipient batch. You can choose from system defaults or your published custom templates.
            </p>

            {loadingTemplates ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                <RefreshCw size={18} className="mr-2 animate-spin text-gold-400" /> Loading templates...
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const reqFields = tpl.required_json ? JSON.parse(tpl.required_json) : [];

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`cursor-pointer rounded-lg border p-4 transition ${
                        isSelected
                          ? 'border-gold-400/80 bg-gold-500/10 shadow-lg shadow-gold-500/5'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-block rounded border border-white/10 bg-navy-950/60 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                          {tpl.is_system === 1 ? 'System' : 'Custom'}
                        </span>
                        {isSelected && <CheckCircle2 size={16} className="text-gold-400" />}
                      </div>

                      <h3 className="mt-3 font-semibold text-white">{tpl.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{tpl.description}</p>

                      <div className="mt-4 border-t border-white/[0.06] pt-3">
                        <span className="text-[11px] font-medium text-slate-400">Required Columns:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {reqFields.map((rf) => (
                            <span key={rf} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">
                              {rf}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
              <button
                onClick={handleDownloadSample}
                className="btn-ghost flex items-center gap-2 text-xs text-gold-300 hover:text-gold-200"
              >
                <Download size={14} /> Download Sample CSV for Selected Template
              </button>

              <button
                onClick={() => setStep(2)}
                disabled={!selectedTemplateId}
                className="btn-primary flex items-center gap-2"
              >
                Next: Upload Spreadsheet <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Upload Spreadsheet & Column Mapping */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Recipient Data</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Upload a CSV or XLSX file containing student/recipient records for{' '}
                  <span className="font-medium text-gold-400">{selectedTemplate?.name}</span>.
                </p>
              </div>

              <button
                onClick={handleDownloadSample}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Download size={13} /> Sample CSV Template
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] p-8 text-center transition hover:border-gold-400/60 hover:bg-white/[0.04] cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet size={40} className="text-gold-400/80 mb-3" />
              <p className="text-sm font-semibold text-white">
                {file ? file.name : 'Click or drag a CSV or XLSX spreadsheet here'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Supports up to 500 rows per batch · Max file size 10MB
              </p>
              {file && (
                <div className="mt-3 flex items-center gap-2 rounded bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">
                  <Check size={13} /> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {validationError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle size={15} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-6">
              <button onClick={() => setStep(1)} className="btn-ghost">
                Back to Templates
              </button>
              <button
                onClick={handleValidateSpreadsheet}
                disabled={!file || validating}
                className="btn-primary flex items-center gap-2"
              >
                {validating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Validating Spreadsheet...
                  </>
                ) : (
                  <>
                    Validate & Preview <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: Validate & Preview Before Issuance */}
      {step === 3 && batchData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-4">
              <div className="text-xs font-medium text-slate-400">Total Rows</div>
              <div className="mt-1 text-2xl font-bold text-white">{batchData.summary.total_rows}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-xs font-medium text-emerald-300">Valid & Ready</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">{batchData.summary.valid_rows}</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="text-xs font-medium text-rose-300">Invalid Rows</div>
              <div className="mt-1 text-2xl font-bold text-rose-400">{batchData.summary.invalid_rows}</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-xs font-medium text-amber-300">Duplicates</div>
              <div className="mt-1 text-2xl font-bold text-amber-400">{batchData.summary.duplicate_rows}</div>
            </div>
          </div>

          {/* Column Mapping Correction */}
          <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Verified Column Mapping</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Ensure the template fields map to the correct spreadsheet column headers.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchData.template.fields.map((field) => {
                const isRequired = batchData.template.required_fields.includes(field);
                return (
                  <div key={field} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <label className="block text-xs font-medium text-slate-300">
                      {field} {isRequired && <span className="text-rose-400">*</span>}
                    </label>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, [field]: e.target.value };
                        setColumnMapping(newMapping);
                      }}
                      className="mt-1.5 w-full rounded border border-white/10 bg-navy-950 px-2.5 py-1.5 text-xs text-white focus:border-gold-400 focus:outline-none"
                    >
                      <option value="">-- Not Mapped --</option>
                      {batchData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row Preview Table */}
          <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
            <h3 className="text-base font-semibold text-white">Row-by-Row Preview</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Inspecting parsed spreadsheet rows before certificate creation.
            </p>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-navy-950 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Cert #</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {batchData.rows_preview?.map((row) => (
                    <tr key={row.row_number} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-slate-400">{row.row_number}</td>
                      <td className="px-3 py-2">
                        {row.is_valid ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <CheckCircle2 size={11} /> Valid
                          </span>
                        ) : row.validation_status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            <AlertTriangle size={11} /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                            <XCircle size={11} /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-white">{row.mapped_data?.name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{row.mapped_data?.certificate_number || '—'}</td>
                      <td className="px-3 py-2">{row.mapped_data?.course || '—'}</td>
                      <td className="px-3 py-2">{row.mapped_data?.grade || '—'}</td>
                      <td className="px-3 py-2 text-rose-400">
                        {row.errors?.length > 0 ? row.errors.join('; ') : <span className="text-emerald-400">Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Policy & Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="rounded border-white/20 bg-navy-950 text-gold-500 focus:ring-0"
                />
                Skip invalid/duplicate rows and issue certificates for all valid records ({batchData.summary.valid_rows})
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGeneratePreview}
                  disabled={previewLoading}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  {previewLoading ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
                  Sample Preview
                </button>
                <button
                  onClick={handleStartIssuance}
                  disabled={starting || batchData.summary.valid_rows === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {starting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Starting Batch...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Confirm & Issue {batchData.summary.valid_rows} Certificates
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sample Preview Modal/Box */}
            {previewImage && (
              <div className="mt-6 rounded-xl border border-white/10 bg-navy-950/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gold-400">Synthetic Visual Preview</span>
                  <button onClick={() => setPreviewImage(null)} className="text-xs text-slate-400 hover:text-white">
                    Close Preview
                  </button>
                </div>
                <img
                  src={previewImage}
                  alt="Certificate Preview"
                  className="mx-auto max-h-96 rounded border border-white/10 shadow-2xl object-contain"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* STEP 4: Live Progress & Downloads */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Batch Issuance Status</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Batch ID: <span className="font-mono text-gold-400">{batchData?.batch_id}</span>
                </p>
              </div>

              {jobStatus?.batch?.status === 'completed' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 size={14} /> Batch Completed
                </span>
              ) : jobStatus?.batch?.status === 'processing' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-300">
                  <RefreshCw size={14} className="animate-spin" /> Processing Batch...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-300">
                  {jobStatus?.batch?.status || 'Pending'}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>Progress: {jobStatus?.batch?.progress_percent || 0}%</span>
                <span>
                  {jobStatus?.batch?.succeeded_rows || 0} of {jobStatus?.batch?.total_rows || 0} succeeded
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-gold-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${jobStatus?.batch?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-xs text-slate-400">Total</div>
                <div className="mt-1 text-lg font-bold text-white">{jobStatus?.batch?.total_rows || 0}</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="text-xs text-emerald-300">Issued</div>
                <div className="mt-1 text-lg font-bold text-emerald-400">{jobStatus?.batch?.succeeded_rows || 0}</div>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
                <div className="text-xs text-rose-300">Failed</div>
                <div className="mt-1 text-lg font-bold text-rose-400">{jobStatus?.batch?.failed_rows || 0}</div>
              </div>
              <div className="rounded-lg border border-slate-500/20 bg-slate-500/10 p-3">
                <div className="text-xs text-slate-400">Skipped</div>
                <div className="mt-1 text-lg font-bold text-slate-400">{jobStatus?.batch?.skipped_rows || 0}</div>
              </div>
            </div>

            {/* Action Buttons: ZIP & CSV Download */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-6">
              <a
                href={`/api/issue/bulk/jobs/${batchData?.batch_id}/download`}
                download
                className={`btn-primary flex items-center gap-2 ${
                  (jobStatus?.batch?.succeeded_rows || 0) === 0 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <Download size={15} /> Download All Issued Certificates (.ZIP)
              </a>

              <a
                href={`/api/issue/bulk/jobs/${batchData?.batch_id}/report`}
                download
                className="btn-secondary flex items-center gap-2"
              >
                <FileSpreadsheet size={15} /> Download CSV Outcome Report
              </a>

              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setBatchData(null);
                  setJobStatus(null);
                }}
                className="btn-ghost ml-auto text-xs"
              >
                Issue Another Batch
              </button>
            </div>
          </div>

          {/* Row Outcome Breakdown */}
          {jobStatus?.rows && (
            <div className="rounded-xl border border-white/[0.08] bg-navy-900/60 p-6 backdrop-blur-xl">
              <h3 className="text-base font-semibold text-white">Individual Certificate Outcomes</h3>
              <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-navy-950 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Document ID</th>
                      <th className="px-3 py-2">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {jobStatus.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-slate-400">{row.row_number}</td>
                        <td className="px-3 py-2">
                          {row.status === 'succeeded' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <CheckCircle2 size={11} /> Issued
                            </span>
                          ) : row.status === 'running' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-300">
                              <RefreshCw size={11} className="animate-spin" /> Signing...
                            </span>
                          ) : row.status === 'skipped' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                              Skipped
                            </span>
                          ) : row.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                              Failed
                            </span>
                          ) : (
                            <span className="text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-white">{row.fields?.name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{row.doc_id || '—'}</td>
                        <td className="px-3 py-2">
                          {row.pdf_url ? (
                            <a
                              href={row.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-gold-400 hover:text-gold-300 hover:underline"
                            >
                              <FileText size={12} /> View PDF
                            </a>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
