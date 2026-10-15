'use client';

import { useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle, Link2 as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Drop a creative in, get a hosted URL back.
 *
 * Pasting a link still works everywhere this is used — this is the easier
 * path, not the only one, because a link the designer already has shouldn't
 * need re-uploading.
 */
export function AssetDrop({ onUploaded, multiple = false, className }: {
  onUploaded: (urls: string[]) => void;
  multiple?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [link, setLink] = useState('');
  const [importing, setImporting] = useState(false);

  // Import by link: fetch it once and host our own copy, so the creative no
  // longer depends on the original host staying up.
  const importLink = async () => {
    const url = link.trim();
    if (!url) return;
    setError('');
    setNote('');
    setImporting(true);
    try {
      const res = await fetch('/api/upload/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not import that link.');
      if (d.note) setNote(d.note);
      setLink('');
      onUploaded([d.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that link.');
    } finally {
      setImporting(false);
    }
  };

  const send = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, multiple ? 10 : 1);

    setError('');
    setBusy(true);
    setProgress({ done: 0, total: list.length });

    const urls: string[] = [];
    try {
      for (const file of list) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || `Could not upload ${file.name}.`);
        urls.push(d.url);
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      if (urls.length) onUploaded(urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}
        disabled={busy}
        className={cn(
          'w-full border border-dashed rounded-lg px-3 py-4 flex flex-col items-center justify-center gap-1.5 transition-colors',
          over ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
          busy && 'opacity-70 cursor-wait',
        )}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">
              Uploading{progress.total > 1 ? ` ${progress.done + 1} of ${progress.total}` : ''}…
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">
              Drop {multiple ? 'creatives' : 'a creative'} here, or click to browse
            </span>
            <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP, GIF, MP4 or MOV · up to 30MB</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        onChange={(e) => send(e.target.files)}
      />

      {/* Import by link — the file ends up hosted either way. */}
      <div className="flex gap-2 mt-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); importLink(); } }}
          placeholder="…or paste an image link to import"
          className="flex-1 min-w-0 border border-border rounded-lg px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="button" onClick={importLink} disabled={!link.trim() || importing}
          className="border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-secondary transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0">
          {importing
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Importing…</>
            : <><LinkIcon className="w-3 h-3" /> Import</>}
        </button>
      </div>

      {note && <p className="text-[11px] text-muted-foreground mt-1.5">{note}</p>}

      {error && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
