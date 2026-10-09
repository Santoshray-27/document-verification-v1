/**
 * Agnitia Landing — Illustrations
 * Memoized, simplified flat-3D SVG illustrations.
 */
import { memo } from 'react';

export const ShieldIllustration = memo(function ShieldIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <path d="M60 10L10 30v40c0 30 50 45 50 45s50-15 50-45V30L60 10z" fill="#4B0FC4" />
      <path d="M60 10L10 30v40c0 30 50 45 50 45V10z" fill="#5B14F0" />
      <path d="M40 55l15 15 25-25" stroke="#FFD83D" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export const QRIllustration = memo(function QRIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="15" y="15" width="35" height="35" rx="8" fill="#F0568F" />
      <rect x="70" y="15" width="35" height="35" rx="8" fill="#F0568F" />
      <rect x="15" y="70" width="35" height="35" rx="8" fill="#F0568F" />
      <path d="M70 70h15v15H70zM90 90h15v15H90zM90 70h15v15H90zM70 90h15v15H70z" fill="#FF7A2F" />
    </svg>
  );
});

export const DocumentIllustration = memo(function DocumentIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="20" y="10" width="80" height="100" rx="12" fill="#fff" stroke="#EBEBEB" strokeWidth="4" />
      <path d="M40 35h40M40 55h40M40 75h20" stroke="#EBEBEB" strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="85" r="16" fill="#4B0FC4" />
      <path d="M75 85l3 3 7-7" stroke="#FFD83D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export const MagnifierIllustration = memo(function MagnifierIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="30" fill="#FFD83D" />
      <path d="M70 70l25 25" stroke="#0A0A0A" strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
});

export const KeyIllustration = memo(function KeyIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <circle cx="35" cy="60" r="25" fill="#FF7A2F" />
      <circle cx="35" cy="60" r="10" fill="#fff" />
      <path d="M55 60h45v15H85V60" stroke="#FF7A2F" strokeWidth="16" strokeLinejoin="round" />
    </svg>
  );
});

export const ChainIllustration = memo(function ChainIllustration({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <rect x="20" y="40" width="40" height="40" rx="20" stroke="#4B0FC4" strokeWidth="12" />
      <rect x="60" y="40" width="40" height="40" rx="20" stroke="#F0568F" strokeWidth="12" />
    </svg>
  );
});
