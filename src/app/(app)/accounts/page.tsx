'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Building2, Briefcase, User, Trash2, X, Check, Users, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type WsType = 'brand' | 'agency' | 'personal';

interface Workspace {
  id: string;
  name: string;
  type: WsType;
  industry?: string | null;
  website?: string | null;
  created_at: string;
  role: string;
  memberCount: number;
  metaConnected: boolean;
  metaReady: boolean;
}

const TYPE_CONFIG: Record<WsType, { label: string; icon: React.ElementType; desc: string }> = {
  brand: { label: 'Brand', icon: Zap, desc: 'DTC brand or product company' },
  agency: { label: 'Agency', icon: Briefcase, desc: 'Client-facing creative agency' },
  personal: { label: 'Personal', icon: User, desc: 'Solo or freelance use' },
};

const INDUSTRIES = ['Beauty & Skincare', 'Apparel & Fashion', 'Health & Wellness', 'Food & Beverage',
  'Home & Living', 'Tech & SaaS', 'Fitness', 'Pet', 'E-commerce', 'Other'];

function WorkspacesContent() {
  const params = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'brand' as WsType, industry: '', website: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/workspaces');
      const d = await r.json();
      setConfigured(d.configured !== false);
      setWorkspaces(d.workspaces || []);
    } catch {
      setError('Could not load workspaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get('new') === '1') setShowNew(true); }, [params]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not create workspace.');
      setForm({ name: '', type: 'brand', industry: '', website: '' });
      setShowNew(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create workspace.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError('');
    const r = await fetch(`/api/workspaces?id=${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error || 'Could not delete workspace.');
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    await load();
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each workspace has its own team and Meta connection.
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Workspace
        </button>
      </div>

      {!configured && (
        <div className="bg-secondary/60 border border-border rounded-xl p-4 mb-5">
          <p className="text-xs text-muted-foreground">Workspaces need Supabase configured.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 mb-4">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      )}

      {showNew && (
        <form onSubmit={create} className="bg-card border border-border rounded-2xl p-6 space-y-5 mb-6">
          <h3 className="font-semibold text-base">New Workspace</h3>

          <div>
            <label className="text-xs font-medium block mb-1.5">Workspace Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Luminary Skincare"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-2">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TYPE_CONFIG) as [WsType, typeof TYPE_CONFIG[WsType]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={type} type="button" onClick={() => setForm({ ...form, type })}
                    className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-colors',
                      form.type === type ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted')}>
                    <Icon className={cn('w-4 h-4', form.type === type && 'text-primary')} />
                    <div>
                      <p className="text-xs font-semibold">{cfg.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{cfg.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Industry</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="brand.com"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowNew(false); setError(''); }}
              className="flex-1 border border-border rounded-xl py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button type="submit" disabled={busy || !form.name.trim()}
              className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {busy ? 'Creating…' : 'Create Workspace'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="bg-secondary/50 border border-border rounded-2xl h-40 animate-pulse" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No workspaces yet</p>
          <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">Create one</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {workspaces.map((ws) => {
            const cfg = TYPE_CONFIG[ws.type] ?? TYPE_CONFIG.brand;
            const TypeIcon = cfg.icon;
            const initials = ws.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={ws.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{ws.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TypeIcon className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground capitalize">{cfg.label}</p>
                        {ws.industry && <span className="text-muted-foreground">·</span>}
                        {ws.industry && <p className="text-xs text-muted-foreground truncate">{ws.industry}</p>}
                      </div>
                    </div>
                  </div>
                  {ws.role === 'admin' && (
                    <button onClick={() => setConfirmDelete(ws.id)} title="Delete workspace"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.memberCount}</span>
                  <span className="capitalize border border-border rounded-full px-2 py-0.5">{ws.role}</span>
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 border',
                    ws.metaReady ? 'border-primary/20 bg-primary/5 text-primary' : 'border-border')}>
                    <Zap className="w-3 h-3" />
                    {ws.metaReady ? 'Meta ready' : ws.metaConnected ? 'Meta needs setup' : 'Meta not connected'}
                  </span>
                </div>

                {confirmDelete === ws.id ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-xs font-medium text-red-700 mb-2">
                      Delete &ldquo;{ws.name}&rdquo;? Members and its Meta connection are removed.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)}
                        className="flex-1 border border-red-200 bg-white text-red-700 text-xs py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => remove(ws.id)}
                        className="flex-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                        Yes, delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href="/settings?tab=integrations"
                    className="w-full flex items-center justify-center border border-border rounded-xl py-2 text-xs font-semibold hover:bg-muted transition-colors">
                    {ws.metaReady ? 'Manage Meta connection' : 'Connect Meta →'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkspacesPage() {
  return (
    <Suspense fallback={null}>
      <WorkspacesContent />
    </Suspense>
  );
}
