'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';

export interface CurrentUser {
  name: string;
  email: string;
  workspace?: string;
}

/**
 * The signed-in identity, from Supabase when it's configured and the local
 * store otherwise.
 *
 * The sidebar resolved this itself while every other screen read
 * `store.user` — which nothing ever sets, since `setUser` is only ever
 * declared. That's why the dashboard greeted people by no name at all.
 */
export function useCurrentUser(): CurrentUser | null {
  const storeUser = useAppStore((s) => s.user);
  const [authUser, setAuthUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    fetch('/api/auth/bootstrap')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.user?.email) return;
        setAuthUser({
          name: d.user.email.split('@')[0],
          email: d.user.email,
          workspace: d.workspaces?.[0]?.name,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return authUser ?? storeUser ?? null;
}

/** Greeting that matches the clock rather than always claiming it's morning. */
export function useGreeting(): string {
  // Computed after mount: the server and the viewer can be in different parts
  // of the day, and rendering it during SSR would mismatch on hydration.
  const [greeting, setGreeting] = useState('Hello');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);
  return greeting;
}
