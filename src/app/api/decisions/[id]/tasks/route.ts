import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, isDirectorLike } from '@/lib/approval';
import { writeAudit } from '@/lib/audit';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

// 既存の決定事項に実行タスクを後から追加する。
// 承認マトリクス上「タスク単独追加＝承認不要」なので、追加しても決定事項の承認状態は変えない（即・稼働）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const username = req.headers.get('x-wp-user');
    if (!username) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    // 決定事項への実行タスク追加は「部長以上」＝部長・取締役・代表取締役・管理者のみ
    const member = await getMember(username);
    if (!member || !(member.role === 'admin' || isDirectorLike(member) || member.position === 'manager')) {
      return NextResponse.json({ error: '実行タスクの追加は部長以上のみ可能です' }, { status: 403 });
    }

    const decision = await prisma.decision.findUnique({ where: { id }, include: { tasks: true } });
    if (!decision) return NextResponse.json({ error: '対象の決定事項が見つかりません' }, { status: 404 });

    const body = await req.json();
    const { what, why, who, whereLoc, whenDue, how, departmentId, category, startDate, projectIds, policyIds, requireApproval } = body;
    if (!what || !String(what).trim()) return NextResponse.json({ error: 'タスク内容（何を）は必須です' }, { status: 400 });

    const taskName = String(what).trim();
    const sortOrder = decision.tasks.length;
    // 決定事項からの追加(requireApproval=true)は再承認が必要＝追加タスクは承認まで非表示(pendingEdit)。
    // 実行タスクページからの追加(requireApproval=false)は承認不要＝即稼働。
    const task = await prisma.decisionTask.create({
      data: {
        decisionId: id,
        what: taskName,
        why: why ?? null, who: who ?? null, whereLoc: whereLoc ?? null, whenDue: whenDue ?? null,
        how: how ?? null, departmentId: departmentId ?? null, category: category ?? null, startDate: startDate ?? null,
        status: 'todo', sortOrder,
        createdBy: username ?? null, // 後追い追加＝追加した本人を作成者に
        pendingEdit: !!requireApproval,
        projects: Array.isArray(projectIds) ? { create: projectIds.slice(0, 5).map((pid: string) => ({ projectId: pid })) } : undefined,
        policies: Array.isArray(policyIds) ? { create: policyIds.slice(0, 5).map((pid: string) => ({ policyId: pid })) } : undefined,
      },
    });

    if (requireApproval) {
      // 決定事項を再承認待ちに戻し、何を追加したかを差分で明示
      const note = JSON.stringify([{ field: '追加した実行タスク', before: '', after: taskName }]);
      await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id } });
      await prisma.decision.update({ where: { id }, data: { status: 'pending', approvedBy: null, approvedAt: null, editNote: note } });
    }
    // 監査ログ：実行タスクの追加（何を追加したかを記録）
    await writeAudit({ entityType: 'decision', entityId: id, title: decision.title, action: 'edit', actor: username, detail: `実行タスクを追加: 「—」→「${taskName}」` });

    const updated = await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE });
    return NextResponse.json({ decision: updated, task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'タスクの追加に失敗しました' }, { status: 500 });
  }
}
