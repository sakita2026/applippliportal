import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const START = '2026-06-21';
const DUE = '2026-07-05';

// 決定事項: 開始日・完了予定日
const d1 = await prisma.decision.updateMany({ where: { OR: [{ startDate: null }, { startDate: '' }] }, data: { startDate: START } });
const d2 = await prisma.decision.updateMany({ where: { OR: [{ dueDate: null }, { dueDate: '' }] }, data: { dueDate: DUE } });
// 実行タスク: 開始日（startDate）・完了予定日（whenDue）
const t1 = await prisma.decisionTask.updateMany({ where: { OR: [{ startDate: null }, { startDate: '' }] }, data: { startDate: START } });
const t2 = await prisma.decisionTask.updateMany({ where: { OR: [{ whenDue: null }, { whenDue: '' }] }, data: { whenDue: DUE } });

console.log(`Decision startDate=${d1.count} dueDate=${d2.count} / Task startDate=${t1.count} whenDue=${t2.count}`);
await prisma.$disconnect();
