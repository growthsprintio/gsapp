'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createWorkspaceStorage } from './workspace-storage';
import type { Account, Roadmap, RoadmapItem, CopyBankEntry, CreativeBankEntry, CreativeStatus, NamingConvention } from './types';
import { nanoid, DEFAULT_NAMING_CONVENTION } from './utils';

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
  updateItemStatus: (roadmapId: string, itemId: string, status: CreativeStatus) => void;
  deleteItem: (roadmapId: string, itemId: string) => void;

  // Copy bank
  addCopyEntry: (entry: Omit<CopyBankEntry, 'id' | 'usageCount' | 'createdAt'>) => void;

  // Creative bank (external links only)
  creativeBank: CreativeBankEntry[];
  addCreativeEntry: (entry: Omit<CreativeBankEntry, 'id' | 'createdAt'>) => void;
  deleteCreativeEntry: (id: string) => void;

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

      addCreativeEntry: (entry) =>
        set((s) => ({
          creativeBank: [
            ...(s.creativeBank || []),
            { ...entry, id: nanoid(), createdAt: new Date().toISOString() },
          ],
        })),

      deleteCreativeEntry: (id) =>
        set((s) => ({ creativeBank: (s.creativeBank || []).filter((c) => c.id !== id) })),

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
    }
  )
);

