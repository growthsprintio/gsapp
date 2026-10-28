'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

/** Where the recipient sends their finished work back — a link and a note. */
export function SubmitWork({ token, alreadySent }: { token: string; alreadySent: number }) {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [count, setCount] = useState(alreadySent);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setState('sending');
    const r = await fetch(`/api/public/briefs/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, note }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) {
      setError(d?.error || 'Could not send. Check your connection and try again.');
      setState('idle');
      return;
    }
    setCount((c) => c + 1);
    setUrl('');
    setNote('');
    setState('done');
  };

  return (
    <section className="px-8 py-7 bg-muted/50 border-t border-border">
      <h2 className="text-sm font-semibold">Send your work</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Paste a link to your files: Google Drive, Dropbox, WeTransfer or Frame.io. Make sure it&rsquo;s set so anyone with the link can view.
      </p>

      {state === 'done' && (
        <div className="flex items-center gap-2 mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Got it, thanks. The team will see it in their workspace. Send another link below if you need to.
        </div>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/…"
          className="w-full h-10 bg-card border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="Anything we should know? (optional)"
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {count > 0 ? `${count} link${count === 1 ? '' : 's'} sent so far` : ''}
          </span>
          <button type="submit" disabled={state === 'sending' || !url.trim()}
            className="flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {state === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
            Send work
          </button>
        </div>
      </form>
    </section>
  );
}
