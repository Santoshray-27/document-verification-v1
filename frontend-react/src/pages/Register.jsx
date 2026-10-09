import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Building2, GraduationCap, Landmark, Briefcase, Network } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

const ORG_TYPES = [
  { id: 'university', label: 'University / College', icon: GraduationCap },
  { id: 'school', label: 'School / Board', icon: Building2 },
  { id: 'government', label: 'Government', icon: Landmark },
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'other', label: 'Other', icon: Network },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgType, setOrgType] = useState('university');
  
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ message: '', fieldErrors: {} });
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const calculateStrength = (pw) => {
    let score = 0;
    if (pw.length > 7) score++;
    if (pw.length > 11) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(4, score);
  };
  const strength = calculateStrength(password);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return setError({ message: 'Please fill in all fields.', fieldErrors: {} });
    if (password.length < 8) return setError({ message: 'Password must be at least 8 characters.', fieldErrors: { password: 'Password must be at least 8 characters.' } });
    
    setBusy(true);
    setError({ message: '', fieldErrors: {} });
    try {
      await register(name, email, password, orgType);
      navigate('/issuer');
    } catch (err) {
      const code = err.code || '';
      let message = err.message || 'Failed to register. Please try again.';
      
      if (code === 'EMAIL_IN_USE' || err.status === 409) {
        message = 'This email is already registered. Please log in or use a different email address.';
      } else if (code === 'RATE_LIMITED' || err.status === 429) {
        message = 'Too many attempts. Please wait a minute and try again.';
      } else if (err.isNetworkError) {
        message = 'Cannot reach the server. Make sure the backend is running.';
      }
      
      setError({ message, fieldErrors: err.fieldErrors || {} });
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
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12 lg:py-8 relative z-10 w-full max-w-2xl mx-auto lg:mx-0 overflow-y-auto">
         <div className="mb-8 hidden lg:flex items-center gap-2 border border-line bg-surface-2 px-3 py-1.5 w-max">
           <Logo size={20} withWord={false} />
           <span className="font-display text-lg text-ink">EVIDENTIA</span>
         </div>

         <div className="relative p-6 sm:p-10 border border-line bg-surface shadow-hard">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink -translate-x-[2px] -translate-y-[2px]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink translate-x-[2px] -translate-y-[2px]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink -translate-x-[2px] translate-y-[2px]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink translate-x-[2px] translate-y-[2px]" />
            
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-2">Create Issuer Account</h1>
            <p className="font-mono text-[9px] uppercase text-ink-muted tracking-wider mb-8">Join the Cryptographic Registry</p>

            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[10px] text-ink uppercase tracking-wider block">Organization Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ORG_TYPES.map(t => (
                    <button 
                      key={t.id} 
                      type="button"
                      onClick={() => setOrgType(t.id)}
                      className={`flex flex-col items-center justify-center p-3 border font-mono text-[9px] uppercase text-center transition-all outline-none ${orgType === t.id ? 'border-amber-500 bg-amber-500/10 text-amber-700 font-bold' : 'border-line bg-surface-2 text-ink-muted hover:border-ink'}`}
                    >
                      <t.icon size={16} className={`mb-1.5 ${orgType === t.id ? 'text-amber-600' : 'text-ink-muted'}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] text-ink uppercase tracking-wider">Organization Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full bg-bg border ${error.fieldErrors?.name ? 'border-red-500' : 'border-line'} p-3 text-sm text-ink outline-none focus:border-ink transition-colors font-mono`}
                  placeholder="e.g. Meridian Institute"
                  required
                />
                {error.fieldErrors?.name && <p className="text-red-500 text-[10px] font-mono mt-1">{error.fieldErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] text-ink uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full bg-bg border ${error.fieldErrors?.email ? 'border-red-500' : 'border-line'} p-3 text-sm text-ink outline-none focus:border-ink transition-colors font-mono`}
                  placeholder="admin@organisation.edu"
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
                    placeholder="Min 8 characters"
                    required
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink outline-none">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {/* Password Strength Meter */}
                {password && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className={`h-1 flex-1 transition-colors ${strength >= level ? (strength > 2 ? 'bg-verdict-genuine' : 'bg-amber-500') : 'bg-line'}`} />
                    ))}
                  </div>
                )}
                {error.fieldErrors?.password && <p className="text-red-500 text-[10px] font-mono mt-1">{error.fieldErrors.password}</p>}
              </div>

              {error.message && (
                <div className="p-3 border border-verdict-forged bg-verdict-forged-bg flex gap-3 text-verdict-forged text-xs items-center font-mono">
                  <AlertCircle size={14} className="shrink-0" /> {error.message}
                </div>
              )}

              <button type="submit" disabled={busy} className="w-full py-3.5 bg-ink text-bg font-mono font-bold text-xs uppercase tracking-widest border border-ink shadow-hard hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink mt-4">
                {busy ? 'CREATING ACCOUNT...' : 'REGISTER ISSUER ACCOUNT'}
              </button>
            </form>
         </div>

         <p className="mt-8 text-center font-mono text-[10px] text-ink-muted pb-8">
           Already registered? <Link to="/login" className="text-amber-600 hover:underline">Log in to Console</Link>
         </p>
      </div>

      {/* RIGHT: BRAND VISUAL (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 border-l border-line bg-bg relative overflow-hidden items-center justify-center perspective-[1000px] h-screen sticky top-0">
         <div className="absolute inset-0 bg-graph-paper bg-graph opacity-30 pointer-events-none" />
         
         <div className="absolute top-12 right-12 text-right">
           <p className="font-display text-2xl text-ink/20">CRYPTOGRAPHIC VERIFICATION</p>
           <p className="font-mono text-[10px] text-ink-muted tracking-widest mt-1">ECDSA P-256 + SHA-256</p>
         </div>

         <div className="absolute bottom-12 left-12 flex items-center gap-4">
            <div className="w-12 h-12 border border-ink/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
              <Logo size={20} withWord={false} className="text-ink/30" />
            </div>
            <p className="font-display text-4xl text-ink tracking-tight opacity-40">Proof in Every Pixel</p>
         </div>

         <div className="w-[320px] h-[450px] border border-line bg-surface p-4 relative shadow-2xl rotate-y-[-15deg] rotate-x-[5deg]">
           <div className="absolute inset-2 border-[3px] border-double border-amber-600/30" />
           <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-transparent to-transparent h-[150%] animate-[float_3s_linear_infinite]" />
           
           <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
             <div className="w-16 h-px bg-amber-500/50 mb-6" />
             <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted mb-2">CERTIFICATE OF PROVENANCE</p>
             <div className="w-full h-8 bg-surface-2 border border-line mb-6" />
             <div className="w-3/4 h-3 bg-surface-2 border border-line mb-2" />
             <div className="w-1/2 h-3 bg-surface-2 border border-line mb-8" />
             
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
