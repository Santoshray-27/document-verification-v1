import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, UserRound, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/axios';
import Logo from '../components/Logo.jsx';

const DEMO = [
  { email: 'issuer@agnitia.io', role: 'ISSUER', desc: 'Issue & revoke docs', icon: ShieldCheck },
  { email: 'verifier@agnitia.io', role: 'VERIFIER', desc: 'Inspect forensics', icon: UserRound },
  { email: 'admin@agnitia.io', role: 'ADMIN', desc: 'Audit ledger', icon: KeyRound },
];

const HOME = { issuer: '/issuer', admin: '/admin/audit', verifier: '/verify' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ message: params.get('expired') ? 'Your session expired — please log in again.' : '', fieldErrors: {} });
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError({ message: 'Enter both email and password.', fieldErrors: {} });
    setBusy(true);
    setError({ message: '', fieldErrors: {} });
    try {
      const user = await login(email.trim(), password);
      navigate(HOME[user.role] || '/verify', { replace: true });
    } catch (err) {
      setError({ message: errMsg(err, 'Login failed'), fieldErrors: err.fieldErrors || {} });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg">
      {/* MOBILE BRAND STRIP */}
      <div className="lg:hidden h-20 border-b border-line bg-surface flex items-center justify-between px-4 shrink-0">
         <div className="flex items-center gap-2">
           <Logo size={24} withWord={false} />
           <span className="font-display text-xl text-ink">EVIDENTIA</span>
         </div>
      </div>

      {/* LEFT: FORM PANEL */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12 lg:py-0 relative z-10 w-full max-w-2xl mx-auto lg:mx-0">
         <div className="mb-12 hidden lg:flex items-center gap-2 border border-line bg-surface-2 px-3 py-1.5 w-max">
           <Logo size={20} withWord={false} />
           <span className="font-display text-lg text-ink">EVIDENTIA</span>
         </div>

         <div className="relative p-6 sm:p-10 border border-line bg-surface shadow-hard">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink -translate-x-[2px] -translate-y-[2px]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink translate-x-[2px] -translate-y-[2px]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink -translate-x-[2px] translate-y-[2px]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink translate-x-[2px] translate-y-[2px]" />
            
            <h1 className="font-display text-4xl text-ink mb-2">Access Console</h1>
            <p className="font-mono text-[10px] uppercase text-ink-muted tracking-wider mb-8">Secure Authenticated Gateway</p>

            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-ink uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full bg-bg border ${error.fieldErrors?.email ? 'border-red-500' : 'border-line'} p-3 text-sm text-ink outline-none focus:border-ink transition-colors font-mono`}
                  placeholder="name@organisation.org"
                  required
                />
                {error.fieldErrors?.email && <p className="text-red-500 text-[10px] font-mono mt-1">{error.fieldErrors.email}</p>}
              </div>

              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                   <label className="font-mono text-[10px] text-ink uppercase tracking-wider">Password</label>
                   {capsLock && <span className="font-mono text-[9px] text-amber-600 bg-amber-500/10 px-1">CAPS LOCK ON</span>}
                </div>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full bg-bg border ${error.fieldErrors?.password ? 'border-red-500' : 'border-line'} p-3 pr-10 text-sm text-ink outline-none focus:border-ink transition-colors font-mono`}
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink outline-none">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {error.fieldErrors?.password && <p className="text-red-500 text-[10px] font-mono mt-1">{error.fieldErrors.password}</p>}
              </div>

              {error.message && (
                <div className="p-3 border border-verdict-forged bg-verdict-forged-bg flex gap-3 text-verdict-forged text-xs items-center font-mono">
                  <AlertCircle size={14} className="shrink-0" /> {error.message}
                </div>
              )}

              <button type="submit" disabled={busy} className="w-full py-3.5 bg-amber-500 text-ink font-mono font-bold text-xs uppercase tracking-widest border border-ink shadow-hard hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink">
                {busy ? 'AUTHENTICATING...' : 'SIGN IN TO CONSOLE'}
              </button>
            </form>
         </div>

         {/* Quick Demo Switcher */}
         <div className="mt-8 border border-line bg-surface-2 p-5 shadow-sm">
           <div className="flex justify-between items-center mb-4">
             <span className="font-mono text-[9px] uppercase text-ink-muted tracking-wider">Demo Accounts</span>
             <span className="font-mono text-[9px] uppercase bg-bg border border-line px-1.5 py-0.5 text-ink-muted">PASS: Agnitia@123</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             {DEMO.map(d => (
               <button key={d.role} onClick={() => { setEmail(d.email); setPassword('Agnitia@123'); setError(''); }} className="border border-line bg-surface p-3 text-left hover:border-ink hover:shadow-hard-sm transition-all group outline-none">
                 <d.icon size={16} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                 <span className="block font-mono text-[10px] text-ink font-bold">{d.role}</span>
                 <span className="block font-mono text-[8px] text-ink-muted truncate mt-1">{d.desc}</span>
               </button>
             ))}
           </div>
         </div>

         <p className="mt-8 text-center font-mono text-[10px] text-ink-muted">
           No account? <Link to="/register" className="text-amber-600 hover:underline">Register Institution</Link> &middot; <Link to="/verify" className="text-amber-600 hover:underline">Public Verify</Link>
         </p>
      </div>

      {/* RIGHT: BRAND VISUAL (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 border-l border-line bg-bg relative overflow-hidden items-center justify-center perspective-[1000px]">
         <div className="absolute inset-0 bg-graph-paper bg-graph opacity-30 pointer-events-none" />
         
         <div className="absolute top-12 right-12 text-right">
           <p className="font-display text-2xl text-ink/20">CRYPTOGRAPHIC VERIFICATION</p>
           <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-1">ECDSA P-256 + SHA-256</p>
         </div>

         {/* Rotating Tagline */}
         <div className="absolute bottom-12 left-12 flex items-center gap-4">
            <div className="w-12 h-12 border border-ink/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
              <Logo size={20} withWord={false} className="text-ink/30" />
            </div>
            <p className="font-display text-4xl text-ink tracking-tight opacity-40">Proof in Every Pixel</p>
         </div>

         {/* Animated Certificate ScanFrame */}
         <div className="w-[320px] h-[450px] border border-line bg-surface p-4 relative shadow-2xl rotate-y-[-15deg] rotate-x-[5deg]">
           <div className="absolute inset-2 border-[3px] border-double border-amber-600/30" />
           <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-transparent to-transparent h-[150%] animate-[float_3s_linear_infinite]" />
           
           <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
             <div className="w-16 h-px bg-amber-500/50 mb-6" />
             <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted mb-2">CERTIFICATE OF PROVENANCE</p>
             <div className="w-full h-8 bg-surface-2 border border-line mb-6" />
             <div className="w-3/4 h-3 bg-surface-2 border border-line mb-2" />
             <div className="w-1/2 h-3 bg-surface-2 border border-line mb-8" />
             
             {/* Stamping Loop Animation */}
             <motion.div 
               animate={{ 
                 scale: [2, 0.9, 1, 1],
                 opacity: [0, 1, 1, 0],
                 rotate: [-20, -5, -5, -5]
               }}
               transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.8, 1] }}
               className="w-24 h-24 border-[3px] border-amber-600 rounded-full flex items-center justify-center text-amber-600 font-display font-bold text-lg mix-blend-multiply"
             >
               VERIFIED
             </motion.div>
           </div>
         </div>
      </div>
    </div>
  );
}
