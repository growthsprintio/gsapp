import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { BriefDocument } from '@/components/brief-document';
import { SubmitWork } from './submit-work';
import type { PublicBrief } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

// Shared links shouldn't turn up in search results.
export const metadata: Metadata = { title: 'Creative brief', robots: { index: false, follow: false } };

/** /b/{token} — a brief shared with a creator or designer. No login. */
export default async function SharedBriefPage(props: PageProps<'/b/[token]'>) {
  const { token } = await props.params;
  const admin = createSupabaseAdmin();
  if (!admin || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();

  const { data } = await admin.from('shared_briefs')
    .select('brief, viewed_at, submissions').eq('token', token).maybeSingle();
  if (!data) notFound();

  // First open marks it viewed, so the team knows it landed.
  if (!data.viewed_at) {
    await admin.from('shared_briefs').update({ viewed_at: new Date().toISOString() }).eq('token', token);
  }

  const submitted = Array.isArray(data.submissions) ? data.submissions.length : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <BriefDocument brief={data.brief as PublicBrief}>
          <SubmitWork token={token} alreadySent={submitted} />
        </BriefDocument>
        <p className="text-center text-xs text-muted-foreground mt-6">Shared with GrowthSprint</p>
      </div>
    </main>
  );
}
