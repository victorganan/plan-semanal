import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TuEspacioClient } from '@/components/TuEspacioClient';

export default async function TuEspacioPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [areas, projects] = await Promise.all([
    prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    prisma.project.findMany({
      where: { userId },
      include: { area: true, collaborators: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return <TuEspacioClient initialAreas={areas} initialProjects={projects} />;
}
