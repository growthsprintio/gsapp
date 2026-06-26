'use client';

import { Users, Mail, Shield, Crown, Eye } from 'lucide-react';

const MEMBERS = [
  { id: '1', name: 'Alex Rivera', email: 'alex@growthsprint.io', role: 'admin' as const, initials: 'AR' },
  { id: '2', name: 'Jordan Kim', email: 'jordan@growthsprint.io', role: 'member' as const, initials: 'JK' },
  { id: '3', name: 'Sam Torres', email: 'sam@growthsprint.io', role: 'member' as const, initials: 'ST' },
  { id: '4', name: 'Casey Morgan', email: 'casey@agency.com', role: 'viewer' as const, initials: 'CM' },
];

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Crown, color: 'text-orange-600', bg: 'bg-orange-50' },
  member: { label: 'Member', icon: Shield, color: 'text-foreground', bg: 'bg-secondary' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bg: 'bg-secondary' },
};

export default function TeamPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage access and roles for your workspace.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Mail className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{MEMBERS.length} members</span>
        </div>
        <div className="divide-y divide-border">
          {MEMBERS.map((member) => {
            const role = ROLE_CONFIG[member.role];
            const RoleIcon = role.icon;
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${role.bg} ${role.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  {role.label}
                </span>
                <button className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2.5 py-1 hover:bg-secondary transition-colors">
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Role Permissions</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={role} className="space-y-2">
                <div className={`flex items-center gap-1.5 font-medium ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </div>
                <ul className="text-muted-foreground space-y-1">
                  {role === 'admin' && <>
                    <li>· Full access</li>
                    <li>· Manage team</li>
                    <li>· Connect integrations</li>
                    <li>· Launch to Meta</li>
                  </>}
                  {role === 'member' && <>
                    <li>· Create & edit briefs</li>
                    <li>· Manage roadmaps</li>
                    <li>· Update statuses</li>
                  </>}
                  {role === 'viewer' && <>
                    <li>· View roadmaps</li>
                    <li>· View briefs</li>
                    <li>· No editing</li>
                  </>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
