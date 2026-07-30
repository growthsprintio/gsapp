import type { StateStorage } from 'zustand/middleware';
import { supabaseConfigured } from './supabase';

/**
 * Zustand persist backend that stores workspace content on the server instead
 * of localStorage, so roadmaps/creatives are shared across devices and
 * teammates. Keeps the same key/value shape persist expects.
 *
 * Behaviour:
 *  - Supabase not configured → plain localStorage (unchanged local dev).
 *  - Configured → hydrate from GET /api/state; writes are debounced PUTs.
 *    localStorage is still written as an offline cache so a failed/slow
 *    network doesn't lose the user's work.
 */

const CACHE_SUFFIX = ':cache';
let pending: ReturnType<typeof setTimeout> | null = null;
let lastPayload: string | null = null;

function localGet(name: string): string | null {
  try { return localStorage.getItem(name); } catch { return null; }
}
function localSet(name: string, value: string) {
  try { localStorage.setItem(name, value); } catch { /* quota — ignore */ }
}

async function flush(name: string) {
  if (!lastPayload) return;
  const payload = lastPayload;
  lastPayload = null;
  try {
    // persist stores { state, version }; send it through as-is.
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Keep the local cache as the fallback copy.
    localSet(name + CACHE_SUFFIX, payload);
  }
}

export function createWorkspaceStorage(): StateStorage {
  return {
    getItem: async (name) => {
      if (!supabaseConfigured) return localGet(name);
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        if (data?.state) return JSON.stringify(data.state);
        // Nothing saved yet for this workspace — fall back to any local cache
        // so a user's existing local work isn't lost on first sync.
        return localGet(name + CACHE_SUFFIX) ?? localGet(name);
      } catch {
        return localGet(name + CACHE_SUFFIX) ?? localGet(name);
      }
    },

    setItem: async (name, value) => {
      localSet(name + CACHE_SUFFIX, value); // always keep an offline copy
      if (!supabaseConfigured) { localSet(name, value); return; }
      lastPayload = value;
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => { pending = null; void flush(name); }, 600);
    },

    removeItem: async (name) => {
      try { localStorage.removeItem(name); localStorage.removeItem(name + CACHE_SUFFIX); } catch { /* ignore */ }
    },
  };
}
