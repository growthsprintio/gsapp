'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Mail, Shield, Crown, Eye, Trash2, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'member' | 'viewer';

interface Member {
  userId: string;
  email: string;
  role: Role;
  joinedAt: string;
}

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  admin: { label: 'Admin', icon: Crown, color: 'text-orange-600', bg: 'bg-orange-50' },
  member: { label: 'Member', icon: Shield, color: 'text-foreground', bg: 'bg-secondary' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bg: 'bg-secondary' },
};

const ROLE_PERMS: Record<Role, string[]> = {
  admin: ['Full access', 'Manage team', 'Connect integrations', 'Launch to Meta'],
  member: ['Create & edit briefs', 'Manage roadmaps', 'Update statuses'],
  viewer: ['View roadmaps', 'View briefs', 'No editing'],
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'member' as Role });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/team');
      const d = await r.json();
      setConfigured(d.configured !== false);
      setMembers(d.members || []);
    } catch {
      setError('Could not load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not add member.');
      setForm({ email: '', role: 'member' });
      setShowInvite(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add member.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, role: Role) => {
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    await load();
  };

  const removeMember = async (userId: string) => {
    setError('');
    const r = await fetch(`/api/team?userId=${userId}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error || 'Could not remove member.');
      return;
    }
    await load();
  };

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage access and roles for this workspace.</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {!configured && (
        <div className="bg-secondary/60 border border-border rounded-xl p-4 mb-5">
          <p className="text-xs text-muted-foreground">
            Accounts aren&apos;t enabled — team management needs Supabase configured.
          </p>
        </div>
      )}

      {showInvite && (
        <form onSubmit={addMember} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-semibold">Add someone to this workspace</h3>
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="teammate@company.com"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            They need a GrowthSprint account first — ask them to sign up, then add them here.
          </p>
          {error && (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowInvite(false); setError(''); }}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={busy}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              {busy ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </form>
      )}

      {error && !showInvite && (
        <div className="flex items-start gap-1.5 mb-4">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {loading ? 'Loading…' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {!loading && members.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => {
              const role = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
              const RoleIcon = role.icon;
              const initials = member.email.slice(0, 2).toUpperCase();
              return (
                <div key={member.userId} className="flex items-center gap-4 px-5 py-4 group">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', role.bg, role.color)}>
                    <RoleIcon className="w-3 h-3" />
                    {role.label}
                  </span>
                  <select value={member.role} onChange={(e) => changeRole(member.userId, e.target.value as Role)}
                    className="text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                    {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeMember(member.userId)} title="Remove from workspace"
                    className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Role Permissions</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            return (
              <div key={role} className="space-y-2">
                <div className={cn('flex items-center gap-1.5 font-medium', cfg.color)}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </div>
                <ul className="text-muted-foreground space-y-1">
                  {ROLE_PERMS[role].map((p) => <li key={p}>· {p}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
