'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createWorkspaceStorage } from './workspace-storage';
import type { Account, Roadmap, RoadmapItem, CopyBankEntry, CreativeBankEntry, CreativeStatus, NamingConvention, OutreachBrief } from './types';
import { nanoid, DEFAULT_NAMING_CONVENTION, buildDuplicateFields } from './utils';

interface AppState {
  accounts: Account[];
  currentAccountId: string;
  roadmaps: Roadmap[];
  copyBank: CopyBankEntry[];
  user: { name: string; email: string; team: string } | null;
  namingConvention: NamingConvention;

  // Naming convention
  updateNamingConvention: (convention: NamingConvention) => void;

  // Account actions
  currentAccount: () => Account | undefined;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => string;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  switchAccount: (id: string) => void;

  // Roadmap actions
  addRoadmap: (roadmap: Omit<Roadmap, 'id' | 'accountId' | 'createdAt' | 'items'>) => string;
  updateRoadmap: (id: string, updates: Partial<Roadmap>) => void;
  archiveRoadmap: (id: string) => void;

  // Item actions
  addItem: (roadmapId: string, item: Omit<RoadmapItem, 'id' | 'roadmapId' | 'createdAt' | 'updatedAt'>) => string;
  updateItem: (roadmapId: string, itemId: string, updates: Partial<RoadmapItem>) => void;
  duplicateItem: (roadmapId: string, itemId: string) => string;
  updateItemStatus: (roadmapId: string, itemId: string, status: CreativeStatus) => void;
  deleteItem: (roadmapId: string, itemId: string) => void;

  // Copy bank
  addCopyEntry: (entry: Omit<CopyBankEntry, 'id' | 'usageCount' | 'createdAt'>) => void;
  addCopyEntries: (entries: Omit<CopyBankEntry, 'id' | 'usageCount' | 'createdAt'>[]) => void;
  updateCopyEntry: (id: string, updates: Partial<CopyBankEntry>) => void;
  deleteCopyEntry: (id: string) => void;
  restoreCopyEntry: (entry: CopyBankEntry) => void;

  // Creative bank (external links only)
  creativeBank: CreativeBankEntry[];
  addCreativeEntry: (entry: Omit<CreativeBankEntry, 'id' | 'createdAt'>) => void;
  deleteCreativeEntry: (id: string) => void;

