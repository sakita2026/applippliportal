import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const decisions = await prisma.decision.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tasks: { orderBy: { sortOrder: 'asc' }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
      projects: { include: { project: true } },
      policies: { include: { policy: true } },
    },
  });
  console.log('OK count=', decisions.length);
  for (const d of decisions) console.log(d.status, 'everApproved=', d.everApproved, 'tasks=', d.tasks.length, 'task.pendingEdit=', d.tasks.map(t=>t.pendingEdit).join(','));
} catch (e) { console.log('PRISMA ERR:', e.message); }
await prisma.$disconnect();
