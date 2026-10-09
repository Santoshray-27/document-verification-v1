import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/axios';
import Logo from '../components/Logo.jsx';
import { Spinner } from '../components/Stepper.jsx';
import { useToast } from '../components/Toast.jsx';

const DEMO = [
  { email: 'issuer@agnitia.io', role: 'Issuer', desc: 'Issue and revoke documents', icon: ShieldCheck },
  { email: 'verifier@agnitia.io', role: 'Verifier', desc: 'Check documents, keep history', icon: UserRound },
  { email: 'admin@agnitia.io', role: 'Admin', desc: 'Audit log and issuer onboarding', icon: KeyRound },
];

const HOME = { issuer: '/issuer', admin: '/admin/audit', verifier: '/verify' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get('expired') ? 'Your session expired — please log in again.' : '');

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter both email and password.');
    setBusy(true);
    setError('');
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(HOME[user.role] || '/verify', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      {/* brand panel */}
      <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
        <Logo size={40} />
        <h1 className="mt-7 text-3xl font-bold leading-tight tracking-tight text-white">
          Proof in <span className="text-gold-400">Every Pixel</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          Issuers sign each document at creation. Verifiers check any file against that signature — and get the reasons, not just a yes or no.
        </p>
        <ul className="mt-8 space-y-3.5">
          {[
            'Verdicts come from deterministic cryptography and rules',
            'No AI model ever decides whether a document is genuine',
            'Tamper-evident audit log with an integrity check you can run',
          ].map((t) => (
            <li key={t} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-500/10 text-[10px] text-gold-300">✓</span>
              {t}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* form */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto w-full max-w-md p-7">
        <h2 className="text-xl font-semibold text-white">Log in</h2>
        <p className="mt-1 text-sm text-slate-400">Issuers and verifiers have separate roles.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.org" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner /> : <>Log in <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="section-title mb-3">Demo accounts</p>
          <p className="mb-3 mono text-[11px] text-slate-500">password: Agnitia@123</p>
          <div className="space-y-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword('Agnitia@123');
                  setError('');
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-navy-950/40 px-3 py-2.5 text-left transition hover:border-gold-400/30 hover:bg-white/[0.05]"
              >
                <d.icon size={15} className="shrink-0 text-gold-400/80" />
                <span className="min-w-0 flex-1">
                  <span className="mono block truncate text-[11px] text-slate-200">{d.email}</span>
                  <span className="block text-[10px] text-slate-500">{d.desc}</span>
                </span>
                <span className="chip shrink-0 border border-white/10 bg-white/[0.04] text-[9px] text-slate-400">{d.role}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Just checking a document? <Link to="/verify" className="text-gold-400 underline-offset-2 hover:underline">No login needed</Link>
          <br /><br />
          Want to become an issuer? <Link to="/register" className="text-gold-400 underline-offset-2 hover:underline">Register your institution</Link>
        </p>
      </motion.div>
    </div>
  );
}
