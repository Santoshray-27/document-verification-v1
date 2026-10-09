import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, RefreshCw, Eye, ShieldCheck, FileCheck, Layers, HelpCircle,
  FileText, Check, AlertCircle, Sparkles, ChevronRight
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

  // Download sample CSV or pre-generated XLSX
  const handleDownloadSample = async () => {
    try {
      const res = await api.get(`/issue/bulk/sample-template?template_id=${encodeURIComponent(selectedTemplateId)}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evidentia_${selectedTemplateId}_sample.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback to static sample excel workbook
      window.open('/sample_bulk_recipients.xlsx', '_blank');
    }
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
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Issuer Portal / Bulk Issuance
            </span>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl tracking-tight text-ink">
              Bulk Certificate Issuance
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Upload spreadsheets, map columns, preview validation records, and generate cryptographically signed certificates in bulk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-3 py-1 font-mono text-[11px] font-medium text-ink shadow-sm">
              <ShieldCheck size={14} className="text-amber-600" /> ECDSA P-256 Signatures
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mt-8 flex items-center justify-between border-y border-line py-3 text-xs">
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
              className={`flex items-center gap-2 font-mono transition outline-none ${
                step === s.num
                  ? 'text-ink font-bold'
                  : s.num < step
                  ? 'text-ink-muted hover:text-ink cursor-pointer'
                  : 'text-ink-muted/50 cursor-not-allowed'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold border transition ${
                  step === s.num
                    ? 'bg-amber-500 text-ink border-amber-500 shadow-sm'
                    : s.num < step
                    ? 'bg-ink text-bg border-ink'
                    : 'bg-surface border-line text-ink-muted'
                }`}
              >
                {s.num < step ? <Check size={10} /> : s.num}
              </span>
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Template */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Choose a Template</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Select the certificate schema for your recipient batch. Built-in catalog designs and custom templates are supported.
                </p>
              </div>
            </div>

            {loadingTemplates ? (
              <div className="flex h-40 items-center justify-center font-mono text-xs text-ink-muted">
                <RefreshCw size={16} className="mr-2 animate-spin text-amber-600" /> Loading templates...
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
                      className={`relative cursor-pointer border p-5 flex flex-col transition-all duration-200 ${
                        isSelected
                          ? 'border-ink bg-surface shadow-hard -translate-y-0.5'
                          : 'border-line bg-surface-2 hover:border-ink-muted hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-block border border-line bg-surface px-2 py-0.5 font-mono text-[9px] uppercase font-bold text-ink-muted">
                          {tpl.is_system === 1 ? 'System' : 'Custom'}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 bg-ink rounded-sm flex items-center justify-center">
                            <Check size={11} className="text-bg" />
                          </div>
                        )}
                      </div>

                      <h3 className="mt-3 font-mono text-xs font-bold uppercase tracking-tight text-ink">{tpl.name}</h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">{tpl.description}</p>

                      <div className="mt-4 border-t border-line pt-3">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Required Columns:</span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {reqFields.map((rf) => (
                            <span key={rf} className="border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-ink">
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

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <button
                onClick={handleDownloadSample}
                className="btn-ghost flex items-center gap-2 font-mono text-xs"
              >
                <Download size={13} /> Sample CSV Template
              </button>

              <button
                onClick={() => setStep(2)}
                disabled={!selectedTemplateId}
                className="btn-primary flex items-center gap-2 font-mono text-xs"
              >
                Next: Upload Spreadsheet <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Upload Spreadsheet & Column Mapping */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Upload Recipient Data</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Upload a spreadsheet (.xlsx or .csv) for{' '}
                  <span className="font-bold text-ink underline">{selectedTemplate?.name}</span>.
                </p>
              </div>

              <button
                onClick={handleDownloadSample}
                className="btn-ghost flex items-center gap-1.5 font-mono text-xs"
              >
                <Download size={13} /> Sample Template
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-line bg-surface-2 p-10 text-center transition hover:border-ink hover:bg-surface cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet size={42} className="text-amber-600 mb-3" />
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                {file ? file.name : 'Click to select or drop an Excel (.xlsx) or CSV file'}
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink-muted">
                Accepts .xlsx and .csv · Up to 500 rows per batch · Max file size 10MB
              </p>
              {file && (
                <div className="mt-4 flex items-center gap-2 border border-line bg-surface px-3 py-1 font-mono text-xs text-ink shadow-sm">
                  <Check size={12} className="text-amber-600" /> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {validationError && (
              <div className="mt-4 flex items-center gap-2 border border-red-300 bg-red-50 p-3 font-mono text-xs text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
              <button onClick={() => setStep(1)} className="btn-ghost font-mono text-xs">
                Back to Templates
              </button>
              <button
                onClick={handleValidateSpreadsheet}
                disabled={!file || validating}
                className="btn-primary flex items-center gap-2 font-mono text-xs"
              >
                {validating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Validating Spreadsheet...
                  </>
                ) : (
                  <>
                    Validate & Preview <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: Validate & Preview Before Issuance */}
      {step === 3 && batchData && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border border-line bg-surface p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-ink-muted">Total Rows</div>
              <div className="mt-1 font-mono text-2xl font-bold text-ink">{batchData.summary.total_rows}</div>
            </div>
            <div className="border border-emerald-300 bg-emerald-50/60 p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-emerald-800">Valid & Ready</div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">{batchData.summary.valid_rows}</div>
            </div>
            <div className="border border-red-300 bg-red-50/60 p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-red-800">Invalid Rows</div>
              <div className="mt-1 font-mono text-2xl font-bold text-red-700">{batchData.summary.invalid_rows}</div>
            </div>
            <div className="border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
              <div className="font-mono text-[10px] uppercase text-amber-800">Duplicates</div>
              <div className="mt-1 font-mono text-2xl font-bold text-amber-700">{batchData.summary.duplicate_rows}</div>
            </div>
          </div>

          {/* Column Mapping Correction */}
          <div className="border border-line bg-surface p-6 shadow-sm">
            <div className="border-b border-line pb-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Column Mapping</h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                Confirm spreadsheet columns map to the expected certificate fields.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchData.template.fields.map((field) => {
                const isRequired = batchData.template.required_fields.includes(field);
                return (
                  <div key={field} className="border border-line bg-surface-2 p-3">
                    <label className="block font-mono text-[10px] uppercase text-ink font-bold">
                      {field} {isRequired && <span className="text-red-600">*</span>}
                    </label>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => {
                        const newMapping = { ...columnMapping, [field]: e.target.value };
                        setColumnMapping(newMapping);
                      }}
                      className="mt-1.5 w-full border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:border-ink outline-none"
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
          <div className="border border-line bg-surface p-6 shadow-sm">
            <h3 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Row-by-Row Preview</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Inspect parsed spreadsheet rows before cryptographic signing.
            </p>

            <div className="mt-4 max-h-80 overflow-y-auto border border-line">
              <table className="w-full text-left text-xs text-ink">
                <thead className="sticky top-0 bg-surface-2 font-mono text-[10px] uppercase text-ink-muted border-b border-line">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Cert #</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {batchData.rows_preview?.map((row) => (
                    <tr key={row.row_number} className="hover:bg-surface-2 transition">
                      <td className="px-3 py-2 font-mono text-ink-muted">{row.row_number}</td>
                      <td className="px-3 py-2">
                        {row.is_valid ? (
                          <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                            <CheckCircle2 size={11} /> Valid
                          </span>
                        ) : row.validation_status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                            <AlertTriangle size={11} /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-800">
                            <XCircle size={11} /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink">{row.mapped_data?.name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-ink-muted">{row.mapped_data?.certificate_number || '—'}</td>
                      <td className="px-3 py-2 text-ink-muted">{row.mapped_data?.course || '—'}</td>
                      <td className="px-3 py-2 text-ink-muted">{row.mapped_data?.grade || '—'}</td>
                      <td className="px-3 py-2">
                        {row.errors?.length > 0 ? (
                          <span className="font-mono text-[10px] text-red-600">{row.errors.join('; ')}</span>
                        ) : (
                          <span className="font-mono text-[10px] text-emerald-700">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Policy & Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-ink">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="border-line accent-amber-500"
                />
                Skip invalid/duplicate rows and issue ({batchData.summary.valid_rows}) valid certificates
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGeneratePreview}
                  disabled={previewLoading}
                  className="btn-ghost flex items-center gap-1.5 font-mono text-xs"
                >
                  {previewLoading ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
                  Sample Preview
                </button>
                <button
                  onClick={handleStartIssuance}
                  disabled={starting || batchData.summary.valid_rows === 0}
                  className="btn-primary flex items-center gap-2 font-mono text-xs"
                >
                  {starting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Starting Batch...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Confirm & Issue {batchData.summary.valid_rows} Certificates
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sample Preview Box */}
            {previewImage && (
              <div className="mt-6 border border-line bg-surface-2 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
                  <span className="font-mono text-xs font-bold uppercase text-ink">Synthetic Visual Preview</span>
                  <button onClick={() => setPreviewImage(null)} className="font-mono text-xs text-ink-muted hover:text-ink">
                    Close Preview
                  </button>
                </div>
                <img
                  src={previewImage}
                  alt="Certificate Preview"
                  className="mx-auto max-h-96 border border-line bg-white shadow-md object-contain"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* STEP 4: Live Progress & Downloads */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Batch Issuance Status</h2>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  Batch ID: <span className="font-bold text-ink">{batchData?.batch_id}</span>
                </p>
              </div>

              {jobStatus?.batch?.status === 'completed' ? (
                <span className="inline-flex items-center gap-1.5 border border-emerald-300 bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={13} /> Batch Completed
                </span>
              ) : jobStatus?.batch?.status === 'processing' ? (
                <span className="inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-800">
                  <RefreshCw size={13} className="animate-spin text-amber-600" /> Processing Batch...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-line bg-surface-2 px-3 py-1 font-mono text-xs text-ink-muted">
                  {jobStatus?.batch?.status || 'Pending'}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between font-mono text-xs text-ink-muted">
                <span>Progress: {jobStatus?.batch?.progress_percent || 0}%</span>
                <span>
                  {jobStatus?.batch?.succeeded_rows || 0} of {jobStatus?.batch?.total_rows || 0} completed
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden border border-line bg-surface-2">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${jobStatus?.batch?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
              <div className="border border-line bg-surface-2 p-3">
                <div className="font-mono text-[10px] uppercase text-ink-muted">Total</div>
                <div className="mt-1 font-mono text-lg font-bold text-ink">{jobStatus?.batch?.total_rows || 0}</div>
              </div>
              <div className="border border-emerald-300 bg-emerald-50/60 p-3">
                <div className="font-mono text-[10px] uppercase text-emerald-800">Issued</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-700">{jobStatus?.batch?.succeeded_rows || 0}</div>
              </div>
              <div className="border border-red-300 bg-red-50/60 p-3">
                <div className="font-mono text-[10px] uppercase text-red-800">Failed</div>
                <div className="mt-1 font-mono text-lg font-bold text-red-700">{jobStatus?.batch?.failed_rows || 0}</div>
              </div>
              <div className="border border-line bg-surface-2 p-3">
                <div className="font-mono text-[10px] uppercase text-ink-muted">Skipped</div>
                <div className="mt-1 font-mono text-lg font-bold text-ink-muted">{jobStatus?.batch?.skipped_rows || 0}</div>
              </div>
            </div>

            {/* Action Buttons: ZIP & CSV Download */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <button
                onClick={async () => {
                  if (!batchData?.batch_id) return;
                  try {
                    const res = await api.get(`/issue/bulk/jobs/${batchData.batch_id}/download`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `evidentia_batch_${batchData.batch_id}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    alert('Failed to download ZIP archive');
                  }
                }}
                disabled={(jobStatus?.batch?.succeeded_rows || 0) === 0}
                className={`btn-primary flex items-center gap-2 font-mono text-xs ${
                  (jobStatus?.batch?.succeeded_rows || 0) === 0 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <Download size={14} /> Download All Issued PDFs (.ZIP)
              </button>

              <button
                onClick={async () => {
                  if (!batchData?.batch_id) return;
                  try {
                    const res = await api.get(`/issue/bulk/jobs/${batchData.batch_id}/report`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `evidentia_batch_${batchData.batch_id}_report.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    alert('Failed to download CSV outcome report');
                  }
                }}
                className="btn-ghost flex items-center gap-2 font-mono text-xs"
              >
                <FileSpreadsheet size={14} /> Download CSV Outcome Report
              </button>

              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setBatchData(null);
                  setJobStatus(null);
                }}
                className="btn-ghost ml-auto font-mono text-xs"
              >
                Issue Another Batch
              </button>
            </div>
          </div>

          {/* Row Outcome Breakdown */}
          {jobStatus?.rows && (
            <div className="border border-line bg-surface p-6 shadow-sm">
              <h3 className="font-mono text-xs uppercase tracking-widest text-ink font-bold">Individual Certificate Outcomes</h3>
              <div className="mt-4 max-h-80 overflow-y-auto border border-line">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="sticky top-0 bg-surface-2 font-mono text-[10px] uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Document ID</th>
                      <th className="px-3 py-2">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {jobStatus.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-2 transition">
                        <td className="px-3 py-2 font-mono text-ink-muted">{row.row_number}</td>
                        <td className="px-3 py-2">
                          {row.status === 'succeeded' ? (
                            <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                              <CheckCircle2 size={11} /> Issued
                            </span>
                          ) : row.status === 'running' ? (
                            <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                              <RefreshCw size={11} className="animate-spin text-amber-600" /> Signing...
                            </span>
                          ) : row.status === 'skipped' ? (
                            <span className="inline-flex items-center gap-1 border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-ink-muted">
                              Skipped
                            </span>
                          ) : row.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-800">
                              Failed
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-ink-muted">Pending</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-ink">{row.fields?.name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">{row.doc_id || '—'}</td>
                        <td className="px-3 py-2">
                          {row.pdf_url ? (
                            <a
                              href={row.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 hover:underline"
                            >
                              <FileText size={12} /> View PDF
                            </a>
                          ) : (
                            <span className="font-mono text-ink-muted/50">—</span>
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
