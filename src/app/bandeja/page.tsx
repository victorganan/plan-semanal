import { auth } from '@/auth';
import { getInboxPageData } from '@/lib/page-data';
import { BandejaClient } from '@/components/BandejaClient';

export default async function BandejaPage() {
  const session = await auth();
  const data = await getInboxPageData(session!.user.id);

  return (
    <BandejaClient
      initialInbox={data.inbox}
      projects={data.projects}
      areas={data.areas}
      tags={data.tags}
      calendarConnected={data.calendarConnected}
    />
  );
}
