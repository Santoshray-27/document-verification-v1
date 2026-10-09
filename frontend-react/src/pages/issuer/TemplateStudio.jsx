import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, Eye, Save, CheckCircle, AlertCircle, FileText, Move, Sliders, Palette } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import { useToast } from '../../components/Toast.jsx';

const DEFAULT_FIELDS = [
  { key: 'name', label: 'Recipient Name', x: 297, y: 320, font: 'Times-Bold', font_size: 26, align: 'center', color: '#1B2437', default_text: 'Aarav Sharma' },
  { key: 'course', label: 'Course / Qualification', x: 297, y: 390, font: 'Helvetica', font_size: 12, align: 'center', color: '#1B2437', default_text: 'Bachelor of Technology in Computer Engineering' },
  { key: 'grade', label: 'Grade / Distinction', x: 297, y: 425, font: 'Helvetica-Bold', font_size: 13, align: 'center', color: '#0A1F44', default_text: 'Grade: A+ with High Honours' },
  { key: 'certificate_number', label: 'Certificate ID', x: 297, y: 460, font: 'Courier-Bold', font_size: 10, align: 'center', color: '#5A6478', default_text: 'AGN-2026-001' },
  { key: 'issue_date', label: 'Issue Date', x: 297, y: 485, font: 'Helvetica', font_size: 10, align: 'center', color: '#5A6478', default_text: 'October 9, 2026' },
];

