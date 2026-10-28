import { ExternalLink } from 'lucide-react';
import { KIND_LABEL, lines, formatDue, type PublicBrief } from '@/lib/outreach';

/**
 * The brief as the recipient reads it. Shared by the public /b/{token} page
 * and the in-app preview, so what the team previews is exactly what's sent.
 * No hooks — renders on the server for the public page.
 */
export function BriefDocument({ brief, children }: { brief: PublicBrief; children?: React.ReactNode }) {
  const facts = [
    brief.dueDate && { label: 'Due', value: formatDue(brief.dueDate) },
    brief.product && { label: 'Product', value: brief.product },
    brief.angle && { label: 'Angle', value: brief.angle },
    brief.compensation && { label: 'Compensation', value: brief.compensation },
  ].filter(Boolean) as { label: string; value: string }[];

  const keyMessages = lines(brief.keyMessages);
  const hooks = lines(brief.hooks);
  const dos = lines(brief.dos);
  const donts = lines(brief.donts);

  return (
    <article className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <header className="px-8 pt-8 pb-6 border-b border-border">
        <p className="text-xs font-medium text-primary">{KIND_LABEL[brief.kind]}</p>
        <h1 className="text-[28px] leading-tight font-semibold mt-1">{brief.title || 'Untitled brief'}</h1>
        {brief.recipientName && (
          <p className="text-sm text-muted-foreground mt-1">Prepared for {brief.recipientName}</p>
        )}
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium mt-0.5">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className="px-8 py-7 space-y-8">
        {brief.overview && (
          <Section title="Overview">
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{brief.overview}</p>
          </Section>
        )}

        {brief.deliverables.length > 0 && (
          <Section title="What we need">
            <ul className="divide-y divide-border border border-border rounded-xl">
              {brief.deliverables.map((d, i) => (
                <li key={d.id || i} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="text-sm font-medium flex-1">{d.label}</span>
                  {[d.size, d.length].filter(Boolean).map((t) => (
                    <span key={t} className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{t}</span>
                  ))}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {keyMessages.length > 0 && <Section title="Key messages"><Bullets items={keyMessages} /></Section>}
        {hooks.length > 0 && <Section title="Hooks to try"><Bullets items={hooks} quote /></Section>}

        {(dos.length > 0 || donts.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {dos.length > 0 && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Do</p>
                <Bullets items={dos} />
              </div>
            )}
            {donts.length > 0 && (
              <div className="rounded-xl bg-red-50/60 border border-red-100 p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">Don&rsquo;t</p>
                <Bullets items={donts} />
              </div>
            )}
          </div>
        )}

        {brief.references.length > 0 && (
          <Section title="References">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {brief.references.map((url) => <Reference key={url} url={url} />)}
            </div>
          </Section>
        )}

        {brief.usageRights && (
          <Section title="Usage rights">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{brief.usageRights}</p>
          </Section>
        )}
      </div>

      {children}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items, quote }: { items: string[]; quote?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 mt-2.5 flex-shrink-0" />
          <span>{quote ? `“${t.replace(/^["“]|["”]$/g, '')}”` : t}</span>
        </li>
      ))}
    </ul>
  );
}

const IMAGE = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;

function Reference({ url }: { url: string }) {
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  return (
    <a href={url} target="_blank" rel="noreferrer noopener"
      className="group block border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
      {IMAGE.test(url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full aspect-square object-cover bg-muted" />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-xs text-muted-foreground truncate px-2.5 py-2 group-hover:text-foreground">{host}</p>
    </a>
  );
}
