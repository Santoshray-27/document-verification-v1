import { useEffect, useState } from 'react';
import { Palette, Upload, Trash2, Plus, Sparkles, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import api, { errMsg } from '../../api/axios';
import { useToast } from '../../components/Toast.jsx';

export default function BrandingSettings() {
  const toast = useToast();
  const [branding, setBranding] = useState({
    primary_color: '#0A1F44',
    accent_color: '#C9A227',
    primary_logo_id: null,
    event_logo_id: null,
    signatory_id: null,
    seal_id: null,
    sponsor_ids: [],
    assets: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/branding');
      if (data.ok && data.branding) {
        setBranding(data.branding);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/branding', {
        primary_color: branding.primary_color,
        accent_color: branding.accent_color,
        primary_logo_id: branding.primary_logo_id,
        event_logo_id: branding.event_logo_id,
        signatory_id: branding.signatory_id,
        seal_id: branding.seal_id,
        sponsor_ids: branding.sponsor_ids
      });
      if (data.ok) {
        setBranding(data.branding);
        toast.success('Branding profile saved successfully');
      }
    } catch (e) {
      setError(errMsg(e));
      toast.error('Failed to save branding profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, assetType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    formData.append('display_name', file.name.replace(/\.[^/.]+$/, ''));

    setUploading(true);
    setError('');
    try {
      const { data } = await api.post('/branding/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.ok && data.asset) {
        toast.success(`Uploaded ${file.name}`);
        // Refresh full branding to get updated asset list
        await fetchBranding();
      }
    } catch (e) {
      setError(errMsg(e));
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAsset = async (assetId) => {
    try {
      await api.delete(`/branding/assets/${assetId}`);
      toast.success('Asset removed');
      await fetchBranding();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const toggleSponsor = (assetId) => {
    setBranding((prev) => {
      const exists = prev.sponsor_ids.includes(assetId);
      const updated = exists
        ? prev.sponsor_ids.filter((id) => id !== assetId)
        : [...prev.sponsor_ids, assetId].slice(0, 8);
      return { ...prev, sponsor_ids: updated };
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-white/10"></div>
          <div className="h-4 w-96 rounded bg-white/5"></div>
          <div className="h-64 rounded-xl bg-white/5"></div>
        </div>
      </div>
    );
  }

  const primaryLogos = branding.assets.filter((a) => a.asset_type === 'primary_logo');
  const eventLogos = branding.assets.filter((a) => a.asset_type === 'event_logo');
  const sponsorLogos = branding.assets.filter((a) => a.asset_type === 'sponsor_logo' || a.asset_type === 'partner_logo');
  const signatories = branding.assets.filter((a) => a.asset_type === 'signatory');
  const seals = branding.assets.filter((a) => a.asset_type === 'seal');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="section-title">Organization Settings</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Branding & Sponsor Logos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Customize certificate header branding, institution emblems, signatory stamps, and multiple partner or sponsor logos for your organization.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Color controls */}
        <section className="glass p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Palette size={18} className="text-gold-400" /> Brand Color Palette
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label" htmlFor="primary_color">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primary_color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="input mono max-w-[140px]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used for outer border and dominant header text.</p>
            </div>

            <div>
              <label className="label" htmlFor="accent_color">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="accent_color"
                  value={branding.accent_color}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={branding.accent_color}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="input mono max-w-[140px]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used for inner borders, corner ornaments, and highlights.</p>
            </div>
          </div>
        </section>

        {/* Primary and Event Logos */}
        <section className="glass p-6 rounded-2xl space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon size={18} className="text-gold-400" /> Header Logos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Logo */}
            <div className="rounded-xl border border-white/10 p-4 bg-navy-800/40">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Primary Institution Logo</label>
                <label className="cursor-pointer text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  <Upload size={13} /> Upload PNG/JPG
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, 'primary_logo')}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Positioned at top-left of certificates.</p>

              <select
                className="input text-xs"
                value={branding.primary_logo_id || ''}
                onChange={(e) => setBranding({ ...branding, primary_logo_id: e.target.value || null })}
              >
                <option value="">No primary logo (Default)</option>
                {primaryLogos.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>

              {branding.primary_logo_id && (
                <div className="mt-3 flex items-center justify-between p-2 rounded bg-navy-900/60 border border-white/5">
                  <img
                    src={`/api/branding/assets/${branding.primary_logo_id}`}
                    alt="Primary logo preview"
                    className="h-10 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(branding.primary_logo_id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Delete asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Event/Partner Logo */}
            <div className="rounded-xl border border-white/10 p-4 bg-navy-800/40">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Event / Program Logo</label>
                <label className="cursor-pointer text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  <Upload size={13} /> Upload PNG/JPG
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, 'event_logo')}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Positioned at top-right of certificates.</p>

              <select
                className="input text-xs"
                value={branding.event_logo_id || ''}
                onChange={(e) => setBranding({ ...branding, event_logo_id: e.target.value || null })}
              >
                <option value="">No event logo (Default)</option>
                {eventLogos.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>

              {branding.event_logo_id && (
                <div className="mt-3 flex items-center justify-between p-2 rounded bg-navy-900/60 border border-white/5">
                  <img
                    src={`/api/branding/assets/${branding.event_logo_id}`}
                    alt="Event logo preview"
                    className="h-10 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(branding.event_logo_id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Delete asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Multiple Sponsors / Partners */}
        <section className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-gold-400" /> Multiple Sponsor & Partner Logos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select up to 8 sponsor logos to render in the dedicated footer row (placed safely beside the QR code).
              </p>
            </div>
            <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1.5">
              <Upload size={14} /> Add Sponsor Logo
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleFileUpload(e, 'sponsor_logo')}
              />
            </label>
          </div>

          {sponsorLogos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
              No sponsor logos uploaded yet. Click &ldquo;Add Sponsor Logo&rdquo; above to upload sponsor badges.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sponsorLogos.map((s) => {
                const isSelected = branding.sponsor_ids.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSponsor(s.id)}
                    className={`relative cursor-pointer p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-gold-400 bg-gold-400/10 shadow'
                        : 'border-white/10 bg-navy-800/40 hover:border-white/20'
                    }`}
                  >
                    <div className="h-14 flex items-center justify-center mb-2">
                      <img
                        src={`/api/branding/assets/${s.id}`}
                        alt={s.display_name}
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] font-medium text-slate-200 truncate">{s.display_name}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {isSelected ? <span className="text-gold-400 font-semibold">Active</span> : 'Inactive'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Signatory & Official Seal */}
        <section className="glass p-6 rounded-2xl space-y-6">
          <h2 className="text-lg font-semibold text-white">Signatory & Official Seal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Signatory Image */}
            <div className="rounded-xl border border-white/10 p-4 bg-navy-800/40">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Authorized Signatory Signature</label>
                <label className="cursor-pointer text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  <Upload size={13} /> Upload PNG/JPG
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, 'signatory')}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Rendered in the signature position.</p>

              <select
                className="input text-xs"
                value={branding.signatory_id || ''}
                onChange={(e) => setBranding({ ...branding, signatory_id: e.target.value || null })}
              >
                <option value="">No custom signature (Default)</option>
                {signatories.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>

              {branding.signatory_id && (
                <div className="mt-3 flex items-center justify-between p-2 rounded bg-navy-900/60 border border-white/5">
                  <img
                    src={`/api/branding/assets/${branding.signatory_id}`}
                    alt="Signatory preview"
                    className="h-10 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(branding.signatory_id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Delete asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Official Seal */}
            <div className="rounded-xl border border-white/10 p-4 bg-navy-800/40">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Official Seal Image</label>
                <label className="cursor-pointer text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center gap-1">
                  <Upload size={13} /> Upload PNG/JPG
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, 'seal')}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Overrides default geometric gold seal.</p>

              <select
                className="input text-xs"
                value={branding.seal_id || ''}
                onChange={(e) => setBranding({ ...branding, seal_id: e.target.value || null })}
              >
                <option value="">Default Agnitia Seal</option>
                {seals.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>

              {branding.seal_id && (
                <div className="mt-3 flex items-center justify-between p-2 rounded bg-navy-900/60 border border-white/5">
                  <img
                    src={`/api/branding/assets/${branding.seal_id}`}
                    alt="Seal preview"
                    className="h-10 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(branding.seal_id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Delete asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-8"
          >
            {saving ? 'Saving...' : 'Save Branding Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
