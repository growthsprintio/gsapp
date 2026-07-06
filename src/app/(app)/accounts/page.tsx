'use client';

import { useAppStore } from '@/lib/store';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Building2, Briefcase, User, Pencil, Trash2, Check, X, Map, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Account, AccountType } from '@/lib/types';

const TYPE_CONFIG: Record<AccountType, { label: string; icon: React.ElementType; desc: string }> = {
  brand: { label: 'Brand', icon: Zap, desc: 'DTC brand or product company' },
  agency: { label: 'Agency', icon: Briefcase, desc: 'Client-facing creative agency' },
  personal: { label: 'Personal', icon: User, desc: 'Solo or freelance use' },
};

const INDUSTRIES = ['Beauty & Skincare', 'Apparel & Fashion', 'Health & Wellness', 'Food & Beverage', 'Home & Living', 'Tech & SaaS', 'Fitness', 'Pet', 'E-commerce', 'Other'];

interface AccountFormProps {
  initial?: Partial<Account>;
  onSave: (data: Omit<Account, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  isNew?: boolean;
}

function AccountForm({ initial, onSave, onCancel, isNew }: AccountFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'brand' as AccountType,
    industry: initial?.industry ?? '',
    website: initial?.website ?? '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <h3 className="font-semibold text-base">{isNew ? 'New Account' : 'Edit Account'}</h3>

      <div>
        <label className="text-xs font-medium block mb-1.5">Account Name *</label>
        <input
          required value={form.name} onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Luminary Skincare"
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-2">Account Type *</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(TYPE_CONFIG) as [AccountType, typeof TYPE_CONFIG[AccountType]][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={type} type="button"
                onClick={() => set('type', type)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-colors',
                  form.type === type
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted'
                )}
              >
                <Icon className={cn('w-4 h-4', form.type === type ? 'text-primary' : '')} />
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
          <select
            value={form.industry} onChange={(e) => set('industry', e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5">Website</label>
          <input
            value={form.website} onChange={(e) => set('website', e.target.value)}
            placeholder="brand.com"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-border rounded-xl py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          type="button"
          disabled={!form.name.trim()}
          onClick={() => onSave(form as Omit<Account, 'id' | 'createdAt'>)}
          className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> {isNew ? 'Create Account' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const switchAccount = useAppStore((s) => s.switchAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = account.id === currentAccountId;
  const roadmapCount = roadmaps.filter((r) => r.accountId === account.id).length;
  const initials = account.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const cfg = TYPE_CONFIG[account.type];
  const TypeIcon = cfg.icon;

  if (editing) {
    return (
      <AccountForm
        initial={account}
        onSave={(data) => { updateAccount(account.id, data); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={cn(
      'bg-card border rounded-2xl p-5 transition-colors',
      isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
            isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
          )}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{account.name}</p>
              {isActive && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Active</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TypeIcon className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground capitalize">{cfg.label}</p>
              {account.industry && <span className="text-muted-foreground">·</span>}
              {account.industry && <p className="text-xs text-muted-foreground">{account.industry}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isActive}
            title={isActive ? 'Switch to another account first' : 'Delete account'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><Map className="w-3 h-3" /> {roadmapCount} roadmap{roadmapCount !== 1 ? 's' : ''}</span>
        {account.website && <span>{account.website}</span>}
        <span>Created {new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      </div>

      {confirmDelete ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-xs font-medium text-red-700 mb-2">
            Delete "{account.name}"? This will also delete {roadmapCount} roadmap{roadmapCount !== 1 ? 's' : ''} and all their creative.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-red-200 bg-white text-red-700 text-xs py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => { deleteAccount(account.id); setConfirmDelete(false); }}
              className="flex-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 transition-colors">
              Yes, delete
            </button>
          </div>
        </div>
      ) : !isActive ? (
        <button
          onClick={() => { switchAccount(account.id); router.push('/dashboard'); }}
          className="w-full border border-border rounded-xl py-2 text-xs font-semibold hover:bg-muted transition-colors">
          Switch to this account
        </button>
      ) : (
        <button
          onClick={() => router.push('/roadmaps')}
          className="w-full bg-primary/10 text-primary border border-primary/20 rounded-xl py-2 text-xs font-semibold hover:bg-primary/15 transition-colors">
          View roadmaps →
        </button>
      )}
    </div>
  );
}

function AccountsContent() {
  const accounts = useAppStore((s) => s.accounts);
  const addAccount = useAppStore((s) => s.addAccount);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNew(true);
  }, [searchParams]);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each workspace has its own roadmaps, team, and settings. Switch between them from the sidebar.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Workspace
        </button>
      </div>

      {showNew && (
        <div className="mb-6">
          <AccountForm
            isNew
            onSave={(data) => { addAccount(data); setShowNew(false); router.push('/dashboard'); }}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No accounts yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create your first account to get started.</p>
          <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">
            Create account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  );
}
