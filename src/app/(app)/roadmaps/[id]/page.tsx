'use client';

import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus, type RoadmapItem } from '@/lib/types';
import { FORMAT_OPTIONS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { use, useState } from 'react';
import { Plus, ArrowLeft, Zap, ExternalLink, ChevronDown, Pencil, Trash2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { BriefDrawer } from '@/components/brief-drawer';
import { AdReportDrawer } from '@/components/ad-report-drawer';

// ─── column config ───────────────────────────────────────────────────────────

interface Col {
  status: CreativeStatus;
  label: string;
  accent: string;   // top bar colour
  colBg: string;    // column background
}

const COLUMNS: Col[] = [
  { status: 'idea',             label: 'Idea',        accent: 'bg-border',      colBg: 'bg-card' },
  { status: 'briefed',          label: 'Briefed',     accent: 'bg-border',      colBg: 'bg-card' },
  { status: 'in_review',        label: 'Review',      accent: 'bg-primary/40',  colBg: 'bg-card' },
  { status: 'ready_to_launch',  label: 'Approved',    accent: 'bg-primary/70',  colBg: 'bg-card' },
  { status: 'launched',         label: 'Launched',    accent: 'bg-primary',     colBg: 'bg-card' },
];

// ─── kanban card ─────────────────────────────────────────────────────────────

function KanbanCard({ item, roadmapId, onEdit }: { item: RoadmapItem; roadmapId: string; onEdit: (i: RoadmapItem) => void }) {
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const [menu, setMenu] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        'bg-card border border-border rounded-xl p-3.5 shadow-sm group hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40 ring-2 ring-primary/30'
      )}>
      {/* Concept / name */}
      <p className="text-sm font-semibold leading-snug mb-1">
        {item.concept || item.adName || <span className="text-muted-foreground italic font-normal">Untitled</span>}
      </p>
      {item.angle && (
        <p className="text-xs text-muted-foreground mb-2">{item.angle}</p>
      )}

      {/* Tags row */}
      <div className="flex items-center flex-wrap gap-1 mb-3">
        {item.adFormat && (
          <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 capitalize">{item.adFormat}</span>
        )}
        {item.adSize && (
          <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{item.adSize}</span>
        )}
        {item.dueDate && (
          <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
            Due {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Meta badge */}
      {item.metaAdId && (
        <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-2">
          <Zap className="w-3 h-3" /> Live on Meta
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(item)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => deleteItem(roadmapId, item.id)}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Move status */}
        <div className="relative">
          <button onClick={() => setMenu(!menu)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5 transition-colors">
            Move <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-36 overflow-hidden">
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
      </div>
    </div>
  );
}

// ─── kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, items, roadmapId, onEdit, onAdd, onDropItem }: {
  col: Col; items: RoadmapItem[]; roadmapId: string;
  onEdit: (i: RoadmapItem) => void; onAdd: () => void;
  onDropItem: (itemId: string, status: CreativeStatus) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        if (itemId) onDropItem(itemId, col.status);
        setIsOver(false);
      }}
      className={cn(
        'flex flex-col rounded-2xl border overflow-hidden flex-shrink-0 w-56 transition-all',
        col.colBg,
        isOver ? 'border-primary ring-2 ring-primary/30 scale-[1.01]' : 'border-border'
      )}>
      {/* Accent bar */}
      <div className={cn('h-1.5 w-full', col.accent)} />

      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{col.label}</span>
          <span className="text-xs text-muted-foreground bg-background border border-border rounded-full px-1.5 py-0.5 font-medium">
            {items.length}
          </span>
        </div>
        <button onClick={onAdd}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-72">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} roadmapId={roadmapId} onEdit={onEdit} />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border/60 rounded-xl">
            <button onClick={onAdd} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              + Add creative
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── table row ────────────────────────────────────────────────────────────────

function TableRow({ item, roadmapId, onEdit, onReport }: {
  item: RoadmapItem; roadmapId: string;
  onEdit: (i: RoadmapItem) => void; onReport: (i: RoadmapItem) => void;
}) {
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const [menu, setMenu] = useState(false);
  const cfg = STATUS_CONFIG[item.status];

  return (
    <tr className="border-b border-border hover:bg-muted/40 transition-colors group">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{item.concept || item.adName || <span className="text-muted-foreground italic">Untitled</span>}</p>
        {item.adName && item.concept && (
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.adName}</p>
        )}
      </td>
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">
        {item.status === 'ready_to_launch' ? (
          <button
            onClick={() => updateItemStatus(roadmapId, item.id, 'launched')}
            className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
            <Zap className="w-3 h-3" /> Launch
          </button>
        ) : item.status === 'launched' ? (
          <button onClick={() => onReport(item)}
            title="View ad report"
            className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
            <BarChart3 className="w-3 h-3" /> Report
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onReport(item)} title="Ad report"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(item)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteItem(roadmapId, item.id)}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {item.creativeLink && (
            <a href={item.creativeLink} target="_blank" rel="noreferrer"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
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
  const [reportItem, setReportItem] = useState<RoadmapItem | null>(null);
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterStatus, setFilterStatus] = useState<CreativeStatus | 'all'>('all');

  if (!roadmap) return (
    <div className="px-8 py-8">
      <Link href="/roadmaps" className="text-sm text-primary">← Back to roadmaps</Link>
      <p className="text-muted-foreground mt-2">Roadmap not found.</p>
    </div>
  );

  const openEdit = (item: RoadmapItem) => { setEditItem(item); setDrawerOpen(true); };
  const openNew = () => { setEditItem(null); setDrawerOpen(true); };

  const filtered = roadmap.items.filter((i) =>
    (filterFormat === 'all' || i.adFormat === filterFormat) &&
    (filterStatus === 'all' || i.status === filterStatus)
  );

  const colItems = (status: CreativeStatus) => filtered.filter((i) => i.status === status);

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
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Assignee</p>
            <select className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option>All teammates</option>
              <option>Jordan Mills</option>
              <option>Sam Patel</option>
              <option>Casey Lee</option>
            </select>
          </div>
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
                  {['Concept Name', 'Status', 'Visual Format', 'Angle', 'Launch / Report', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No creative yet. <button onClick={openNew} className="text-primary hover:underline">Add one</button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={openEdit} onReport={setReportItem} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Pipeline board (secondary) — drag & drop to change status ── */}
      <div className="px-8 pt-4 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold">Pipeline Board</h2>
          <span className="text-[11px] text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
            Drag cards between columns to update status
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 236}px` }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                col={col}
                items={colItems(col.status)}
                roadmapId={roadmap.id}
                onEdit={openEdit}
                onAdd={openNew}
                onDropItem={(itemId, status) => updateItemStatus(roadmap.id, itemId, status)}
              />
            ))}
          </div>
        </div>
      </div>

      <BriefDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        roadmapId={roadmap.id}
        editItem={editItem}
      />

      <AdReportDrawer
        open={!!reportItem}
        onClose={() => setReportItem(null)}
        item={reportItem}
      />
    </div>
  );
}