  // Briefs for people outside the team
  outreach: OutreachBrief[];
  addOutreach: (brief: Omit<OutreachBrief, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateOutreach: (id: string, updates: Partial<OutreachBrief>) => void;
  deleteOutreach: (id: string) => void;

  // Auth
  setUser: (user: AppState['user']) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Real users start empty — identity comes from Supabase, not a demo seed.
      accounts: [],
      currentAccountId: '',
      roadmaps: [],
      copyBank: [],
      creativeBank: [],
      outreach: [],
      user: null,
      namingConvention: DEFAULT_NAMING_CONVENTION,

      updateNamingConvention: (convention) => set({ namingConvention: convention }),

      currentAccount: () => get().accounts.find((a) => a.id === get().currentAccountId),

      addAccount: (account) => {
        const id = nanoid();
        set((s) => ({
          accounts: [...s.accounts, { ...account, id, createdAt: new Date().toISOString() }],
          currentAccountId: id,
        }));
        return id;
      },

      updateAccount: (id, updates) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAccount: (id) =>
        set((s) => {
          const remaining = s.accounts.filter((a) => a.id !== id);
          return {
            accounts: remaining,
            roadmaps: s.roadmaps.filter((r) => r.accountId !== id),
            currentAccountId: s.currentAccountId === id
              ? (remaining[0]?.id ?? '')
              : s.currentAccountId,
          };
        }),

      switchAccount: (id) => set({ currentAccountId: id }),

      addRoadmap: (roadmap) => {
        const id = nanoid();
        set((s) => ({
          roadmaps: [
            ...s.roadmaps,
            { ...roadmap, id, accountId: s.currentAccountId, createdAt: new Date().toISOString(), items: [] },
          ],
        }));
        return id;
      },

      updateRoadmap: (id, updates) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      archiveRoadmap: (id) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) => (r.id === id ? { ...r, status: 'archived' } : r)),
        })),

      addItem: (roadmapId, item) => {
        const id = nanoid();
        const now = new Date().toISOString();
        set((s) => ({
          roadmaps: s.roadmaps.map((r) =>
            r.id === roadmapId
              ? { ...r, items: [...r.items, { ...item, id, roadmapId, createdAt: now, updatedAt: now }] }
              : r
          ),
        }));
        return id;
      },

      /**
       * Copy a creative so the same asset and copy can go into another
       * campaign or ad set. Meta links are cleared — the copy is a new ad that
       * hasn't been pushed — and a launched source comes back as approved,
       * since the copy itself isn't live.
       */
      duplicateItem: (roadmapId, itemId) => {
        const roadmap = get().roadmaps.find((r) => r.id === roadmapId);
        const source = roadmap?.items.find((i) => i.id === itemId);
        if (!source) return '';

        const id = nanoid();
        const now = new Date().toISOString();

        const copy: RoadmapItem = {
          ...source,
          ...buildDuplicateFields(source, get().namingConvention, {
            brand: get().currentAccount()?.name?.slice(0, 3) || 'BRD',
            index: Math.floor(Math.random() * 999) + 1,
          }),
          id,
          roadmapId,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          roadmaps: s.roadmaps.map((r) =>
            r.id === roadmapId ? { ...r, items: [...r.items, copy] } : r
          ),
        }));
        return id;
      },

      updateItem: (roadmapId, itemId, updates) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) =>
            r.id === roadmapId
              ? {
                  ...r,
                  items: r.items.map((i) =>
                    i.id === itemId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
                  ),
                }
              : r
          ),
        })),

      updateItemStatus: (roadmapId, itemId, status) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) =>
            r.id === roadmapId
              ? {
                  ...r,
                  items: r.items.map((i) =>
                    i.id === itemId
                      ? {
                          ...i,
                          status,
                          updatedAt: new Date().toISOString(),
                          launchedAt: status === 'launched' ? new Date().toISOString() : i.launchedAt,
                        }
                      : i
                  ),
                }
              : r
          ),
        })),

      deleteItem: (roadmapId, itemId) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) =>
            r.id === roadmapId ? { ...r, items: r.items.filter((i) => i.id !== itemId) } : r
          ),
        })),

      addCopyEntry: (entry) =>
        set((s) => ({
          copyBank: [
            ...s.copyBank,
            { ...entry, id: nanoid(), usageCount: 0, createdAt: new Date().toISOString() },
          ],
        })),

      // The bank could only ever be added to — no edit, no delete — so a typo
      // was permanent.
      addCopyEntries: (entries) =>
        set((s) => {
          const now = new Date().toISOString();
          return {
            copyBank: [
              ...s.copyBank,
              ...entries.map((e) => ({ ...e, id: nanoid(), usageCount: 0, createdAt: now })),
            ],
          };
        }),

      updateCopyEntry: (id, updates) =>
        set((s) => ({
          copyBank: s.copyBank.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e),
        })),

      deleteCopyEntry: (id) =>
        set((s) => ({ copyBank: s.copyBank.filter((e) => e.id !== id) })),

      /** Put a deleted entry back exactly as it was — powers Undo. */
      restoreCopyEntry: (entry) =>
        set((s) => (s.copyBank.some((e) => e.id === entry.id) ? s : { copyBank: [...s.copyBank, entry] })),

      addCreativeEntry: (entry) =>
        set((s) => ({
          creativeBank: [
            ...(s.creativeBank || []),
            { ...entry, id: nanoid(), createdAt: new Date().toISOString() },
          ],
        })),

      deleteCreativeEntry: (id) =>
        set((s) => ({ creativeBank: (s.creativeBank || []).filter((c) => c.id !== id) })),

      addOutreach: (brief) => {
        const id = nanoid();
        const now = new Date().toISOString();
        set((s) => ({ outreach: [{ ...brief, id, createdAt: now, updatedAt: now }, ...(s.outreach || [])] }));
        return id;
      },

      updateOutreach: (id, updates) =>
        set((s) => ({
          outreach: (s.outreach || []).map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b),
        })),

      deleteOutreach: (id) =>
        set((s) => ({ outreach: (s.outreach || []).filter((b) => b.id !== id) })),

      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'growthsprint-store',
      // Bump when the shape or seeding changes. v2 drops the demo seed data
      // (Luminary Skincare / Acme Corp / sample roadmaps) that shipped in v1.
      version: 2,
      migrate: () => ({
        accounts: [],
        currentAccountId: '',
        roadmaps: [],
        copyBank: [],
        creativeBank: [],
        outreach: [],
        user: null,
      }),
      // Content lives on the server when Supabase is configured, so a
      // workspace's roadmaps follow the user across devices and are visible to
      // teammates. Falls back to localStorage otherwise.
      storage: createJSONStorage(() => createWorkspaceStorage()),
      // Never sync the local demo user — identity comes from the session.
      partialize: (s) => {
        const { user: _user, ...rest } = s;
        return rest as typeof s;
      },
      /**
       * The naming convention is persisted, so preset variables added to
       * DEFAULT_NAMING_CONVENTION after a workspace was created never reached
       * it — persona, hook, influencer and offer simply didn't appear, and the
       * brief showed whatever stale variables were saved instead.
       *
       * Fold in any preset the stored convention is missing, matched by key,
       * leaving the formula, separator, style and the workspace's own
       * variables untouched.
       */
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<AppState>;
        const merged = { ...current, ...incoming } as AppState;

        const stored = incoming.namingConvention;
        if (!stored?.variables) return merged;

        const presets = new Map(DEFAULT_NAMING_CONVENTION.variables.map((v) => [v.key, v]));

        // Where a preset's wiring has changed — Landing Page moved from being
        // its own input to reading the Ad Setup field — adopt the new source,
        // but keep the workspace's label, prefix, options and length.
        const reconciled = stored.variables.map((v) => {
          const preset = presets.get(v.key);
          if (!preset || preset.source === v.source) return v;
          return { ...v, source: preset.source, field: preset.field };
        });

        const have = new Set(reconciled.map((v) => v.key));
        const missing = DEFAULT_NAMING_CONVENTION.variables.filter((v) => !have.has(v.key));

        return {
          ...merged,
          namingConvention: { ...stored, variables: [...reconciled, ...missing] },
        };
      },
    }
  )
);

