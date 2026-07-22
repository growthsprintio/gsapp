'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

// Seed data — must be declared before useAppStore
const SEED_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Luminary Skincare', type: 'brand', industry: 'Beauty & Skincare', website: 'luminaryskin.com', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'acc-2', name: 'Acme Corp', type: 'agency', industry: 'E-commerce', website: 'acmecorp.com', createdAt: '2025-03-01T00:00:00Z' },
];

const SEED_ROADMAPS: Roadmap[] = [
  {
    id: 'rm-1',
    accountId: 'acc-1',
    name: 'June 2025 — Performance',
    type: 'monthly',
    status: 'active',
    period: 'June 2025',
    description: 'Core performance creative for the June push across all DTC brands.',
    createdAt: '2025-06-01T00:00:00Z',
    items: [
      {
        id: 'i-1', roadmapId: 'rm-1', status: 'ready_to_launch',
        adName: 'SUM_UGC_9x16_Pain_001', adFormat: 'ugc', adSize: '9:16',
        angle: 'Pain Point', concept: 'The problem with your current skincare',
        primaryText: 'Stop wasting money on products that don\'t work. Here\'s what actually changed my skin.',
        headline: 'Finally. Skincare that delivers.', landingPage: 'https://brand.com/shop',
        product: 'Serum Pro', dueDate: '2025-06-15', createdAt: '2025-06-01T00:00:00Z', updatedAt: '2025-06-10T00:00:00Z',
      },
      {
        id: 'i-2', roadmapId: 'rm-1', status: 'in_review',
        adName: 'SUM_STA_1x1_Social_002', adFormat: 'static', adSize: '1:1',
        angle: 'Social Proof', concept: '5-star review showcase',
        primaryText: '"I\'ve tried everything. This is the only thing that worked." — Sarah M.',
        headline: 'Join 50,000+ happy customers.', product: 'Serum Pro',
        dueDate: '2025-06-18', createdAt: '2025-06-02T00:00:00Z', updatedAt: '2025-06-12T00:00:00Z',
      },
      {
        id: 'i-3', roadmapId: 'rm-1', status: 'briefed',
        adName: 'SUM_VID_4x5_Unbox_003', adFormat: 'video', adSize: '4:5',
        angle: 'Curiosity', concept: 'Unboxing + first impression reaction',
        dueDate: '2025-06-22', createdAt: '2025-06-05T00:00:00Z', updatedAt: '2025-06-05T00:00:00Z',
      },
      {
        id: 'i-4', roadmapId: 'rm-1', status: 'idea',
        adName: '', adFormat: 'carousel',
        angle: 'Before/After', concept: 'Before and after transformation carousel',
        createdAt: '2025-06-08T00:00:00Z', updatedAt: '2025-06-08T00:00:00Z',
      },
      {
        id: 'i-5', roadmapId: 'rm-1', status: 'launched',
        adName: 'SUM_UGC_9x16_Hook_001', adFormat: 'ugc', adSize: '9:16',
        angle: 'Hook', concept: 'Stop scrolling hook with product demo',
        primaryText: 'POV: You finally found a skincare routine that actually works.',
        headline: 'Real results. No filters.', product: 'Serum Pro',
        launchedAt: '2025-06-05T00:00:00Z', metaAdId: 'act_123456789',
        createdAt: '2025-05-28T00:00:00Z', updatedAt: '2025-06-05T00:00:00Z',
      },
    ],
  },
  {
    id: 'rm-2',
    accountId: 'acc-1',
    name: 'Q3 2025 — Brand Campaign',
    type: 'quarterly',
    status: 'active',
    period: 'Q3 2025',
    description: 'Summer brand awareness push with influencer-led content.',
    createdAt: '2025-06-01T00:00:00Z',
    items: [
      {
        id: 'i-6', roadmapId: 'rm-2', status: 'idea',
        adName: '', adFormat: 'video', angle: 'Lifestyle',
        concept: 'Summer morning routine featuring hero product',
        createdAt: '2025-06-10T00:00:00Z', updatedAt: '2025-06-10T00:00:00Z',
      },
    ],
  },
  {
    id: 'rm-3',
    accountId: 'acc-2',
    name: 'Acme Corp — Sprint 4',
    type: 'client',
    status: 'active',
    client: 'Acme Corp',
    description: 'Agency sprint 4 for Acme Corp e-commerce.',
    createdAt: '2025-06-01T00:00:00Z',
    items: [],
  },
];

const SEED_COPY: CopyBankEntry[] = [
  {
    id: 'c-1', type: 'primary_text',
    content: 'Stop wasting money on products that don\'t work. Here\'s what actually changed everything.',
    tags: ['pain point', 'skincare'], usageCount: 3, createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'c-2', type: 'headline',
    content: 'Finally. Results you can actually see.',
    tags: ['social proof', 'results'], usageCount: 5, createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'c-3', type: 'hook',
    content: 'POV: You just found the product that changes your routine forever.',
    tags: ['ugc', 'hook'], usageCount: 2, createdAt: '2025-06-02T00:00:00Z',
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: SEED_ACCOUNTS,
      currentAccountId: 'acc-1',
      roadmaps: SEED_ROADMAPS,
      copyBank: SEED_COPY,
      creativeBank: [
        { id: 'cr-1', title: 'UGC Testimonial — Sarah', url: 'https://picsum.photos/seed/gs1/600/750', format: 'ugc', tags: ['testimonial', '9:16'], createdAt: '2025-06-01T00:00:00Z' },
        { id: 'cr-2', title: 'Product Hero — Serum Pro', url: 'https://picsum.photos/seed/gs2/600/600', format: 'static', tags: ['product', '1:1'], createdAt: '2025-06-03T00:00:00Z' },
      ],
      user: { name: 'Alex Rivera', email: 'alex@growthsprint.io', team: 'GrowthSprint' },
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
    { name: 'growthsprint-store' }
  )
);