export default function TemplateStudio() {
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [docType, setDocType] = useState('academic_certificate');
  const [category, setCategory] = useState('CUSTOM');
  const [description, setDescription] = useState('');
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState('');
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState(0);

  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const { data } = await api.get('/templates/backgrounds');
      if (data.ok && data.backgrounds) {
        setBackgrounds(data.backgrounds);
        if (data.backgrounds.length > 0 && !selectedBackgroundId) {
          setSelectedBackgroundId(data.backgrounds[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('display_name', file.name.replace(/\.[^/.]+$/, ''));

    setUploadingBg(true);
    setError('');
    try {
      const { data } = await api.post('/templates/backgrounds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.ok && data.asset) {
        toast.success(`Uploaded background: ${file.name}`);
        await fetchBackgrounds();
        setSelectedBackgroundId(data.asset.id);
      }
    } catch (err) {
      setError(errMsg(err));
      toast.error(errMsg(err));
    } finally {
      setUploadingBg(false);
      e.target.value = '';
    }
  };

  const updateSelectedField = (key, val) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[selectedFieldIdx] = { ...copy[selectedFieldIdx], [key]: val };
      return copy;
    });
  };

  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    setError('');
    try {
      const { data } = await api.post('/templates/preview', {
        background_id: selectedBackgroundId || null,
        doc_type: docType,
        layout_config: { fields },
      });
      if (data.ok && data.preview_png_base64) {
        setPreviewImage(`data:image/png;base64,${data.preview_png_base64}`);
        toast.success('Generated realistic ReportLab preview');
      }
    } catch (err) {
      setError(errMsg(err));
      toast.error(errMsg(err));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveTemplate = async (publish = false) => {
    if (!name.trim()) {
      setError('Please provide a template title');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/templates/custom', {
        name: name.trim(),
        doc_type: docType,
        category: category || 'CUSTOM',
        description: description || 'Custom dynamic certificate design',
        background_id: selectedBackgroundId || null,
        page_size: 'A4',
        orientation: 'portrait',
        fields: fields.map((f) => f.key),
        required_fields: ['name'],
        layout_config: { fields },
        publish
      });
      if (data.ok) {
        toast.success(publish ? 'Custom template published!' : 'Template draft saved');
        navigate('/issuer/issue');
      }
    } catch (err) {
      setError(errMsg(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const activeField = fields[selectedFieldIdx] || fields[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="section-title">Certificate Design</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Custom Template Studio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Upload custom certificate background designs, position dynamic recipient variables, preview pixel-accurate ReportLab rendering, and publish reusable template versions for your organization.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Left Column: Configuration Controls */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <section className="glass p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-gold-400" /> Template Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="tpl_name">Template Name</label>
                <input
                  id="tpl_name"
                  type="text"
                  placeholder="e.g. Annual Hackathon Winner 2026"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="doc_type_select">Document Class</label>
                <select
                  id="doc_type_select"
                  className="input"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="academic_certificate">Academic Certificate</option>
                  <option value="marksheet">Official Marksheet</option>
                  <option value="bonafide">Bonafide Certificate</option>
                  <option value="employment_offer">Employment Offer</option>
                  <option value="commercial_invoice">Commercial Invoice</option>
                  <option value="medical_fitness">Medical Fitness</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="tpl_desc">Description (Optional)</label>
              <input
                id="tpl_desc"
                type="text"
                placeholder="Brief purpose or event description"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </section>

          {/* Background Selection & Upload */}
          <section className="glass p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Upload size={16} className="text-gold-400" /> Background Design
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-res A4 artwork (PNG or JPEG, up to 5MB).
                </p>
              </div>
              <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1.5">
                <Upload size={13} /> Upload Artwork
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  className="hidden"
                  disabled={uploadingBg}
                  onChange={handleBackgroundUpload}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedBackgroundId('')}
                className={`p-3 rounded-xl border text-left text-xs transition ${
                  selectedBackgroundId === ''
                    ? 'border-gold-400 bg-gold-400/10 text-white font-medium'
                    : 'border-white/10 bg-navy-800/40 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="font-semibold">Standard Parchment</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Evidentia classic border & ornaments</div>
              </button>

              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setSelectedBackgroundId(bg.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    selectedBackgroundId === bg.id
                      ? 'border-gold-400 bg-gold-400/10 text-white font-medium'
                      : 'border-white/10 bg-navy-800/40 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="font-semibold truncate">{bg.display_name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{bg.mime_type.split('/')[1]?.toUpperCase()} · {bg.width}x{bg.height}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Dynamic Field Controls */}
          <section className="glass p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders size={16} className="text-gold-400" /> Dynamic Field Layout
            </h2>
            <p className="text-xs text-slate-400">
              Select a field to configure its font, coordinate placement, size, and styling.
            </p>

            {/* Field selector tabs */}
            <div className="flex flex-wrap gap-2">
              {fields.map((f, idx) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFieldIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedFieldIdx === idx
                      ? 'bg-gold-400 text-navy-900 font-semibold'
                      : 'bg-navy-800/80 text-slate-300 hover:bg-navy-800 border border-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Active field configuration */}
            {activeField && (
              <div className="rounded-xl border border-white/10 p-4 bg-navy-800/40 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label text-[11px]">X Coordinate (pt)</label>
                    <input
                      type="number"
                      className="input text-xs"
                      value={activeField.x}
                      onChange={(e) => updateSelectedField('x', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Y from Top (pt)</label>
                    <input
                      type="number"
                      className="input text-xs"
                      value={activeField.y}
                      onChange={(e) => updateSelectedField('y', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Font Size (pt)</label>
                    <input
                      type="number"
                      className="input text-xs"
                      value={activeField.font_size}
                      onChange={(e) => updateSelectedField('font_size', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Alignment</label>
                    <select
                      className="input text-xs"
                      value={activeField.align}
                      onChange={(e) => updateSelectedField('align', e.target.value)}
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-[11px]">Font Family</label>
                    <select
                      className="input text-xs"
                      value={activeField.font}
                      onChange={(e) => updateSelectedField('font', e.target.value)}
                    >
                      <option value="Helvetica">Helvetica (Clean Sans)</option>
                      <option value="Helvetica-Bold">Helvetica Bold</option>
                      <option value="Times-Bold">Times Bold (Serif Formal)</option>
                      <option value="Times-Roman">Times Roman</option>
                      <option value="Courier-Bold">Courier Bold (Monospace)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-[11px]">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeField.color}
                        onChange={(e) => updateSelectedField('color', e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={activeField.color}
                        onChange={(e) => updateSelectedField('color', e.target.value)}
                        className="input text-xs mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={previewLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye size={16} />
              {previewLoading ? 'Rendering...' : 'Render Realistic Preview'}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveTemplate(false)}
                disabled={saving}
                className="btn-secondary text-xs"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveTemplate(true)}
                disabled={saving}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                Publish Template
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Live Renderer Preview */}
        <div className="lg:sticky lg:top-24 lg:h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye size={16} className="text-gold-400" /> ReportLab Renderer Preview
            </h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Pixel-Accurate PDF Output
            </span>
          </div>

          <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center min-h-[540px] border border-white/10 bg-navy-950/60 overflow-hidden">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Template preview"
                className="w-full max-w-[440px] rounded-lg shadow-2xl border border-white/20"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400">
                  <Sparkles size={24} />
                </div>
                <div className="text-sm font-semibold text-slate-200">No Preview Generated Yet</div>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Configure your background and coordinates, then click &ldquo;Render Realistic Preview&rdquo; to see the exact PDF snapshot generated by Python ReportLab.
                </p>
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={previewLoading}
                  className="btn-secondary text-xs mt-2"
                >
                  Generate Initial Preview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
