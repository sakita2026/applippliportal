import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'completedAt' ORDER BY TABLE_NAME"
);
console.log('completedAt columns found:', JSON.stringify(rows));
await prisma.$disconnect();
