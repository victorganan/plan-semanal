import { auth } from '@/auth';
import { getTaskListPageData } from '@/lib/page-data';
import { TareasClient } from '@/components/TareasClient';

export default async function TareasPage() {
  const session = await auth();
  const data = await getTaskListPageData(session!.user.id);
  return (
    <TareasClient
      initialTasks={data.tasks}
      projects={data.projects}
      areas={data.areas}
      tags={data.tags}
      initialSavedViews={data.savedViews.map((v) => ({ id: v.id, name: v.name, config: v.config }))}
      calendarConnected={data.calendarConnected}
    />
  );
}
