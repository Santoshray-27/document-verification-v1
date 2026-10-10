import React, { useState } from 'react';
import { assetUrl } from '../api/axios';
import { Eye, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

/**
 * Original snapshot | uploaded render | difference, with the changed regions listed.
 * Clicking a region scrolls it into view; the boxes are drawn by the worker.
 */
export default function HeatmapViewer({ visual, snapshotUrl }) {
  const [zoom, setZoom] = useState(false);

  if (!visual) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Visual difference analysis
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No visual comparison was produced for this file — either the bytes matched the original exactly, or the forensic worker was unavailable.
        </p>
      </div>
    );
  }

  const panels = [
    { title: 'Original (registry snapshot)', src: assetUrl(snapshotUrl) },
    { title: 'Your upload (rendered)', src: assetUrl(visual.combined_url || visual.heatmap_url) },
  ].filter((p) => p.src);

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 bg-muted/20">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Visual difference analysis
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono">
            SSIM {visual.ssim_score?.toFixed?.(3) ?? visual.ssim_score}
          </Badge>
          <Badge variant="secondary">
            {visual.region_count} region(s)
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">
        <div>
          {visual.combined_url ? (
            <div className="relative group">
              <button
                onClick={() => setZoom((z) => !z)}
                className="block w-full overflow-hidden rounded-xl border border-border bg-muted/40 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                title="Click to toggle full size"
              >
                <img
                  src={assetUrl(visual.combined_url)}
                  alt="Original, uploaded and difference panels side by side"
                  className={`h-auto w-full transition-all ${
                    zoom ? '' : 'max-h-[440px] object-contain'
                  }`}
                />
              </button>
              <div className="absolute top-3 right-3 pointer-events-none bg-background/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground flex items-center gap-1 shadow-xs">
                {zoom ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                {zoom ? 'Shrink' : 'Expand'}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {panels.map((p) => (
                <figure key={p.title}>
                  <figcaption className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.title}
                  </figcaption>
                  <img
                    src={p.src}
                    alt={p.title}
                    className="w-full rounded-xl border border-border bg-muted/40"
                  />
                </figure>
              ))}
            </div>
          )}
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            Left: original · Middle: your upload · Right: difference heatmap (red indicates pixel-level changes)
          </p>
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Detected Changed Regions
          </p>
          {visual.regions?.length ? (
            <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {visual.regions.map((r, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-orange-500/30 bg-orange-500/10 dark:bg-orange-950/20 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-orange-900 dark:text-orange-300">
                      Region {i + 1}
                    </span>
                    <span className="font-mono text-[11px] text-orange-800 dark:text-orange-400">
                      {(r.area_ratio * 100).toFixed(2)}% page
                    </span>
                  </div>
                  <p className="font-mono mt-1 text-[11px] text-muted-foreground">
                    x:{r.x} y:{r.y} · {r.w}×{r.h}px
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3 text-xs text-muted-foreground">
              No altered regions detected — visual geometry and layout match.
            </div>
          )}
          <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>
              Structural similarity (SSIM) analyzes visual structure. Resaves or mobile scans can introduce minor geometric shifts without tampering, which the multi-layer pipeline resolves alongside cryptographic and OCR verification.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
