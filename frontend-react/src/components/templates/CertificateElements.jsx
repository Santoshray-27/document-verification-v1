import React from 'react';

/**
 * Self-contained SVG QR Code Component for clean zero-dependency rendering
 */
function MiniQrCode({ size = 40, fgColor = "#0F172A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="25" height="25" fill="white" />
      {/* Top-left marker */}
      <rect x="2" y="2" width="7" height="7" stroke={fgColor} strokeWidth="1.5" />
      <rect x="4" y="4" width="3" height="3" fill={fgColor} />
      {/* Top-right marker */}
      <rect x="16" y="2" width="7" height="7" stroke={fgColor} strokeWidth="1.5" />
      <rect x="18" y="4" width="3" height="3" fill={fgColor} />
      {/* Bottom-left marker */}
      <rect x="2" y="16" width="7" height="7" stroke={fgColor} strokeWidth="1.5" />
      <rect x="4" y="18" width="3" height="3" fill={fgColor} />
      {/* Data dots pattern */}
      <rect x="11" y="2" width="2" height="2" fill={fgColor} />
      <rect x="11" y="6" width="2" height="2" fill={fgColor} />
      <rect x="11" y="10" width="3" height="2" fill={fgColor} />
      <rect x="2" y="11" width="3" height="2" fill={fgColor} />
      <rect x="7" y="11" width="2" height="2" fill={fgColor} />
      <rect x="16" y="11" width="2" height="3" fill={fgColor} />
      <rect x="20" y="11" width="3" height="2" fill={fgColor} />
      <rect x="11" y="16" width="3" height="2" fill={fgColor} />
      <rect x="16" y="16" width="2" height="2" fill={fgColor} />
      <rect x="20" y="16" width="3" height="3" fill={fgColor} />
      <rect x="11" y="21" width="2" height="2" fill={fgColor} />
      <rect x="15" y="20" width="3" height="3" fill={fgColor} />
    </svg>
  );
}

/**
 * Common security footer & verification details
 */
export function SecurityFooter({ docId, issueDate, qrText, dark = false }) {
  return (
    <div className={`mt-auto pt-3 border-t ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'} flex items-end justify-between text-[8px] font-mono select-none`}>
      <div className="space-y-0.5">
        <p className="font-semibold tracking-wider uppercase">Secured by Evidentia · ECDSA P-256 + SHA-256</p>
        <p className="opacity-80">Doc ID: {docId || 'DOC-SAMPLE-PREVIEW-ID'} · Issued: {issueDate || '2026-10-10'}</p>
        <p className="opacity-60 text-[7px]">Cryptographically Signed & Registry-Backed Credential</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="font-bold tracking-widest text-[7px] uppercase">SCAN TO VERIFY</p>
          <p className="text-[6.5px] opacity-75">tamper-evident proof</p>
        </div>
        <div className={`p-1 rounded-xs ${dark ? 'bg-white' : 'bg-white border border-slate-200 shadow-xs'}`}>
          <MiniQrCode size={38} fgColor="#0F172A" />
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic Monogram or Logo Hero
 */
export function BrandHero({ brand, dark = false, align = 'center', size = 'md' }) {
  const isCenter = align === 'center';

  return (
    <div className={`flex items-center gap-3 ${isCenter ? 'justify-center text-center flex-col' : 'justify-start text-left flex-row'}`}>
      {brand.logoUrl ? (
        <img 
          src={brand.logoUrl} 
          alt={brand.orgName} 
          className="h-10 max-w-[140px] object-contain"
        />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm tracking-widest border ${
          dark 
            ? 'bg-white/10 border-white/20 text-white shadow-inner' 
            : 'bg-amber-500/10 border-amber-600/30 text-amber-900 shadow-xs'
        }`}>
          {brand.monogram || 'ORG'}
        </div>
      )}

      <div>
        <h2 className={`font-display font-bold uppercase tracking-wider leading-tight max-w-[420px] ${
          size === 'lg' ? 'text-lg sm:text-xl' : 'text-base'
        } ${dark ? 'text-white' : 'text-slate-900'}`}>
          {brand.orgName}
        </h2>
        <p className={`font-mono text-[8px] uppercase tracking-widest mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {brand.city || 'Accredited Issuing Authority'}
        </p>
      </div>
    </div>
  );
}
