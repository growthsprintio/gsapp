'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Map, Type, Settings,
  Zap, ChevronRight, Users, ChevronDown,
  Check, Plus, Building2
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmaps', label: 'Roadmaps', icon: Map },
  { href: '/copy-bank', label: 'Copy Bank', icon: Type },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function AccountSwitcher() {
  const accounts = useAppStore((s) => s.accounts);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const switchAccount = useAppStore((s) => s.switchAccount);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = accounts.find((a) => a.id === currentAccountId);
  const initials = current?.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="relative px-3 py-3 border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold truncate">{current?.name ?? 'No account'}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{current?.type}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Workspaces</p>
            </div>
            <div className="py-1 max-h-56 overflow-y-auto">
              {accounts.map((acct) => {
                const acctInitials = acct.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                const active = acct.id === currentAccountId;
                return (
                  <button
                    key={acct.id}
                    onClick={() => { switchAccount(acct.id); setOpen(false); router.push('/dashboard'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {acctInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{acct.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{acct.type}</p>
                    </div>
                    {active && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border py-1">
              <Link
                href="/accounts"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Manage workspaces</p>
              </Link>
              <Link
                href="/accounts?new=1"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
                <p className="text-xs font-medium text-primary">New workspace</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  return (
    <aside className="w-56 h-screen flex flex-col border-r border-border bg-sidebar sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">GrowthSprint</span>
        </div>
      </div>

      {/* Account switcher */}
      <AccountSwitcher />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-primary opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
