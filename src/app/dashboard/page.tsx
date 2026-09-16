import { auth } from '@/auth';
import { computeDashboardStats } from '@/lib/dashboard';
import { DashboardClient } from '@/components/DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  const stats = await computeDashboardStats(session!.user.id, 8);

  return <DashboardClient stats={stats} />;
}
