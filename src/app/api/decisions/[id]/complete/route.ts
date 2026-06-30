import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { canManageDecision } from '@/lib/visibility';
import { writeAudit } from '@/lib/audit';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

// タスク0件の決定事項のみ、手動で完了/未完了を切り替える。承認済み(approved/done)が対象。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = req.headers.get('x-wp-user');
  const member = await getMember(username);
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const done = !!(body as { done?: boolean }).done;

  const d = await prisma.decision.findUnique({ where: { id }, include: { tasks: true } });
  if (!d) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  // 完了/未完了の切替は 入力者(起案者)・担当者・担当部長・取締役 のみ（編集権限と同じ）
  const assigneeDept = d.assigneeUsername ? (await getMember(d.assigneeUsername))?.departmentId ?? null : null;
  if (!canManageDecision(d, member, assigneeDept)) {
    return NextResponse.json({ error: '完了操作は入力者・担当者・担当部長・取締役のみ可能です' }, { status: 403 });
  }
  if (d.status === 'pending') return NextResponse.json({ error: '承認待ちの決定事項は完了にできません' }, { status: 409 });
  if (d.tasks.length > 0) return NextResponse.json({ error: 'タスクがある決定事項はタスクの完了状況で判定されます' }, { status: 409 });

  const nextStatus = done ? 'done' : 'approved';
  await prisma.decision.update({ where: { id }, data: { status: nextStatus, completedAt: done ? (d.completedAt ?? new Date()) : null } });
  await writeAudit({ entityType: 'decision', entityId: id, title: d.title, action: 'edit', actor: username ?? '', detail: done ? '決定事項を完了にしました' : '決定事項を未完了に戻しました' });

  const full = await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE });
  const approvals = await prisma.approval.findMany({
    where: { entityType: 'decision', action: 'approve', entityId: id },
    select: { approver: true, asDirector: true, asManager: true, createdAt: true },
  });
  const { prevState, ...decision } = full ?? {};
  void prevState;
  return NextResponse.json({
    ...decision,
    approvals: approvals.map((a) => ({ approver: a.approver, asDirector: a.asDirector, asManager: a.asManager, createdAt: a.createdAt.toISOString() })),
    hasPrevState: !!full?.prevState,
  });
}
