import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ProjectsClient } from '@/components/ProjectsClient';

export default async function ProyectosPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return <ProjectsClient initialProjects={projects} />;
}
