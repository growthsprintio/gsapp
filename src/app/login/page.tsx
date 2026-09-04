'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, Lock } from 'lucide-react';
import { createSupabaseBrowser, supabaseConfigured } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Surface errors handed back by /auth/callback (expired link, etc.)
  const [error, setError] = useState(params.get('error') || '');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [resetting, setResetting] = useState(false);

  const dest = () => {
    const from = params.get('from');
    return from && from.startsWith('/') ? from : '/dashboard';
  };

  // Password reset goes through Supabase email; the link returns to
  // /auth/callback which hands off to /reset-password.
  const sendReset = async () => {
    setError(''); setNotice('');
    if (!email) { setError('Enter your email first, then choose Forgot password.'); return; }
    setResetting(true);
    try {
      const { error: err } = await createSupabaseBrowser().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (err) throw new Error(err.message);
      setNotice(`If an account exists for ${email}, a reset link is on its way.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (supabaseConfigured) {
        const supabase = createSupabaseBrowser();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(signInError.message);
        // Make sure this user has a workspace before entering the app.
        await fetch('/api/auth/bootstrap', { method: 'POST' });
      } else {
        // Legacy shared-password gate
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');
      }
      router.replace(dest());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">GrowthSprint</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Sign in</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {supabaseConfigured ? 'Use your GrowthSprint account.' : 'Enter the workspace password to continue.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {supabaseConfigured && (
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" autoFocus autoComplete="email"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" autoFocus={!supabaseConfigured} autoComplete="current-password"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            {notice && <p className="text-xs text-primary">{notice}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {supabaseConfigured && (
            <>
              <div className="text-center mt-3">
                <button type="button" onClick={sendReset} disabled={resetting}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50">
                  {resetting ? 'Sending reset link…' : 'Forgot password?'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border">
                No account? <Link href="/signup" className="text-primary hover:underline">Create one</Link>
              </p>
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-4">
          GrowthSprint — Creative Operations
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
