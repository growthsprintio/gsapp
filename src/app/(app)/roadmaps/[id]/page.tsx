'use client';

import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus, type RoadmapItem } from '@/lib/types';
import { FORMAT_OPTIONS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { use, useState } from 'react';
import { Plus, ArrowLeft, Zap, ExternalLink, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { BriefDrawer } from '@/components/brief-drawer';

// ─── column config ───────────────────────────────────────────────────────────

interface Col {
  status: CreativeStatus;
  label: string;
  accent: string;   // top bar colour
}

const COLUMNS: Col[] = [
  { status: 'idea',             label: 'Idea',        accent: 'bg-border', },
  { status: 'briefed',          label: 'Briefed',     accent: 'bg-border', },
  { status: 'in_review',        label: 'Review',      accent: 'bg-primary/40', },
  { status: 'ready_to_launch',  label: 'Approved',    accent: 'bg-primary/70', },
  { status: 'launched',         label: 'Launched',    accent: 'bg-primary', },
];

// ─── table row ────────────────────────────────────────────────────────────────

function TableRow({ item, roadmapId, onEdit }: {
  item: RoadmapItem; roadmapId: string;
  onEdit: (i: RoadmapItem) => void;
}) {
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const [menu, setMenu] = useState(false);
  const cfg = STATUS_CONFIG[item.status];
  // Anything interactive stops the row-level click that opens the brief.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <tr onClick={() => onEdit(item)}
      title="Open brief"
      className="border-b border-border hover:bg-muted/40 transition-colors group cursor-pointer">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{item.concept || item.adName || <span className="text-muted-foreground italic">Untitled</span>}</p>
        {item.adName && item.concept && (
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.adName}</p>
        )}
      </td>
      <td className="px-4 py-3" onClick={stop}>
        {/* Quick status update */}
        <div className="relative inline-block">
          <button onClick={() => setMenu(!menu)}
            className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-80', cfg.bg, cfg.color)}>
            {cfg.label}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-36 overflow-hidden">
                {COLUMNS.map((col) => (
                  <button key={col.status}
                    onClick={() => { updateItemStatus(roadmapId, item.id, col.status); setMenu(false); }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left',
                      item.status === col.status ? 'text-primary font-medium' : 'text-foreground'
                    )}>
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.accent)} />
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{item.adFormat || '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.angle || '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.product || '—'}</td>
      <td className="px-4 py-3">
        {item.assignee ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
              {item.assignee.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-muted-foreground truncate max-w-24">{item.assignee}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3" onClick={stop}>
        {item.creativeLink ? (
          <a href={item.creativeLink} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-colors">
            <ExternalLink className="w-3 h-3" /> View
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3" onClick={stop}>
        {item.status === 'ready_to_launch' ? (
          <button
            onClick={() => updateItemStatus(roadmapId, item.id, 'launched')}
            className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
            <Zap className="w-3 h-3" /> Launch
          </button>
        ) : item.metaAdId ? (
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <Zap className="w-3 h-3" /> Live
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3" onClick={stop}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteItem(roadmapId, item.id)}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function RoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const roadmap = roadmaps.find((r) => r.id === id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<RoadmapItem | null>(null);
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterStatus, setFilterStatus] = useState<CreativeStatus | 'all'>('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterAngle, setFilterAngle] = useState('all');

  if (!roadmap) return (
    <div className="px-8 py-8">
      <Link href="/roadmaps" className="text-sm text-primary">← Back to roadmaps</Link>
      <p className="text-muted-foreground mt-2">Roadmap not found.</p>
    </div>
  );

  const openEdit = (item: RoadmapItem) => { setEditItem(item); setDrawerOpen(true); };
  const openNew = () => { setEditItem(null); setDrawerOpen(true); };

  // Multi-select fields are stored comma-joined, so match on membership.
  const has = (field: string | undefined, value: string) =>
    (field || '').split(',').map((v) => v.trim()).includes(value);

  const productOptions = [...new Set(
    roadmap.items.flatMap((i) => (i.product || '').split(',').map((p) => p.trim()).filter(Boolean))
  )].sort();
  const angleOptions = [...new Set(
    roadmap.items.flatMap((i) => (i.angle || '').split(',').map((a) => a.trim()).filter(Boolean))
  )].sort();

  const filtered = roadmap.items.filter((i) =>
    (filterFormat === 'all' || i.adFormat === filterFormat) &&
    (filterStatus === 'all' || i.status === filterStatus) &&
    (filterProduct === 'all' || has(i.product, filterProduct)) &&
    (filterAngle === 'all' || has(i.angle, filterAngle))
  );

  // Active = still moving through the pipeline; Inactive = launched (done)
  const activeItems = filtered.filter((i) => i.status !== 'launched');
  const inactiveItems = filtered.filter((i) => i.status === 'launched');

  const colItems = (status: CreativeStatus) => filtered.filter((i) => i.status === status);

  // Summary counts ignore the status filter so the row always shows the full funnel.
  const stageBase = roadmap.items.filter((i) =>
    (filterFormat === 'all' || i.adFormat === filterFormat) &&
    (filterProduct === 'all' || has(i.product, filterProduct)) &&
    (filterAngle === 'all' || has(i.angle, filterAngle))
  );
  const stageCount = (status: CreativeStatus) => stageBase.filter((i) => i.status === status).length;

  return (
    <div>
      {/* ── Top header ── */}
      <div className="px-8 pt-7 pb-5 border-b border-border bg-background">
        <Link href="/roadmaps"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors w-fit">
          <ArrowLeft className="w-3 h-3" /> Roadmaps
        </Link>

        <div className="flex items-start justify-between">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">{roadmap.name}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Pipeline</span>
              {roadmap.period && (
                <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full ml-1">
                  {roadmap.type === 'client' && roadmap.client
                    ? `Client | ${roadmap.client}`
                    : `DTC | ${roadmap.period}`}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{roadmap.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Every creative in this roadmap, from idea to launched. Drag cards on the board below to move them through the pipeline.
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" /> New Creative
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-3 mt-5 p-4 bg-card border border-border rounded-2xl">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Status</p>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CreativeStatus | 'all')}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All statuses</option>
              {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Ad Format</p>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All formats</option>
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Product</p>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All products</option>
              {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Angle</p>
            <select
              value={filterAngle}
              onChange={(e) => setFilterAngle(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All angles</option>
              {angleOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* ── Compact stage summary (replaces the kanban board) ── */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {COLUMNS.map((col) => {
            const count = stageCount(col.status);
            const active = filterStatus === col.status;
            return (
              <button key={col.status}
                onClick={() => setFilterStatus(active ? 'all' : col.status)}
                title={`Filter by ${col.label}`}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                )}>
                <span className={cn('w-1.5 h-6 rounded-full flex-shrink-0', col.accent)} />
                <span className="text-lg font-bold leading-none">{count}</span>
                <span className="text-xs text-muted-foreground">{col.label}</span>
              </button>
            );
          })}
          {filterStatus !== 'all' && (
            <button onClick={() => setFilterStatus('all')}
              className="text-xs text-primary hover:underline ml-1">Clear</button>
          )}
        </div>
      </div>

      {/* ── Ads by Status table — PRIMARY ── */}
      <div className="px-8 pt-6 pb-2">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-bold">Ads by Status</h2>
            <button onClick={openNew}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Creative
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {['Concept Name', 'Status', 'Format', 'Angle', 'Product', 'Owner', 'Creative', 'Launch', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No creative yet. <button onClick={openNew} className="text-primary hover:underline">Add one</button>
                    </td>
                  </tr>
                ) : (
                  <>
                    {activeItems.length > 0 && (
                      <tr className="bg-secondary/60">
                        <td colSpan={9} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Active · {activeItems.length}
                        </td>
                      </tr>
                    )}
                    {activeItems.map((item) => (
                      <TableRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={openEdit} />
                    ))}
                    {inactiveItems.length > 0 && (
                      <tr className="bg-secondary/60">
                        <td colSpan={9} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Inactive · Launched · {inactiveItems.length}
                        </td>
                      </tr>
                    )}
                    {inactiveItems.map((item) => (
                      <TableRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={openEdit} />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BriefDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        roadmapId={roadmap.id}
        editItem={editItem}
      />
    </div>
  );
}
