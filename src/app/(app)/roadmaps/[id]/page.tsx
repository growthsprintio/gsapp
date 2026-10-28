'use client';

import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus, type RoadmapItem } from '@/lib/types';
import { FORMAT_OPTIONS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { use, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ArrowLeft, Zap, ExternalLink, ChevronDown, Pencil, Trash2, Image as ImageIcon, CheckSquare, Square, Copy as CopyIcon, Check } from 'lucide-react';
import Link from 'next/link';
import { BriefDrawer } from '@/components/brief-drawer';
import { BulkLaunchModal } from '@/components/bulk-launch-modal';
import { currentOwner } from '@/lib/ownership';

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

/** Small preview of the first creative asset — media buyers scan visually. */
function RowThumb({ url }: { url?: string }) {
  const [err, setErr] = useState(false);
  const first = (url || '').split(/[\n,]+/)[0]?.trim();
  const showable = first && /^https?:\/\//i.test(first) && !err;

  return (
    <div className="w-10 h-10 rounded-md border border-border bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
      {showable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={first} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </div>
  );
}

function TableRow({ item, roadmapId, onEdit, selected, onToggle }: {
  item: RoadmapItem; roadmapId: string;
  onEdit: (i: RoadmapItem) => void;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const duplicateItem = useAppStore((s) => s.duplicateItem);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Position the portalled menu from the trigger, flipping up near the
  // viewport bottom so the last row's menu stays on screen. Any scroll or
  // resize closes it rather than leaving it stranded mid-page.
  useEffect(() => {
    if (!menu) { setMenuPos(null); return; }

    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const MENU_H = 180;
      const below = window.innerHeight - r.bottom;
      setMenuPos({
        top: below < MENU_H ? Math.max(8, r.top - MENU_H - 4) : r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - 160),
      });
    };
    place();

    const close = () => setMenu(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);
  const cfg = STATUS_CONFIG[item.status];
  // Anything interactive stops the row-level click that opens the brief.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <tr onClick={() => onEdit(item)}
      title="Open brief"
      className={cn(
        'border-b border-border transition-colors group cursor-pointer',
        selected ? 'bg-primary/5' : 'hover:bg-muted/40'
      )}>
      <td className="pl-4 pr-1 py-3" onClick={stop}>
        <button onClick={() => onToggle(item.id)}
          className={cn('transition-colors', selected ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}>
          {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-3">
          <RowThumb url={item.creativeLink} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.concept || item.adName || <span className="text-muted-foreground italic">Untitled</span>}</p>
            {item.adName && item.concept && (
              // The ad name gets pasted into Ads Manager and sheets, and it's
              // long enough that selecting it by hand is a nuisance.
              <div className="flex items-center gap-1.5 mt-0.5" onClick={stop}>
                <p className="text-[11px] text-muted-foreground font-mono truncate" title={item.adName}>{item.adName}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.adName!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title="Copy ad name"
                  aria-label="Copy ad name"
                  className={cn(
                    'p-0.5 rounded transition-all flex-shrink-0',
                    copied
                      ? 'text-primary opacity-100'
                      : 'text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                  )}>
                  {copied ? <Check className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3" onClick={stop}>
        {/* Quick status update.
            The menu is portalled to <body> and positioned from the trigger's
            rect: the table scrolls inside overflow-x-auto nested in an
            overflow-hidden card, and an absolutely positioned menu gets
            clipped by both. Setting overflow on one axis makes the other
            compute to auto, so it was cut off vertically too. */}
        <div className="inline-block">
          <button ref={triggerRef} onClick={() => setMenu(!menu)}
            className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity hover:opacity-80', cfg.bg, cfg.color)}>
            {cfg.label}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {menu && menuPos && createPortal(
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenu(false)} />
              <div
                style={{ top: menuPos.top, left: menuPos.left }}
                className="fixed z-[61] bg-popover border border-border rounded-xl shadow-lg py-1 min-w-36 overflow-hidden">
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
            </>,
            document.body,
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{item.adFormat || '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.angle || '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.product || '—'}</td>
      {/* Whose turn it is — the person in the slot this stage belongs to.
          A gap reads as "Needs …", which is the actionable version of
          "Unassigned": it says who to find. */}
      <td className="px-4 py-3">
        {(() => {
          const owner = currentOwner(item);
          return owner.name ? (
            <span className="inline-flex items-center gap-1.5 text-xs" title={`${owner.name} · ${owner.role} — ${owner.action}`}>
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {owner.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-foreground truncate max-w-28">{owner.name}</span>
                <span className="block text-[11px] text-muted-foreground">{owner.role}</span>
              </span>
            </span>
          ) : (
            <span className="text-xs text-amber-700/80" title={`Nobody is set as ${owner.role.toLowerCase()} — it's their turn`}>
              Needs {owner.role.toLowerCase()}
            </span>
          );
        })()}
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
          <button onClick={() => onEdit(item)} title="Edit brief" aria-label="Edit brief"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Same creative into another campaign — copy rather than rebuild */}
          <button onClick={() => duplicateItem(roadmapId, item.id)}
            title="Duplicate for another campaign" aria-label="Duplicate for another campaign"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <CopyIcon className="w-3.5 h-3.5" />
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

// Filter pills: outlined and quiet at rest, tinted when narrowing the list.
const FILTER = 'h-8 bg-card border border-border text-sm text-foreground rounded-full pl-3.5 hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors';
const FILTER_ON = 'border-primary/30 bg-primary/8 text-primary hover:bg-primary/10';

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
  // Bulk selection — the core of managing ads at scale.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLaunchOpen, setBulkLaunchOpen] = useState(false);
  const deleteItem = useAppStore((s) => s.deleteItem);
  const duplicateItem = useAppStore((s) => s.duplicateItem);
  const updateItem = useAppStore((s) => s.updateItem);

  if (!roadmap) return (
    <div className="px-8 py-8">
      <Link href="/roadmaps" className="text-sm text-primary">← Back to roadmaps</Link>
      <p className="text-muted-foreground mt-2">Roadmap not found.</p>
    </div>
  );

  const openEdit = (item: RoadmapItem) => { setEditItem(item); setDrawerOpen(true); };
  const openNew = () => { setEditItem(null); setDrawerOpen(true); };

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const clearSelection = () => setSelectedIds([]);

  const bulkSetStatus = (status: CreativeStatus) => {
    selectedIds.forEach((id) => updateItemStatus(roadmap.id, id, status));
    clearSelection();
  };
  const bulkDelete = () => {
    selectedIds.forEach((id) => deleteItem(roadmap.id, id));
    clearSelection();
  };
  /** Copy a whole selection so a batch can go into a second campaign. */
  const bulkDuplicate = () => {
    selectedIds.forEach((id) => duplicateItem(roadmap.id, id));
    clearSelection();
  };

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

  const selectedItems = roadmap.items.filter((i) => selectedIds.includes(i.id));
  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id));
  const toggleSelectAll = () =>
    setSelectedIds(allVisibleSelected ? [] : filtered.map((i) => i.id));
  // Only approved creatives can be pushed to Meta.
  const launchableCount = selectedItems.filter((i) => i.status === 'ready_to_launch').length;

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
      <div className="px-8 pt-6 pb-5 bg-background">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link href="/roadmaps" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Roadmaps
          </Link>
          {roadmap.period && (
            <span className="ml-1.5 text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              {roadmap.type === 'client' && roadmap.client
                ? `Client | ${roadmap.client}`
                : `DTC | ${roadmap.period}`}
            </span>
          )}
        </nav>

        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[26px] leading-tight font-semibold">{roadmap.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Every creative in this roadmap, from idea to launched.
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-1.5 bg-primary text-white font-medium text-sm pl-3.5 pr-4 h-9 rounded-full shadow-sm hover:bg-primary/90 hover:shadow transition-all flex-shrink-0">
            <Plus className="w-4 h-4" /> New creative
          </button>
        </div>

        {/* ── Filters: quiet outlined pills; one turns tinted when it's narrowing the list ── */}
        <div className="flex items-center gap-2 mt-6 flex-wrap">
            <select aria-label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CreativeStatus | 'all')}
              className={cn(FILTER, filterStatus !== 'all' && FILTER_ON)}
            >
              <option value="all">All statuses</option>
              {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
            <select aria-label="Ad format"
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className={cn(FILTER, filterFormat !== 'all' && FILTER_ON)}
            >
              <option value="all">All formats</option>
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
            <select aria-label="Product"
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className={cn(FILTER, filterProduct !== 'all' && FILTER_ON)}
            >
              <option value="all">All products</option>
              {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select aria-label="Angle"
              value={filterAngle}
              onChange={(e) => setFilterAngle(e.target.value)}
              className={cn(FILTER, filterAngle !== 'all' && FILTER_ON)}
            >
              <option value="all">All angles</option>
              {angleOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
        </div>

        {/* ── Compact stage summary (replaces the kanban board) ── */}
        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {COLUMNS.map((col) => {
            const count = stageCount(col.status);
            const active = filterStatus === col.status;
            return (
              <button key={col.status}
                onClick={() => setFilterStatus(active ? 'all' : col.status)}
                title={`Filter by ${col.label}`}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 h-8 transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'hover:bg-foreground/5'
                )}>
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.accent)} />
                <span className="text-sm text-muted-foreground">{col.label}</span>
                <span className="text-sm font-semibold tabular-nums">{count}</span>
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
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pl-4 pr-1 py-3 w-8">
                    <button onClick={toggleSelectAll} title="Select all"
                      className={cn('transition-colors', allVisibleSelected ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}>
                      {allVisibleSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {['Creative', 'Status', 'Format', 'Angle', 'Product', 'Owner', 'Asset', 'Launch', ''].map((h) => (
                    <th key={h} className="px-2 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No creative yet. <button onClick={openNew} className="text-primary hover:underline">Add one</button>
                    </td>
                  </tr>
                ) : (
                  <>
                    {activeItems.length > 0 && (
                      <tr className="bg-secondary/60">
                        <td colSpan={10} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Active · {activeItems.length}
                        </td>
                      </tr>
                    )}
                    {activeItems.map((item) => (
                      <TableRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={openEdit} selected={selectedIds.includes(item.id)} onToggle={toggleSelect} />
                    ))}
                    {inactiveItems.length > 0 && (
                      <tr className="bg-secondary/60">
                        <td colSpan={10} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                          Inactive · Launched · {inactiveItems.length}
                        </td>
                      </tr>
                    )}
                    {inactiveItems.map((item) => (
                      <TableRow key={item.id} item={item} roadmapId={roadmap.id} onEdit={openEdit} selected={selectedIds.includes(item.id)} onToggle={toggleSelect} />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk action bar — the scale workflow: select many, act once */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 bg-foreground text-background rounded-2xl shadow-2xl px-3 py-2.5">
            <span className="text-xs font-semibold px-2 whitespace-nowrap">
              {selectedIds.length} selected
            </span>

            <div className="w-px h-5 bg-background/20" />

            {/* Bulk status */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-background/10 transition-colors whitespace-nowrap">
                Set status <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                <div className="bg-popover text-foreground border border-border rounded-xl shadow-lg py-1 min-w-36 overflow-hidden">
                  {COLUMNS.map((col) => (
                    <button key={col.status} onClick={() => bulkSetStatus(col.status)}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.accent)} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setBulkLaunchOpen(true)}
              disabled={launchableCount === 0}
              title={launchableCount === 0 ? 'Only approved creatives can launch' : 'Launch selected into an ad set'}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              <Zap className="w-3.5 h-3.5" />
              Launch{launchableCount > 0 ? ` ${launchableCount}` : ''}
            </button>

            <button onClick={bulkDuplicate} title="Duplicate selected for another campaign"
              aria-label="Duplicate selected for another campaign"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg hover:bg-background/10 transition-colors">
              <CopyIcon className="w-3.5 h-3.5" />
              Duplicate
            </button>

            <button onClick={bulkDelete} title="Delete selected" aria-label="Delete selected"
              className="p-1.5 rounded-lg hover:bg-background/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-background/20" />

            <button onClick={clearSelection}
              className="text-xs px-2 py-1.5 rounded-lg hover:bg-background/10 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      <BulkLaunchModal
        open={bulkLaunchOpen}
        onClose={() => setBulkLaunchOpen(false)}
        items={selectedItems.filter((i) => i.status === 'ready_to_launch')}
        onLaunched={(results) => {
          results.filter((r) => r.ok).forEach((r) => {
            updateItem(roadmap.id, r.id, { metaAdId: r.adId });
            updateItemStatus(roadmap.id, r.id, 'launched');
          });
          clearSelection();
        }}
      />

      <BriefDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        roadmapId={roadmap.id}
        editItem={editItem}
      />
    </div>
  );
}
