'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus, type RoadmapItem, type Roadmap } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, Pencil, Trash2, Zap, ExternalLink } from 'lucide-react';

const STATUSES: CreativeStatus[] = ['idea', 'briefed', 'in_review', 'revisions_needed', 'ready_to_launch', 'launched'];

function StatusDropdown({ item, roadmapId }: { item: RoadmapItem; roadmapId: string }) {
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[item.status];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded', cfg.bg, cfg.color)}>
        {cfg.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-44">
            {STATUSES.map((s) => {
              const c = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => { updateItemStatus(roadmapId, item.id, s); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-secondary transition-colors text-left">
                  <span className={cn('px-2 py-0.5 rounded font-medium', c.bg, c.color)}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ItemRow({ item, roadmapId, onEdit }: { item: RoadmapItem; roadmapId: string; onEdit: (item: RoadmapItem) => void }) {
  const deleteItem = useAppStore((s) => s.deleteItem);

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-border/60 group transition-colors">
      <StatusDropdown item={item} roadmapId={roadmapId} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {item.adName
            ? <span className="font-mono text-xs">{item.adName}</span>
            : <span className="text-muted-foreground italic text-xs">Untitled</span>}
        </p>
        {item.concept && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.concept}</p>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {item.adFormat && (
          <span className="capitalize border border-border rounded px-1.5 py-0.5">{item.adFormat}</span>
        )}
        {item.adSize && <span>{item.adSize}</span>}
        {item.dueDate && (
          <span className="flex items-center gap-1">
            Due {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {item.metaAdId && (
          <span className="flex items-center gap-1 text-primary font-medium">
            <Zap className="w-3 h-3" /> Meta
          </span>
        )}
        {item.creativeLink && (
          <a href={item.creativeLink} target="_blank" rel="noreferrer"
            className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(item)}
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => deleteItem(roadmapId, item.id)}
          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface Props {
  roadmap: Roadmap;
  onEdit: (item: RoadmapItem) => void;
}

export function PipelineBoard({ roadmap, onEdit }: Props) {
  const [filterStatus, setFilterStatus] = useState<CreativeStatus | 'all'>('all');

  const items = filterStatus === 'all'
    ? roadmap.items
    : roadmap.items.filter((i) => i.status === filterStatus);

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, roadmap.items.filter((i) => i.status === s).length])
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Pipeline</h3>
        <span className="text-xs text-muted-foreground">{roadmap.items.length} total creative</span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
            filterStatus === 'all'
              ? 'bg-foreground text-background border-foreground'
              : 'border-border text-muted-foreground hover:text-foreground')}>
          All ({roadmap.items.length})
        </button>
        {STATUSES.map((s) => counts[s] > 0 && (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
              filterStatus === s
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground')}>
            {STATUS_CONFIG[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No creative matches this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
