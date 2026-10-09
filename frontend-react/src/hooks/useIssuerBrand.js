import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { assetUrl } from '../api/axios';

/**
 * Generate a 2-3 letter monogram badge from an organization or person name
 */
export function getMonogram(name = '') {
  if (!name || typeof name !== 'string') return 'ORG';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ORG';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  // If 3+ words, pick first letter of top 3 significant words (skipping "of", "and", "the")
  const stopWords = new Set(['OF', 'AND', 'THE', 'IN', 'FOR', 'AT']);
  const sig = words.filter(w => !stopWords.has(w.toUpperCase()));
  if (sig.length >= 2) {
    return (sig[0][0] + (sig[1] ? sig[1][0] : '') + (sig[2] ? sig[2][0] : '')).toUpperCase().slice(0, 3);
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Hook providing the authenticated issuer's organization branding,
 * initials monogram, logo asset, city, and signatory details.
 */
export function useIssuerBrand() {
  const { user } = useAuth();
  const [brandingProfile, setBrandingProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (user?.role === 'issuer' || user?.issuerId) {
      api.get('/branding')
        .then(res => {
          if (alive && res.data?.branding) {
            setBrandingProfile(res.data.branding);
          }
        })
        .catch(err => {
          // Graceful fallback to user / issuer fields
          console.warn('[useIssuerBrand] Branding fetch failed:', err?.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { alive = false; };
  }, [user?.issuerId, user?.role]);

  const brand = useMemo(() => {
    // 1. Organization name priority:
    // issuer branding profile -> user.issuer.name -> user.name -> fallback
    const orgName = (
      brandingProfile?.org_name ||
      user?.issuer?.name ||
      user?.name ||
      'Meridian Institute of Technology'
    ).trim();

    const issuerId = user?.issuerId || user?.issuer?.issuer_id || 'iss_demo01';
    const orgType = user?.issuer?.org_type || brandingProfile?.org_type || 'university';

    // 2. Logo URL
    let logoUrl = null;
    if (brandingProfile?.primary_logo?.asset_id) {
      logoUrl = `/api/branding/assets/${brandingProfile.primary_logo.asset_id}`;
    } else if (brandingProfile?.logo_url) {
      logoUrl = brandingProfile.logo_url;
    }

    // 3. Monogram badge
    const monogram = getMonogram(orgName);

    // 4. City / address
    const city = brandingProfile?.city || 'Bengaluru, India';
    const address = brandingProfile?.address || '';

    // 5. Authorized Signatory
    const signatoryName = brandingProfile?.signatory_name || 'Dr. R. Menon';
    const signatoryDesignation = brandingProfile?.signatory_designation || 'Registrar & Dean of Academic Affairs';
    const signatorySignatureUrl = brandingProfile?.signatory_asset_id
      ? `/api/branding/assets/${brandingProfile.signatory_asset_id}`
      : null;

    // 6. Accent color
    const primaryColor = brandingProfile?.primary_color || '#0A1F44';
    const secondaryColor = brandingProfile?.secondary_color || '#C9A227';

    return {
      orgName,
      issuerId,
      orgType,
      logoUrl,
      monogram,
      city,
      address,
      signatoryName,
      signatoryDesignation,
      signatorySignatureUrl,
      primaryColor,
      secondaryColor,
      loading
    };
  }, [user, brandingProfile, loading]);

  return brand;
}
