import Link from 'next/link';
import { text } from '@/i18n/es';

export function BandejaSummaryLink({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-base-border bg-base-surface px-4 py-3 text-sm">
      <span>{text.inboxList.summaryLine(pendingCount)}</span>
      <Link href="/bandeja" className="shrink-0 font-medium text-accent hover:underline">
        {text.inboxList.summaryLink}
      </Link>
    </div>
  );
}
