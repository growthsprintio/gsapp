'use client';

import { useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle, Link2, Copy, Check, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One control for getting a creative into a brief: upload a file, or paste a
 * link we import. Either way the result is a GrowthSprint-hosted URL, shown
 * back with a copy button so it's obvious what the ad will actually use.
 *
 * `value` is the newline-joined list of hosted URLs the form already holds.
 */
export function CreativeInput({ value, onChange, multiple = false, className }: {
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState('');

  const urls = value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

  const add = (next: string[]) => {
    const combined = multiple ? [...urls, ...next].slice(0, 10) : next.slice(0, 1);
    onChange(combined.join('\n'));
  };

  const remove = (url: string) => onChange(urls.filter((u) => u !== url).join('\n'));

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 1500);
  };

  const sendFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, multiple ? 10 : 1);
    setError(''); setNote('');

    const done: string[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setBusy(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : 'Uploading…');
        const body = new FormData();
        body.append('file', list[i]);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || `Could not upload ${list[i].name}.`);
        done.push(d.url);
      }
      add(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      if (done.length) add(done); // keep whatever did land
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /** Imports straight away — no Enter, no extra click. */
  const importUrl = async (raw: string) => {
    const url = raw.trim();
    if (!url || busy) return;
    setError(''); setNote(''); setBusy('Importing…');
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
      add([d.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import that link.');
    } finally {
      setBusy('');
    }
  };

  const atLimit = !multiple && urls.length >= 1;

  return (
    <div className={className}>
      {/* What the ad will use */}
      {urls.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {urls.map((url) => (
            <div key={url} className="flex items-center gap-2 border border-border rounded-lg p-1.5 bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-9 h-9 rounded object-cover bg-secondary flex-shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-primary">Hosted by GrowthSprint</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{url}</p>
              </div>
              <button type="button" onClick={() => copy(url)} title="Copy link"
                className="p-1.5 rounded-md hover:bg-secondary transition-colors flex-shrink-0">
                {copied === url ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <a href={url} target="_blank" rel="noreferrer" title="Open"
                className="p-1.5 rounded-md hover:bg-secondary transition-colors flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <button type="button" onClick={() => remove(url)} title="Remove"
                className="p-1.5 rounded-md hover:bg-secondary transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!atLimit && (
        <>
          {/* Two ways in, one visible at a time */}
          <div className="flex gap-1 mb-2">
            {([['upload', 'Upload a file', UploadCloud], ['link', 'Paste a link', Link2]] as const).map(([m, label, Icon]) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                  mode === m ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/30',
                )}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); sendFiles(e.dataTransfer.files); }}
              disabled={!!busy}
              className={cn(
                'w-full border border-dashed rounded-lg px-3 py-4 flex flex-col items-center justify-center gap-1.5 transition-colors',
                over ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
                busy && 'opacity-70 cursor-wait',
              )}>
              {busy ? (
                <><Loader2 className="w-4 h-4 text-primary animate-spin" /><span className="text-xs text-muted-foreground">{busy}</span></>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Drop {multiple ? 'creatives' : 'a creative'} here, or click to browse</span>
                  <span className="text-[10px] text-muted-foreground">JPG, PNG, WebP, GIF, MP4 or MOV · up to 30MB</span>
                </>
              )}
            </button>
          ) : (
            <div>
              <input
                value={link}
                autoFocus
                disabled={!!busy}
                onChange={(e) => setLink(e.target.value)}
                // Paste imports immediately; blur catches anything typed.
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (/^https?:\/\//i.test(text.trim())) { e.preventDefault(); setLink(text.trim()); importUrl(text); }
                }}
                onBlur={() => { if (link.trim()) importUrl(link); }}
                placeholder="https://…/creative.jpg"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                {busy
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> {busy}</>
                  : 'Paste and it imports automatically — we fetch a copy so the ad never depends on the original host.'}
              </p>
            </div>
          )}
        </>
      )}

      <input ref={inputRef} type="file" hidden multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        onChange={(e) => sendFiles(e.target.files)} />

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
