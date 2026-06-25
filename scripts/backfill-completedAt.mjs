// 既存の完了済みデータ（completedAt 未設定）に完了日 2026-06-24 をセットする一回限りのバックフィル
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const COMPLETED = new Date('2026-06-24T00:00:00.000Z');

async function main() {
  const todo = await prisma.todo.updateMany({
    where: { status: 'done', completedAt: null },
    data: { completedAt: COMPLETED },
  });
  const task = await prisma.decisionTask.updateMany({
    where: { status: 'done', completedAt: null },
    data: { completedAt: COMPLETED },
  });
  const dec = await prisma.decision.updateMany({
    where: { status: 'done', completedAt: null },
    data: { completedAt: COMPLETED },
  });
  console.log(`backfilled: todo=${todo.count} decisionTask=${task.count} decision=${dec.count}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
