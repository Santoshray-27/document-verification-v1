import { useEffect, useState } from 'react';
import { Building2, FileCheck, Search, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import { fmtDate } from '../../lib/format';

export default function IssuerDirectory() {
  const [issuers, setIssuers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/public/issuers').then((res) => {
      if (alive) {
        setIssuers(res.data.issuers || []);
        setLoading(false);
      }
    }).catch(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const filtered = issuers.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.org_type.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Trusted Issuer Directory</h1>
        <p className="mt-3 text-sm text-slate-400">
          Only documents from these registered institutions can be verified on Evidentia.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search issuers or organization type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex animate-pulse flex-col items-center justify-center space-y-4 py-12">
          <div className="h-8 w-8 rounded-full bg-slate-800"></div>
          <div className="text-sm text-slate-500">Loading directory...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No issuers found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((issuer) => (
            <div key={issuer.issuer_id} className="glass rounded-xl p-5 hover:border-gold-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 text-gold-400">
                  <Building2 size={20} />
                </div>
                {issuer.status === 'active' && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-semibold text-slate-200">{issuer.name}</h3>
              <p className="mt-1 text-xs text-slate-400 capitalize">{issuer.org_type}</p>
              
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FileCheck size={14} className="text-slate-500" />
                  <span>{issuer.doc_count} issued</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Joined {fmtDate(issuer.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
