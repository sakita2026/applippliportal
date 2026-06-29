import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TASK_INCLUDE = { projects: { include: { project: true } }, policies: { include: { policy: true } } };
const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' }, include: TASK_INCLUDE },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

async function tryq(name, fn) {
  try { const r = await fn(); console.log(`${name}: OK (${Array.isArray(r) ? r.length : 'ok'})`); }
  catch (e) { console.log(`${name}: ERROR -> ${String(e.message || e).slice(0, 400)}`); }
}

await tryq('decisions.findMany+include', () => prisma.decision.findMany({ orderBy: { createdAt: 'desc' }, include: DECISION_INCLUDE }));
await tryq('todos.findMany+steps', () => prisma.todo.findMany({ orderBy: { createdAt: 'desc' }, include: { steps: { orderBy: { stepOrder: 'asc' } } } }));
await tryq('approvals.findMany', () => prisma.approval.findMany({ where: { entityType: 'decision', action: 'approve' } }));
await prisma.$disconnect();
