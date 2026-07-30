'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, UserPlus } from 'lucide-react';
import { createSupabaseBrowser, supabaseConfigured } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', workspace: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const supabase = createSupabaseBrowser();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (signUpError) throw new Error(signUpError.message);

      // No session means Supabase is set to require email confirmation.
      if (!data.session) {
        setNotice('Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceName: form.workspace }),
      });

      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
      setLoading(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          Accounts aren&apos;t enabled yet. <Link href="/login" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    );
  }

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
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Create your account</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Sets up your first workspace too.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Workspace name</label>
              <input required value={form.workspace} onChange={(e) => set('workspace', e.target.value)}
                placeholder="e.g. Luminary Skincare"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="you@company.com" autoComplete="email"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Password</label>
              <input type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)}
                placeholder="At least 6 characters" autoComplete="new-password"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {notice && <p className="text-xs text-primary">{notice}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
