'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/stores/useAuth';
import { HardButton } from '@/components/ui/primitives';
import { StyleSwitch, ThemeToggle } from '@/components/providers/ThemeProvider';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const login = useAuth((s) => s.login);
  const token = useAuth((s) => s.token);
  const hydrate = useAuth((s) => s.hydrate);
  const [email, setEmail] = useState('admin@aquasense.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) router.replace(next.startsWith('/login') ? '/' : next);
  }, [next, router, token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(next.startsWith('/login') ? '/' : next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-paper flex min-h-dvh items-center justify-center bg-shell-950 p-6">
      <form onSubmit={(e) => void onSubmit(e)} className="slab w-full max-w-md shadow-brut">
        <div className="flex items-start justify-between gap-3 border-b-2 border-line bg-shell-850 px-5 py-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-ink">Aquasense</div>
            <p className="label-xs mt-1.5 normal-case tracking-normal">Sign in to the operator console</p>
          </div>
          <div className="flex items-center gap-2">
            <StyleSwitch compact />
            <ThemeToggle compact />
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <label className="block">
            <span className="label-xs">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full border-2 border-line bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-flow"
            />
          </label>
          <label className="block">
            <span className="label-xs">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-1 w-full border-2 border-line bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-flow"
            />
          </label>
          {error && <p className="text-[12px] text-critical">{error}</p>}
          <HardButton type="submit" tone="flow" disabled={busy} className="mt-2 py-2">
            {busy ? 'Signing in…' : 'Enter console'}
          </HardButton>
          <p className="label-xs normal-case tracking-normal text-faint">
            Admin: admin@aquasense.local / admin123
            <br />
            Operator: northfield@aquasense.local / operator123
          </p>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-shell-950">
          <span className="label-xs">Loading</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
