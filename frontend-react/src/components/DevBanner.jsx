import React from 'react';

export default function DevBanner() {
  if (import.meta.env.VITE_SHOW_DEV_BANNER !== 'true') return null;
  
  return (
    <div className="bg-amber-500/90 text-black text-xs font-mono font-bold tracking-widest uppercase text-center py-1 z-50 fixed bottom-0 w-full">
      DEVELOPMENT MODE — CONNECTED TO LOCAL BACKEND
    </div>
  );
}
