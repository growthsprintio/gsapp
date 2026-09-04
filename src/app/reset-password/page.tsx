'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, KeyRound, AlertCircle } from 'lucide-react';
import { createSupabaseBrowser, supabaseConfigured } from '@/lib/supabase';

/**
 * Landed on from a recovery link. The callback has already exchanged the token
 * for a session, so we just need a new password on that session.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setHasSession(false); return; }
    createSupabaseBrowser().auth.getSession()
      .then(({ data }) => setHasSession(!!data.session))
      .catch(() => setHasSession(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw.next.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pw.next !== pw.confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const { error: err } = await createSupabaseBrowser().auth.updateUser({ password: pw.next });
      if (err) throw new Error(err.message);
      await fetch('/api/auth/bootstrap', { method: 'POST' });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
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
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Choose a new password</h1>
          </div>

          {hasSession === false ? (
            <>
              <p className="text-xs text-muted-foreground mt-2 mb-4">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </p>
              <Link href="/login"
                className="block text-center bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-5">
                Enter a new password for your account.
              </p>
              <form onSubmit={submit} className="space-y-3">
                <input type="password" required value={pw.next} autoFocus autoComplete="new-password"
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  placeholder="New password"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input type="password" required value={pw.confirm} autoComplete="new-password"
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {error && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
