import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { canManageDecision } from '@/lib/visibility';
import { writeAudit } from '@/lib/audit';
import { snapshotDecision } from '@/lib/snapshot';
import { fetchDirectory } from '@/lib/directory';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 編集すると承認はリセットされ、再承認が必要になる
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!username) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { title, description, departmentId, assigneeUsername, boardOnly, segment, projectIds, policyIds, editReason, startDate, dueDate, newTasks } = body;

    // 編集前スナップショット（承認待ち中の「編集の取り消し」用）
    const prevSnap = await snapshotDecision(id);
    // 変更内容（編集前→編集後）を作成（承認者向け）
    const before = await prisma.decision.findUnique({ where: { id }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } });
    // 編集は 入力者(起案者)＋担当者＋担当部長＋取締役 のみ（全社通達の担当部長＝担当者の部署の部長）
    const actor = await getMember(username);
    const assigneeDept = before?.assigneeUsername ? (await getMember(before.assigneeUsername))?.departmentId ?? null : null;
    if (!before || !canManageDecision(before, actor, assigneeDept)) {
      return NextResponse.json({ error: '編集は入力者・担当者・担当部長・取締役のみ可能です' }, { status: 403 });
    }
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
      if (segment !== undefined && (segment || null) !== before.segment) {
        const segs = await prisma.segmentOption.findMany();
        const nm = (v: string | null) => (v ? (segs.find((s) => s.code === v)?.label ?? v) : '（空白）');
        changes.push({ field: '実行管理集計区分', before: nm(before.segment), after: nm(segment || null) });
      }
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
    // 既に承認待ち（pending）中で、実行タスク編集の差分（taskId 付き）が記録されていれば保持し、
    // 決定本体の変更（taskId 無し）と統合する。承認済み/完了からの編集は新サイクルとして作り直す。
    type Ch = { field: string; before: string; after: string; taskId?: string };
    let existingTaskDiffs: Ch[] = [];
    if (before?.status === 'pending' && before.editNote) {
      try { const p = JSON.parse(before.editNote); if (Array.isArray(p)) existingTaskDiffs = (p as Ch[]).filter((c) => c.taskId); } catch { existingTaskDiffs = []; }
    }
    const merged = [...changes, ...existingTaskDiffs];
    const note = merged.length ? JSON.stringify(merged) : null;
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
        ...(segment !== undefined ? { segment: segment ?? null } : {}),
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
            category: (t.category as string) ?? null,
            startDate: (t.startDate as string) ?? null, status: 'todo', sortOrder: order++, pendingEdit: true,
            createdBy: username ?? null, // 編集で追加されたタスク＝追加した人を作成者に
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
    const { id } = await params;
    // 削除は 入力者(起案者)＋担当者＋担当部長＋取締役 のみ（全社通達の担当部長＝担当者の部署の部長）
    const actor = await getMember(username);
    if (actor?.isAuditor) return NextResponse.json({ error: '監査役は削除できません' }, { status: 403 });
    const dec = await prisma.decision.findUnique({ where: { id }, select: { createdBy: true, assigneeUsername: true, departmentId: true } });
    const assigneeDept = dec?.assigneeUsername ? (await getMember(dec.assigneeUsername))?.departmentId ?? null : null;
    if (!dec || !canManageDecision(dec, actor, assigneeDept)) {
      return NextResponse.json({ error: '削除は入力者・担当者・担当部長・取締役のみ可能です' }, { status: 403 });
    }
    await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id } });
    await prisma.decision.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '決定事項の削除に失敗しました' }, { status: 500 });
  }
}
