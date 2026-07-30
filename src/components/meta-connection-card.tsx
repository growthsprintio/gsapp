'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, AlertCircle, Link2, Unlink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Assets {
  adAccounts: { id: string; name: string; currency: string; status: number }[];
  pages: { id: string; name: string }[];
}

interface ConnState {
  connected: boolean;
  ready?: boolean;
  metaUserName?: string;
  adAccountId?: string;
  pageId?: string;
  assets?: Assets;
  assetsError?: string;
  reason?: string;
  error?: string;
}

export function MetaConnectionCard() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [state, setState] = useState<ConnState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState({ adAccountId: '', pageId: '' });
  const [notice, setNotice] = useState('');

  // Resolve the signed-in user's Supabase workspace (Meta connections key off this).
  useEffect(() => {
    fetch('/api/auth/bootstrap')
      .then((r) => r.json())
      .then((d) => {
        const ws = d.workspaces?.[0];
        if (ws) { setWorkspaceId(ws.id); setWorkspaceName(ws.name); }
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/meta/connection?workspace=${workspaceId}`);
      const d: ConnState = await r.json();
      setState(d);
      setPick({ adAccountId: d.adAccountId || '', pageId: d.pageId || '' });
    } catch {
      setState({ connected: false, error: 'Could not load connection state.' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { if (workspaceId) load(); }, [workspaceId, load]);

  // Surface the OAuth round-trip result
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('meta_connected')) setNotice('Meta connected. Now choose the ad account and Page to use.');
    if (p.get('meta_error')) setNotice(`Connection failed: ${p.get('meta_error')}`);
  }, []);

  const savePick = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await fetch('/api/meta/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: workspaceId, ...pick }),
      });
      await load();
      setNotice('Saved. This workspace is ready to launch ads.');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!workspaceId) return;
    await fetch(`/api/meta/connection?workspace=${workspaceId}`, { method: 'DELETE' });
    setNotice('');
    await load();
  };

  const connected = state?.connected;
  const ready = state?.ready;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">⚡</div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Meta Ads Manager</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {connected
                ? `Connected${state?.metaUserName ? ` as ${state.metaUserName}` : ''}${workspaceName ? ` · ${workspaceName}` : ''}`
                : 'Connect this workspace to push creative into your campaigns'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-xs font-medium px-3 py-1.5 rounded-lg border whitespace-nowrap',
            ready ? 'border-primary/20 bg-primary/5 text-primary'
              : connected ? 'border-border bg-secondary text-foreground'
              : 'border-border bg-secondary text-muted-foreground')}>
            {loading ? 'Checking…' : ready ? 'Ready' : connected ? 'Needs setup' : 'Not connected'}
          </span>
          {connected ? (
            <>
              <button onClick={load} title="Refresh"
                className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={disconnect} title="Disconnect"
                className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </>
          ) : workspaceId ? (
            <a href={`/api/meta/oauth/start?workspace=${workspaceId}`}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Link2 className="w-3.5 h-3.5" /> Connect Meta
            </a>
          ) : null}
        </div>
      </div>

      {notice && (
        <p className="text-[11px] text-primary mt-3 pt-3 border-t border-border">{notice}</p>
      )}

      {!workspaceId && !loading && (
        <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
          No workspace found for your account — reload the page or sign in again.
        </p>
      )}

      {/* Ad account + Page picker */}
      {connected && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {state?.assetsError ? (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600">{state.assetsError}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5">Ad Account</label>
                  <select value={pick.adAccountId}
                    onChange={(e) => setPick((p) => ({ ...p, adAccountId: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select ad account…</option>
                    {state?.assets?.adAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.currency ? ` (${a.currency})` : ''}{a.status !== 1 ? ' — inactive' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Facebook Page</label>
                  <select value={pick.pageId}
                    onChange={(e) => setPick((p) => ({ ...p, pageId: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select Page…</option>
                    {state?.assets?.pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {ready
                    ? <><Check className="w-3.5 h-3.5 text-primary" /><span className="text-[11px] text-muted-foreground">Ready to launch ads from this workspace</span></>
                    : <><AlertCircle className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Pick both to enable launching</span></>}
                </div>
                <button onClick={savePick} disabled={saving || !pick.adAccountId || !pick.pageId}
                  className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
