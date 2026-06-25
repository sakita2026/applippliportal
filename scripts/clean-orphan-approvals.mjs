// エンティティが存在しない承認レコード（孤児）を削除
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.approval.findMany();
let removed = 0;
for (const r of rows) {
  let exists = false;
  if (r.entityType === 'decision') exists = !!(await p.decision.findUnique({ where: { id: r.entityId } }));
  else if (r.entityType === 'policy') exists = !!(await p.policy.findUnique({ where: { id: r.entityId } }));
  else if (r.entityType === 'project') exists = !!(await p.project.findUnique({ where: { id: r.entityId } }));
  if (!exists) { await p.approval.delete({ where: { id: r.id } }); removed++; }
}
console.log(`孤児承認 ${removed}件を削除（全${rows.length}件中）`);
await p.$disconnect();
