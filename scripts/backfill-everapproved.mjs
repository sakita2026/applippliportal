import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const res = await prisma.decision.updateMany({
  where: { status: { in: ['approved', 'done'] } },
  data: { everApproved: true },
});
console.log('everApproved backfilled for', res.count, 'decisions');
await prisma.$disconnect();
