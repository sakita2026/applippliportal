import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';
import { writeAudit } from '@/lib/audit';
import { snapshotDecision } from '@/lib/snapshot';
import { fetchDirectory } from '@/lib/directory';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
}

// 編集すると承認はリセットされ、再承認が必要になる
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!username) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { title, description, departmentId, assigneeUsername, boardOnly, projectIds, policyIds, editReason, startDate, dueDate, newTasks } = body;

    // 編集前スナップショット（承認待ち中の「編集の取り消し」用）
    const prevSnap = await snapshotDecision(id);
    // 変更内容（編集前→編集後）を作成（承認者向け）
    const before = await prisma.decision.findUnique({ where: { id }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } });
    const changes: { field: string; before: string; after: string }[] = [];
    if (before) {
      if (title !== undefined && title !== before.title) changes.push({ field: '件名', before: before.title, after: title });
      if (description !== undefined && (description ?? null) !== before.description) changes.push({ field: '説明', before: before.description ?? '', after: description ?? '' });
      if (departmentId !== undefined && (departmentId || null) !== before.departmentId) {
        const depts = await prisma.department.findMany();
        const nm = (v: string | null) => (v === 'all' ? '全員（全社通達）' : v ? (depts.find((d) => d.id === v)?.name ?? v) : '（未設定）');
        changes.push({ field: '部門', before: nm(before.departmentId), after: nm(departmentId || null) });
      }
      if (assigneeUsername !== undefined && (assigneeUsername || null) !== before.assigneeUsername) {
        const { members } = await fetchDirectory().catch(() => ({ members: [] as { username: string; name: string }[] }));
        const nm = (v: string | null) => (v ? (members.find((m) => m.username === v)?.name ?? v) : '（未設定）');
        changes.push({ field: '担当者', before: nm(before.assigneeUsername), after: nm(assigneeUsername || null) });
      }
      if (boardOnly !== undefined && !!boardOnly !== before.boardOnly) changes.push({ field: '取締役会限定', before: before.boardOnly ? 'はい' : 'いいえ', after: boardOnly ? 'はい' : 'いいえ' });
      if (startDate !== undefined && (startDate ?? null) !== before.startDate) changes.push({ field: '開始日', before: before.startDate ?? '', after: startDate ?? '' });
      if (dueDate !== undefined && (dueDate ?? null) !== before.dueDate) changes.push({ field: '完了予定日', before: before.dueDate ?? '', after: dueDate ?? '' });
      if (Array.isArray(projectIds)) {
        const beforeIds = before.projects.map((p) => p.projectId).sort();
        const afterIds = [...(projectIds as string[])].sort();
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
          const all = await prisma.project.findMany();
          const beforeNames = before.projects.map((p) => p.project.name).join('、');
          const afterNames = (projectIds as string[]).map((i) => all.find((p) => p.id === i)?.name ?? i).join('、');
          changes.push({ field: 'プロジェクト', before: beforeNames, after: afterNames });
        }
      }
      if (Array.isArray(policyIds)) {
        const beforeIds = before.policies.map((p) => p.policyId).sort();
        const afterIds = [...(policyIds as string[])].sort();
        if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
          const all = await prisma.policy.findMany();
          const beforeNames = before.policies.map((p) => p.policy.name).join('、');
          const afterNames = (policyIds as string[]).map((i) => all.find((p) => p.id === i)?.name ?? i).join('、');
          changes.push({ field: '方針', before: beforeNames, after: afterNames });
        }
      }
    }
    // 編集時に追加された実行タスク（追加分は再承認後に稼働＝pendingEdit）。差分にも明示。
    const taskList: Array<Record<string, unknown>> = Array.isArray(newTasks) ? newTasks.filter((t) => t && typeof t.what === 'string' && (t.what as string).trim() !== '') : [];
    for (const t of taskList) changes.push({ field: '追加した実行タスク', before: '', after: String(t.what).trim() });
    if (editReason) changes.push({ field: '理由', before: '', after: editReason });
    const note = changes.length ? JSON.stringify(changes) : null;
    const auditDetail = changes.map((c) => `${c.field}: 「${c.before || '—'}」→「${c.after || '—'}」`).join(' / ');

    await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id } });
    // プロジェクトタグの貼り替え（指定があるとき）
    if (Array.isArray(projectIds)) {
      await prisma.decisionProject.deleteMany({ where: { decisionId: id } });
      const ids = (projectIds as string[]).slice(0, 5);
      for (const pid of ids) {
        await prisma.decisionProject.create({ data: { decisionId: id, projectId: pid } }).catch(() => null);
      }
    }
    if (Array.isArray(policyIds)) {
      await prisma.decisionPolicy.deleteMany({ where: { decisionId: id } });
      const ids = (policyIds as string[]).slice(0, 5);
      for (const pid of ids) {
        await prisma.decisionPolicy.create({ data: { decisionId: id, policyId: pid } }).catch(() => null);
      }
    }
    const decision = await prisma.decision.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId ?? null } : {}),
        ...(assigneeUsername !== undefined ? { assigneeUsername: assigneeUsername ?? null } : {}),
        ...(boardOnly !== undefined ? { boardOnly: !!boardOnly } : {}),
        ...(startDate !== undefined ? { startDate: startDate ?? null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ?? null } : {}),
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        editNote: note,
        prevState: prevSnap,
        editedBy: username,
      },
      include: DECISION_INCLUDE,
    });
    // 追加タスクを作成（再承認後に稼働＝pendingEdit。編集者を記録）
    if (taskList.length > 0) {
      let order = decision.tasks.length;
      for (const t of taskList) {
        await prisma.decisionTask.create({
          data: {
            decisionId: id, what: String(t.what).trim(),
            why: (t.why as string) ?? null, who: (t.who as string) ?? null, whereLoc: (t.whereLoc as string) ?? null,
            whenDue: (t.whenDue as string) ?? null, how: (t.how as string) ?? null, departmentId: (t.departmentId as string) ?? null,
            startDate: (t.startDate as string) ?? null, status: 'todo', sortOrder: order++, pendingEdit: true,
          },
        }).catch(() => null);
      }
    }
    await writeAudit({ entityType: 'decision', entityId: id, title: decision.title, action: 'edit', actor: username, detail: auditDetail });
    const finalDecision = taskList.length > 0 ? await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE }) : decision;
    return NextResponse.json(finalDecision);
  } catch {
    return NextResponse.json({ error: '決定事項の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '削除は管理者のみ可能です' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id } });
    await prisma.decision.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '決定事項の削除に失敗しました' }, { status: 500 });
  }
}
