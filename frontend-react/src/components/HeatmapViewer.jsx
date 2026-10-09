import { useState } from 'react';
import { assetUrl } from '../api/axios';

/**
 * Original snapshot | uploaded render | difference, with the changed regions listed.
 * Clicking a region scrolls it into view; the boxes are drawn by the worker.
 */
export default function HeatmapViewer({ visual, snapshotUrl }) {
  const [zoom, setZoom] = useState(false);

  if (!visual) {
    return (
      <div className="glass p-6">
        <h3 className="section-title mb-2">Visual difference analysis</h3>
        <p className="text-sm text-slate-400">
          No visual comparison was produced for this file — either the bytes matched the original exactly, or the forensic worker was unavailable.
        </p>
      </div>
    );
  }

  const panels = [
    { title: 'Original (registry snapshot)', src: assetUrl(snapshotUrl) },
    { title: 'Your upload (rendered)', src: assetUrl(visual.combined_url) },
  ].filter((p) => p.src);

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <h3 className="section-title">Visual difference analysis</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="chip border border-white/10 bg-white/[0.04] text-slate-300">
            SSIM {visual.ssim_score?.toFixed?.(3) ?? visual.ssim_score}
          </span>
          <span className="chip border border-white/10 bg-white/[0.04] text-slate-300">{visual.region_count} region(s)</span>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
        <div>
          {visual.combined_url ? (
            <button
              onClick={() => setZoom((z) => !z)}
              className="block w-full overflow-hidden rounded-xl border border-white/[0.08] bg-navy-950/60"
              title="Click to toggle full width"
            >
              <img src={assetUrl(visual.combined_url)} alt="Original, uploaded and difference panels side by side" className={`h-auto w-full transition-all ${zoom ? '' : 'max-h-[420px] object-contain'}`} />
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {panels.map((p) => (
                <figure key={p.title}>
                  <figcaption className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{p.title}</figcaption>
                  <img src={p.src} alt={p.title} className="w-full rounded-xl border border-white/[0.08] bg-navy-950/60" />
                </figure>
              ))}
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-slate-500">Left: original · Middle: your upload · Right: difference (red = changed)</p>
        </div>

        <div>
          <p className="section-title mb-2">Changed regions</p>
          {visual.regions?.length ? (
            <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {visual.regions.map((r, i) => (
                <li key={i} className="rounded-lg border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-200">Region {i + 1}</span>
                    <span className="mono text-[10px] text-rose-300/70">{(r.area_ratio * 100).toFixed(2)}% of page</span>
                  </div>
                  <p className="mono mt-1 text-[10px] text-slate-400">
                    x{r.x} y{r.y} · {r.w}×{r.h}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">
              No changed regions detected — the pages look the same.
            </p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Structural similarity (SSIM) compares layout, not meaning. A scan or a re-save lowers it without any tampering, which is why the
            verdict also weighs the OCR field comparison.
          </p>
        </div>
      </div>
    </div>
  );
}
