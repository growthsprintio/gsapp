'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import type { Roadmap } from '@/lib/types';
import { X } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; }

const TYPES: Array<{ value: Roadmap['type']; label: string; desc: string }> = [
  { value: 'monthly', label: 'Monthly', desc: 'Organized by month' },
  { value: 'quarterly', label: 'Quarterly', desc: 'Quarterly push' },
  { value: 'product', label: 'Product', desc: 'Product-line focused' },
  { value: 'client', label: 'Client', desc: 'Agency client sprint' },
];

export function NewRoadmapDialog({ open, onClose }: Props) {
  const addRoadmap = useAppStore((s) => s.addRoadmap);
  const router = useRouter();
  const [form, setForm] = useState({ name: '', type: 'monthly' as Roadmap['type'], client: '', description: '', period: '' });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = addRoadmap({ ...form, status: 'active' });
    onClose();
    router.push(`/roadmaps/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-semibold">New Roadmap</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5">Roadmap Name *</label>
            <input
              required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. June 2025 — Performance"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, desc }) => (
                <button type="button" key={value}
                  onClick={() => setForm({ ...form, type: value })}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    form.type === value ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-border/60'
                  }`}>
                  <p className="font-medium">{label}</p>
                  <p className="mt-0.5 opacity-70">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {form.type === 'client' && (
            <div>
              <label className="text-xs font-medium block mb-1.5">Client Name</label>
              <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1.5">Period / Label</label>
            <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="e.g. June 2025, Q3, Sprint 4"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Optional — shown as the tag on the roadmap card.</p>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief context about this roadmap..."
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              Create Roadmap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
