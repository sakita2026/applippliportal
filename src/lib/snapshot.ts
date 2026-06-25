import { prisma } from '@/lib/prisma';

// 「編集の取り消し」用に、編集直前の状態を JSON 化して prevState に保存・復元する。
// 承認待ち（pending）の間のみ取り消し可能。承認完了後は prevState をクリアして取り消し不可にする。

// ── 決定事項（タスク・タグ込み） ───────────────────────────────
export async function snapshotDecision(id: string): Promise<string | null> {
  const d = await prisma.decision.findUnique({
    where: { id },
    include: { tasks: { include: { projects: true, policies: true } }, projects: true, policies: true },
  });
  if (!d) return null;
  const snap = {
    title: d.title, description: d.description, departmentId: d.departmentId, boardOnly: d.boardOnly,
    startDate: d.startDate, dueDate: d.dueDate, status: d.status, approvedBy: d.approvedBy,
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null, everApproved: d.everApproved,
    projectIds: d.projects.map((p) => p.projectId), policyIds: d.policies.map((p) => p.policyId),
    tasks: d.tasks.map((t) => ({
      id: t.id, what: t.what, why: t.why, who: t.who, whereLoc: t.whereLoc, whenDue: t.whenDue, how: t.how,
      departmentId: t.departmentId, startDate: t.startDate, status: t.status, sortOrder: t.sortOrder, pendingEdit: t.pendingEdit,
      projectIds: t.projects.map((x) => x.projectId), policyIds: t.policies.map((x) => x.policyId),
    })),
  };
  return JSON.stringify(snap);
}

export async function restoreDecision(id: string): Promise<boolean> {
  const d = await prisma.decision.findUnique({ where: { id } });
  if (!d || !d.prevState) return false;
  const s = JSON.parse(d.prevState);
  await prisma.decision.update({
    where: { id },
    data: {
      title: s.title, description: s.description, departmentId: s.departmentId, boardOnly: s.boardOnly,
      startDate: s.startDate, dueDate: s.dueDate, status: s.status, approvedBy: s.approvedBy,
      approvedAt: s.approvedAt ? new Date(s.approvedAt) : null, everApproved: s.everApproved,
      editNote: null, prevState: null,
    },
  });
  await prisma.decisionProject.deleteMany({ where: { decisionId: id } });
  for (const pid of s.projectIds ?? []) await prisma.decisionProject.create({ data: { decisionId: id, projectId: pid } }).catch(() => null);
  await prisma.decisionPolicy.deleteMany({ where: { decisionId: id } });
  for (const pid of s.policyIds ?? []) await prisma.decisionPolicy.create({ data: { decisionId: id, policyId: pid } }).catch(() => null);
  for (const t of s.tasks ?? []) {
    await prisma.decisionTask.update({
      where: { id: t.id },
      data: {
        what: t.what, why: t.why, who: t.who, whereLoc: t.whereLoc, whenDue: t.whenDue, how: t.how,
        departmentId: t.departmentId, startDate: t.startDate, status: t.status, sortOrder: t.sortOrder, pendingEdit: t.pendingEdit,
      },
    }).catch(() => null);
    await prisma.taskProject.deleteMany({ where: { taskId: t.id } });
    for (const pid of t.projectIds ?? []) await prisma.taskProject.create({ data: { taskId: t.id, projectId: pid } }).catch(() => null);
    await prisma.taskPolicy.deleteMany({ where: { taskId: t.id } });
    for (const pid of t.policyIds ?? []) await prisma.taskPolicy.create({ data: { taskId: t.id, policyId: pid } }).catch(() => null);
  }
  // 誤編集後に付いた承認はクリア（status を元に戻すので承認済み表示に戻る）
  await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id, action: 'approve' } });
  return true;
}

// ── 実行タスク単位の編集取り消し ───────────────────────────────
export async function snapshotTask(taskId: string): Promise<string | null> {
  const t = await prisma.decisionTask.findUnique({ where: { id: taskId }, include: { projects: true, policies: true } });
  if (!t) return null;
  return JSON.stringify({
    what: t.what, why: t.why, who: t.who, whereLoc: t.whereLoc, whenDue: t.whenDue, how: t.how,
    departmentId: t.departmentId, startDate: t.startDate, status: t.status,
    projectIds: t.projects.map((x) => x.projectId), policyIds: t.policies.map((x) => x.policyId),
  });
}

// タスクを編集前に復元し、決定事項のステータスを再計算して返す。
export async function restoreTask(taskId: string): Promise<string | null> {
  const t = await prisma.decisionTask.findUnique({ where: { id: taskId } });
  if (!t || !t.prevState) return null;
  const s = JSON.parse(t.prevState);
  await prisma.decisionTask.update({
    where: { id: taskId },
    data: {
      what: s.what, why: s.why, who: s.who, whereLoc: s.whereLoc, whenDue: s.whenDue, how: s.how,
      departmentId: s.departmentId, startDate: s.startDate, status: s.status,
      pendingEdit: false, prevState: null, editedBy: null,
    },
  });
  await prisma.taskProject.deleteMany({ where: { taskId } });
  for (const pid of s.projectIds ?? []) await prisma.taskProject.create({ data: { taskId, projectId: pid } }).catch(() => null);
  await prisma.taskPolicy.deleteMany({ where: { taskId } });
  for (const pid of s.policyIds ?? []) await prisma.taskPolicy.create({ data: { taskId, policyId: pid } }).catch(() => null);

  // 決定事項のステータス再計算：他に保留中の編集（タスクの再承認待ち or 決定事項自体の編集）が無ければ承認済みに戻す
  const decisionId = t.decisionId;
  const dec = await prisma.decision.findUnique({ where: { id: decisionId }, include: { tasks: true } });
  if (dec) {
    const stillPendingEdit = dec.tasks.some((x) => x.pendingEdit);
    if (!stillPendingEdit && !dec.prevState && dec.everApproved) {
      const allDone = dec.tasks.length > 0 && dec.tasks.every((x) => x.status === 'done');
      await prisma.decision.update({ where: { id: decisionId }, data: { status: allDone ? 'done' : 'approved', editNote: null } });
    }
  }
  return decisionId;
}

// ── 方針 / プロジェクト（スカラーのみ） ───────────────────────────
export async function snapshotPolicy(id: string): Promise<string | null> {
  const p = await prisma.policy.findUnique({ where: { id } });
  if (!p) return null;
  return JSON.stringify({ name: p.name, description: p.description, status: p.status });
}
export async function restorePolicy(id: string): Promise<boolean> {
  const p = await prisma.policy.findUnique({ where: { id } });
  if (!p || !p.prevState) return false;
  const s = JSON.parse(p.prevState);
  await prisma.policy.update({ where: { id }, data: { name: s.name, description: s.description, status: s.status, editNote: null, prevState: null } });
  await prisma.approval.deleteMany({ where: { entityType: 'policy', entityId: id, action: 'approve' } });
  return true;
}

export async function snapshotProject(id: string): Promise<string | null> {
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) return null;
  return JSON.stringify({ name: p.name, description: p.description, status: p.status, policyId: p.policyId });
}
export async function restoreProject(id: string): Promise<boolean> {
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p || !p.prevState) return false;
  const s = JSON.parse(p.prevState);
  await prisma.project.update({ where: { id }, data: { name: s.name, description: s.description, status: s.status, policyId: s.policyId, editNote: null, prevState: null } });
  await prisma.approval.deleteMany({ where: { entityType: 'project', entityId: id, action: 'approve' } });
  return true;
}
