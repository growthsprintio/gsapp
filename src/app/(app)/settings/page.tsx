'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Save, Building2, Zap, Bell, Tag, Plus, Trash2, Workflow } from 'lucide-react';
import { MetaConnectionCard } from '@/components/meta-connection-card';
import { BrandIcon } from '@/components/brand-icon';
import { NamingSettings } from '@/components/naming-settings';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  channel: string;
  enabled: boolean;
}

const TRIGGERS = [
  { value: 'status_change', label: 'A creative changes status' },
  { value: 'approved', label: 'A creative is approved' },
  { value: 'launched', label: 'A creative is launched' },
  { value: 'assigned', label: 'Someone is assigned' },
  { value: 'due_soon', label: 'A due date is approaching' },
  { value: 'weekly_digest', label: 'Weekly summary' },
];

const ACTIONS = [
  { value: 'slack', label: 'Post to Slack' },
  { value: 'email', label: 'Send an email' },
  { value: 'notify', label: 'Notify in-app' },
];

function WorkflowsPanel() {
  const [rules, setRules] = useState<WorkflowRule[]>([
    { id: 'w1', name: 'Weekly creative digest', trigger: 'weekly_digest', action: 'slack', channel: '#creative', enabled: true },
  ]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: 'status_change', action: 'slack', channel: '' });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setRules((r) => [...r, { ...form, id: Math.random().toString(36).slice(2), enabled: true }]);
    setForm({ name: '', trigger: 'status_change', action: 'slack', channel: '' });
    setShowNew(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-secondary/60 border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          Automate routine updates — e.g. a weekly Slack digest of what shipped, or a ping when
          creative is approved. Rules are saved with your workspace; delivery turns on once the
          matching integration is connected.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Workflow rules</h3>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New rule
        </button>
      </div>

      {showNew && (
        <form onSubmit={add} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5">Rule name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Notify #creative when approved"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">When</label>
              <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Then</label>
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Destination</label>
              <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                placeholder={form.action === 'slack' ? '#channel' : 'email@company.com'}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNew(false)}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit"
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Create rule</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Workflow className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No workflows yet.</p>
          </div>
        ) : rules.map((rule) => (
          <div key={rule.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{rule.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {TRIGGERS.find((t) => t.value === rule.trigger)?.label}
                {' → '}
                {ACTIONS.find((a) => a.value === rule.action)?.label}
                {rule.channel && ` · ${rule.channel}`}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={rule.enabled} className="sr-only peer"
                onChange={() => setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
              />
              <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform" />
            </label>
            <button onClick={() => setRules((rs) => rs.filter((r) => r.id !== rule.id))}
              className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<'workspace' | 'naming' | 'integrations' | 'workflows' | 'notifications'>('workspace');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS = [
    { id: 'workspace', label: 'Workspace', icon: Building2 },
    { id: 'naming', label: 'Naming', icon: Tag },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace and integrations.</p>
      </div>

      <div className="flex gap-6">
        {/* Side nav */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  tab === id ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'workspace' && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">Workspace</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Workspace Name</label>
                    <input defaultValue={user?.team || 'GrowthSprint'}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Brand short codes now live in <span className="font-medium">Naming</span>, as the <span className="font-mono">{'{b}'}</span> variable.
                  </p>
                </div>
              </div>

              <button onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" />
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'naming' && <NamingSettings />}

          {tab === 'integrations' && (
            <div className="space-y-3">
              <MetaConnectionCard />
              {[
                { name: 'Frame.io', brand: 'frameio', desc: 'Sync review and approval status automatically', connected: false },
                { name: 'Slack', brand: 'slack', desc: 'Get notified when status changes in your pipeline', connected: false },
                { name: 'Motion', brand: 'motion', desc: 'Pull performance data into your creative workflow', connected: false },
              ].map(({ name, brand, desc, connected }) => (
                <div key={name} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrandIcon brand={brand} />
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    connected
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-border hover:bg-secondary text-foreground'
                  }`}>
                    {connected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'workflows' && <WorkflowsPanel />}

          {tab === 'notifications' && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold">Notification Preferences</h3>
              {[
                { label: 'Status changes', desc: 'When a creative moves to a new status' },
                { label: 'Ready to Launch', desc: 'When creative is marked ready for launch' },
                { label: 'Launched', desc: 'When a creative is pushed to Meta' },
                { label: 'Revisions needed', desc: 'When creative is sent back for revisions' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
