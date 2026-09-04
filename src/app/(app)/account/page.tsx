'use client';

import { useEffect, useState } from 'react';
import { User, KeyRound, LogOut, Check, AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowser, supabaseConfigured } from '@/lib/supabase';

export default function AccountPage() {
  const [email, setEmail] = useState('');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Change password using the live session — no email round-trip needed.
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/auth/bootstrap')
      .then((r) => r.json())
      .then((d) => {
        setEmail(d?.user?.email || '');
        setWorkspaces(d?.workspaces || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (pw.next.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return; }

    setPwState('saving');
    try {
      const { error } = await createSupabaseBrowser().auth.updateUser({ password: pw.next });
      if (error) throw new Error(error.message);
      setPw({ next: '', confirm: '' });
      setPwState('done');
      setTimeout(() => setPwState('idle'), 4000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not update password.');
      setPwState('idle');
    }
  };

  const signOut = async () => {
    if (supabaseConfigured) {
      try { await createSupabaseBrowser().auth.signOut(); } catch { /* fall through */ }
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your sign-in details and workspace access.</p>
      </div>

      {/* Identity */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" /> Profile
        </h3>
        <div>
          <label className="text-xs font-medium block mb-1.5">Email</label>
          <input value={loading ? 'Loading…' : email} disabled
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            This is your sign-in address.
          </p>
        </div>
      </div>

      {/* Password */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" /> Password
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Set a new password. You stay signed in on this device.
        </p>

        <form onSubmit={changePassword} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">New password</label>
              <input type="password" value={pw.next} autoComplete="new-password"
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Confirm</label>
              <input type="password" value={pw.confirm} autoComplete="new-password"
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="Repeat it"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {pwError && (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600">{pwError}</p>
            </div>
          )}
          {pwState === 'done' && (
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] text-primary">Password updated.</p>
            </div>
          )}

          <button type="submit" disabled={pwState === 'saving' || !pw.next || !pw.confirm}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40">
            {pwState === 'saving' ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Workspace access */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" /> Workspace access
        </h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : workspaces.length === 0 ? (
          <p className="text-xs text-muted-foreground">No workspaces yet.</p>
        ) : (
          <div className="space-y-2">
            {workspaces.map((w) => (
              <div key={w.id} className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {w.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm flex-1 min-w-0 truncate">{w.name}</p>
                <span className="text-[11px] text-muted-foreground capitalize border border-border rounded-full px-2 py-0.5">
                  {w.role}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href="/accounts" className="text-xs text-primary hover:underline mt-3 inline-block">
          Manage workspaces →
        </Link>
      </div>

      {/* Session */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Session</h3>
        <p className="text-xs text-muted-foreground mb-4">Sign out of GrowthSprint on this device.</p>
        <button onClick={signOut}
          className="flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
