import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { restoreTask } from '@/lib/snapshot';
import { writeAudit } from '@/lib/audit';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

// 実行タスクの編集取り消し（このタスクだけ編集前に復元）。承認待ちの間のみ・編集した本人のみ。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  const username = req.headers.get('x-wp-user');
  const member = await getMember(username);
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const task = await prisma.decisionTask.findUnique({ where: { id: taskId } });
  if (!task || task.decisionId !== id) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  if (!task.pendingEdit || !task.prevState) return NextResponse.json({ error: '取り消せる編集がありません' }, { status: 409 });
  if (task.editedBy !== member.username) return NextResponse.json({ error: '編集の取り消しは編集した本人のみ可能です' }, { status: 403 });

  await restoreTask(taskId);
  await writeAudit({ entityType: 'decision', entityId: id, title: '', action: 'edit', actor: username ?? '', detail: `実行タスク「${task.what}」の編集を取り消し` });
  const decision = await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE });
  return NextResponse.json({ decision });
}
