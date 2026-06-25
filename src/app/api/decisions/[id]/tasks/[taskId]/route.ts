import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { snapshotTask } from '@/lib/snapshot';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

// タスク（5W1H）の更新。ステータス変更＝進捗（再承認不要）。contentEdit=true は5W1H編集＝親決定の再承認。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const { id, taskId } = await params;
    const body = await req.json();
    const { what, why, who, whereLoc, whenDue, how, departmentId, status, contentEdit, projectIds, policyIds, startDate } = body;

    // 内容編集時は編集前を保持して差分を作る
    const beforeTask = contentEdit
      ? await prisma.decisionTask.findUnique({ where: { id: taskId }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } })
      : null;
    // タスク編集前スナップショット（承認待ち中の「実行タスク編集の取り消し」用＝このタスクだけ復元）
    const actor = req.cookies.get('workportal_auth')?.value ?? '';
    const taskSnap = contentEdit ? await snapshotTask(taskId) : null;

    // 完了日時：done になった時に記録、未完了に戻したら null。既に done のものは時刻を保持。
    let completedAtData: Record<string, unknown> = {};
    if (status !== undefined) {
      if (status === 'done') {
        const cur = await prisma.decisionTask.findUnique({ where: { id: taskId }, select: { completedAt: true } });
        completedAtData = { completedAt: cur?.completedAt ?? new Date() };
      } else {
        completedAtData = { completedAt: null };
      }
    }

    await prisma.decisionTask.update({
      where: { id: taskId },
      data: {
        ...completedAtData,
        ...(what !== undefined ? { what } : {}),
        ...(why !== undefined ? { why: why ?? null } : {}),
        ...(who !== undefined ? { who: who ?? null } : {}),
        ...(whereLoc !== undefined ? { whereLoc: whereLoc ?? null } : {}),
        ...(whenDue !== undefined ? { whenDue: whenDue ?? null } : {}),
        ...(how !== undefined ? { how: how ?? null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId ?? null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ?? null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(contentEdit ? { pendingEdit: true, prevState: taskSnap, editedBy: actor } : {}),
      },
    });

    if (contentEdit) {
      const taskName = (what as string) ?? beforeTask?.what ?? '';
      const tp = (f: string) => f;
      const changes: { field: string; before: string; after: string }[] = [];
      const add = (f: string, b: string, a: string) => { if ((b ?? '') !== (a ?? '')) changes.push({ field: tp(f), before: b ?? '', after: a ?? '' }); };
      if (beforeTask) {
        if (what !== undefined) add('内容', beforeTask.what, what);
        if (why !== undefined) add('なぜ', beforeTask.why ?? '', why ?? '');
        if (who !== undefined) add('担当', beforeTask.who ?? '', who ?? '');
        if (whereLoc !== undefined) add('どこで', beforeTask.whereLoc ?? '', whereLoc ?? '');
        if (startDate !== undefined) add('開始日', beforeTask.startDate ?? '', startDate ?? '');
        if (whenDue !== undefined) add('完了予定日', beforeTask.whenDue ?? '', whenDue ?? '');
        if (how !== undefined) add('どうやって', beforeTask.how ?? '', how ?? '');
        if (departmentId !== undefined && (departmentId || null) !== beforeTask.departmentId) {
          const depts = await prisma.department.findMany();
          const nm = (v: string | null) => (v ? (depts.find((d) => d.id === v)?.name ?? v) : '');
          changes.push({ field: tp('部門'), before: nm(beforeTask.departmentId), after: nm(departmentId || null) });
        }
      }
      // タグの貼り替え＋差分
      if (Array.isArray(projectIds) && beforeTask) {
        const beforeIds = beforeTask.projects.map((p) => p.projectId).sort();
        const afterIds = [...(projectIds as string[])].slice(0, 5).sort();
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
          const all = await prisma.project.findMany();
          changes.push({ field: tp('プロジェクト'), before: beforeTask.projects.map((p) => p.project.name).join('、'), after: (projectIds as string[]).map((i) => all.find((p) => p.id === i)?.name ?? i).join('、') });
        }
        await prisma.taskProject.deleteMany({ where: { taskId } });
        for (const pid of afterIds) await prisma.taskProject.create({ data: { taskId, projectId: pid } }).catch(() => null);
      }
      if (Array.isArray(policyIds) && beforeTask) {
        const beforeIds = beforeTask.policies.map((p) => p.policyId).sort();
        const afterIds = [...(policyIds as string[])].slice(0, 5).sort();
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
          const all = await prisma.policy.findMany();
          changes.push({ field: tp('方針'), before: beforeTask.policies.map((p) => p.policy.name).join('、'), after: (policyIds as string[]).map((i) => all.find((p) => p.id === i)?.name ?? i).join('、') });
        }
        await prisma.taskPolicy.deleteMany({ where: { taskId } });
        for (const pid of afterIds) await prisma.taskPolicy.create({ data: { taskId, policyId: pid } }).catch(() => null);
      }
      // 先頭に「対象実行タスク」を必ず明記（どのタスクの編集かを承認者が判別できるように）
      const taskHeader = { field: '対象実行タスク', before: '', after: taskName || '(名称未設定)' };
      const note = JSON.stringify([taskHeader, ...changes]);
      const auditDetail = `実行タスク「${taskName}」: ` + (changes.map((c) => `${c.field}「${c.before || '—'}」→「${c.after || '—'}」`).join(' / ') || '内容を編集');
      await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id } });
      await prisma.decision.update({ where: { id }, data: { status: 'pending', approvedBy: null, approvedAt: null, editNote: note } });
      const decision = await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE });
      if (decision) await writeAudit({ entityType: 'decision', entityId: id, title: decision.title, action: 'edit', actor, detail: auditDetail });
      return NextResponse.json({ decision });
    }

    // 進捗（ステータス）変更：完了状況に合わせて親ステータスを再計算（pending は対象外）
    const decision = await prisma.decision.findUnique({ where: { id }, include: { tasks: true } });
    if (decision && decision.status !== 'pending' && decision.tasks.length > 0) {
      const allDone = decision.tasks.every((t) => t.status === 'done');
      const nextStatus = allDone ? 'done' : 'approved';
      if (nextStatus !== decision.status) {
        await prisma.decision.update({ where: { id }, data: { status: nextStatus, completedAt: nextStatus === 'done' ? new Date() : null } });
      }
    }
    const task = await prisma.decisionTask.findUnique({ where: { id: taskId } });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const { taskId } = await params;
    await prisma.decisionTask.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'タスクの削除に失敗しました' }, { status: 500 });
  }
}
