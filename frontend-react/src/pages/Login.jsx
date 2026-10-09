import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api/axios';
import Logo from '../components/Logo.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { useToast } from '../components/Toast.jsx';

const DEMO = [
  { email: 'issuer@agnitia.io', role: 'Issuer', desc: 'Issue, sign & revoke documents', icon: ShieldCheck },
  { email: 'verifier@agnitia.io', role: 'Verifier', desc: 'Verify documents & inspect forensics', icon: UserRound },
  { email: 'admin@agnitia.io', role: 'Admin', desc: 'Audit log ledger & issuer onboarding', icon: KeyRound },
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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Subtle ambient amber accent shape */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-12">
        {/* Brand overview panel */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden lg:col-span-5 lg:block"
        >
          <Logo size={42} />
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground leading-tight">
            Proof in <span className="text-amber-700 dark:text-amber-400">Every Pixel</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Cryptographic document authenticity platform. Issuers sign manifests with ECDSA P-256; verifiers inspect signatures, visual differences and OCR evidence in real time.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              'Deterministic cryptographic signatures & SHA-256 hashes',
              'Multi-layer forensic visual diff & field extraction',
              'Tamper-evident audit log with verifiable hash chains',
            ].map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                  <Check size={12} strokeWidth={2.8} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Login form card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-7 mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-7 sm:p-8 shadow-xl"
        >
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Sign in to Agnitia</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a demo role below or enter your credentials.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1.5 block">Work Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organisation.org"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              size="default"
              loading={busy}
              className="w-full mt-2"
            >
              Sign In <ArrowRight size={15} />
            </Button>
          </form>

          {/* Quick Demo Sign In Switcher */}
          <div className="mt-7 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Demo Accounts
              </span>
              <span className="font-mono text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                Pass: Agnitia@123
              </span>
            </div>

            <div className="space-y-2">
              {DEMO.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword('Agnitia@123');
                      setError('');
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-2.5 text-left transition hover:border-amber-500/60 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-mono block truncate text-xs font-medium text-foreground">{d.email}</span>
                      <span className="block text-[11px] text-muted-foreground">{d.desc}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {d.role}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need to verify an external document?{' '}
            <Link to="/verify" className="font-medium text-amber-700 dark:text-amber-400 hover:underline underline-offset-2">
              No account required
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
