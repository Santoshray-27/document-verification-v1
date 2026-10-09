/**
 * Evidentia Landing — Illustrations
 * Memoized, simplified flat-3D SVG illustrations.
 * Palette: Amber & Stone accents.
 */
import { memo } from 'react';

export const ShieldIllustration = memo(function ShieldIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <path d="M60 10L10 30v40c0 30 50 45 50 45s50-15 50-45V30L60 10z" fill="#F59E0B" />
      <path d="M60 10L10 30v40c0 30 50 45 50 45V10z" fill="#D97706" />
      <path d="M40 55l15 15 25-25" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export const QRIllustration = memo(function QRIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="15" y="15" width="35" height="35" rx="8" fill="#F59E0B" />
      <rect x="70" y="15" width="35" height="35" rx="8" fill="#F59E0B" />
      <rect x="15" y="70" width="35" height="35" rx="8" fill="#F59E0B" />
      <path d="M70 70h15v15H70zM90 90h15v15H90zM90 70h15v15H90zM70 90h15v15H70z" fill="#D97706" />
    </svg>
  );
});

export const DocumentIllustration = memo(function DocumentIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="20" y="10" width="80" height="100" rx="12" fill="#FAFAF9" stroke="#E7E5E4" strokeWidth="3" />
      <path d="M40 35h40M40 55h40M40 75h20" stroke="#D6D3D1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="85" r="16" fill="#F59E0B" />
      <path d="M75 85l3 3 7-7" stroke="#0C0A09" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export const MagnifierIllustration = memo(function MagnifierIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="30" fill="#F59E0B" />
      <path d="M70 70l25 25" stroke="#1C1917" strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
});

export const KeyIllustration = memo(function KeyIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="35" cy="60" r="25" fill="#F59E0B" />
      <circle cx="35" cy="60" r="10" fill="#fff" />
      <path d="M55 60h45v15H85V60" stroke="#F59E0B" strokeWidth="16" strokeLinejoin="round" />
    </svg>
  );
});

export const ChainIllustration = memo(function ChainIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="20" y="40" width="40" height="40" rx="20" stroke="#F59E0B" strokeWidth="12" />
      <rect x="60" y="40" width="40" height="40" rx="20" stroke="#D97706" strokeWidth="12" />
    </svg>
  );
});
