import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const result = await prisma.todo.updateMany({
  where: { userId: null },
  data: { userId: 'admin' },
});
console.log(`Updated ${result.count} legacy tasks -> userId='admin'`);
await prisma.$disconnect();
