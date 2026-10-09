import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Key, Bell, Shield, Hash, KeySquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import api, { errMsg } from '../../api/axios';
import { fmtDate } from '../../lib/format';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('crypto');

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/issuer/settings');
      return res.data;
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">System Configuration</span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mt-2">Console Settings</h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 font-mono text-[10px] uppercase tracking-widest font-bold">
           <TabButton id="crypto" icon={Shield} label="Cryptography" active={activeTab} set={setActiveTab} />
           <TabButton id="profile" icon={SettingsIcon} label="Issuer Profile" active={activeTab} set={setActiveTab} />
           <TabButton id="api" icon={KeySquare} label="API Access" active={activeTab} set={setActiveTab} />
           <TabButton id="notifications" icon={Bell} label="Notifications" active={activeTab} set={setActiveTab} />
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'crypto' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="bg-surface border border-line p-6 shadow-sm relative">
                  <h2 className="font-display text-xl text-ink mb-4">Cryptographic Keypair</h2>
                  <p className="font-mono text-[10px] text-ink-muted mb-6 leading-relaxed">This ECDSA P-256 keypair is used to sign all documents issued by this account. The private key never leaves the secure enclave.</p>
                  
                  {isLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-16 bg-surface-2"></div>
                      <div className="h-10 bg-surface-2"></div>
                    </div>
                  ) : error ? (
                    <div className="text-rose-500 font-mono text-xs">{errMsg(error)}</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-surface-2 border border-line p-3">
                          <p className="font-mono text-[9px] uppercase text-ink-muted mb-1">Algorithm</p>
                          <p className="font-mono text-[11px] text-ink">{data?.key?.algorithm || 'ECDSA'}</p>
                        </div>
                        <div className="bg-surface-2 border border-line p-3">
                          <p className="font-mono text-[9px] uppercase text-ink-muted mb-1">Created</p>
                          <p className="font-mono text-[11px] text-ink">{data?.key?.created_at ? fmtDate(data.key.created_at) : 'Unknown'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-mono text-[9px] uppercase text-ink-muted">Public Key Fingerprint (SHA-256)</p>
                        <div className="flex items-center gap-2 bg-bg border border-line p-2">
                           <Hash size={14} className="text-ink-muted shrink-0" />
                           <code className="font-mono text-[10px] text-ink truncate">{data?.key?.fingerprint || 'Not Available'}</code>
                        </div>
                      </div>
                    </>
                  )}
               </div>
               
               <div className="bg-rose-500/5 border border-rose-500/20 p-6">
                  <h3 className="font-display text-lg text-rose-700 mb-2">Rotate Keys</h3>
                  <p className="font-mono text-[9px] text-rose-600/80 mb-4 max-w-lg">Rotating keys will revoke all previously issued certificates using the old key. Proceed only if the private key is compromised.</p>
                  <button className="px-4 py-2 bg-rose-600 text-bg font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-rose-700 transition-colors">Initiate Key Rotation</button>
               </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-line p-6 space-y-6">
               <h2 className="font-display text-xl text-ink">Institution Details</h2>
               <div className="space-y-4">
                 <div>
                   <label className="font-mono text-[9px] uppercase text-ink-muted block mb-1">Institution Name</label>
                   <input type="text" defaultValue={user?.name} className="w-full bg-bg border border-line p-2 text-sm font-mono text-ink outline-none focus:border-ink" />
                 </div>
                 <div>
                   <label className="font-mono text-[9px] uppercase text-ink-muted block mb-1">Admin Email</label>
                   <input type="email" defaultValue={user?.email} className="w-full bg-bg border border-line p-2 text-sm font-mono text-ink outline-none focus:border-ink" disabled />
                 </div>
               </div>
               <button className="px-6 py-3 bg-ink text-bg font-mono text-[10px] uppercase font-bold tracking-widest hover:-translate-y-[1px] shadow-hard border border-ink transition-all">Save Changes</button>
            </motion.div>
          )}

          {activeTab === 'api' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-line p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-xl text-ink">API Keys</h2>
                    <p className="font-mono text-[9px] text-ink-muted mt-1">Use these keys to issue documents programmatically.</p>
                  </div>
                  <button className="px-4 py-2 border border-ink text-ink font-mono text-[9px] uppercase font-bold tracking-widest flex items-center gap-2 hover:bg-surface-2 transition-colors"><PlusIcon /> Generate Key</button>
               </div>
               
               <div className="border border-line bg-bg divide-y divide-line">
                  <div className="p-8 text-center text-ink-muted font-mono text-[10px] uppercase tracking-widest">
                    Programmatic API Access Coming Soon
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-line p-6 space-y-6">
               <h2 className="font-display text-xl text-ink mb-4">Alert Preferences</h2>
               <div className="space-y-4 font-mono text-[10px] text-ink">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-amber-600 w-4 h-4" />
                    Email me when a document is verified successfully
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-amber-600 w-4 h-4" />
                    Email me when a forgery is detected (ALTERED/FORGED)
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-amber-600 w-4 h-4" />
                    Weekly verification digest
                  </label>
               </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}

function TabButton({ id, icon: Icon, label, active, set }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => set(id)}
      className={`flex items-center gap-3 p-3 text-left transition-colors border ${isActive ? 'bg-amber-500/10 border-amber-500/30 text-amber-800' : 'bg-surface border-line text-ink-muted hover:bg-surface-2'}`}
    >
      <Icon size={14} className={isActive ? 'text-amber-600' : ''} />
      {label}
    </button>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
