import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, roleFlags, canApprove, canManageProject, isApproved, isAuditor, type EntityType, type ApprovalRow } from '@/lib/approval';
import { canManageDecision, canManageDecisionTask } from '@/lib/visibility';
import { writeAudit, entityTitle } from '@/lib/audit';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

async function loadEntity(et: EntityType, id: string) {
  if (et === 'decision') return prisma.decision.findUnique({ where: { id } });
  if (et === 'policy') return prisma.policy.findUnique({ where: { id } });
  return prisma.project.findUnique({ where: { id } });
}

async function setDeleteRequested(et: EntityType, id: string, v: boolean) {
  if (et === 'decision') return prisma.decision.update({ where: { id }, data: { deleteRequested: v } });
  if (et === 'policy') return prisma.policy.update({ where: { id }, data: { deleteRequested: v } });
  return prisma.project.update({ where: { id }, data: { deleteRequested: v } });
}

async function actuallyDelete(et: EntityType, id: string) {
  await prisma.approval.deleteMany({ where: { entityType: et, entityId: id } });
  if (et === 'policy') await prisma.policy.delete({ where: { id } });
  else await prisma.project.delete({ where: { id } });
}

/**
 * 決定事項の「中止」「中止解除（元に戻す）」の双方向2名承認フロー。
 * - 物理削除はしない。`archived` フラグの ON/OFF のみ（タスクはコピー・移動せず＝完了タスクが2重化しない）。
 * - 確定要件は編集承認と同じ＝担当部長＋取締役1名（全社通達・取締役会限定は取締役2名）。
 * - 申請できる人：中止＝起案者・担当者・担当部長・取締役／中止解除＝担当者・担当部長・取締役（起案者は不可）。
 */
async function handleDecisionCancel(member: NonNullable<Awaited<ReturnType<typeof getMember>>>, id: string, cancel: boolean) {
  const dec = await prisma.decision.findUnique({ where: { id }, include: { tasks: true } });
  if (!dec) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  const ctx = { departmentId: dec.departmentId, boardOnly: dec.boardOnly };
  const assigneeDept = dec.assigneeUsername ? (await getMember(dec.assigneeUsername))?.departmentId ?? null : null;
  const isRestore = dec.archived; // archived 済み＝中止解除フロー／未 archived＝中止フロー
  const deptForMgr = dec.departmentId && dec.departmentId !== 'all' ? dec.departmentId : assigneeDept;
  const isDir = !!member.isDirector || !!member.isRepresentative;
  const isDeptMgr = member.position === 'manager' && !!member.departmentId && deptForMgr === member.departmentId;

  // 申請権限
  const allowed = isRestore
    ? (isDir || (!!dec.assigneeUsername && dec.assigneeUsername === member.username) || isDeptMgr) // 中止解除：担当者・担当部長・取締役
    : canManageDecision(dec, member, assigneeDept); // 中止：起案者・担当者・担当部長・取締役
  if (!allowed) return NextResponse.json({ error: isRestore ? '中止解除の権限がありません' : '中止の権限がありません' }, { status: 403 });

  // 申請の取り下げ
  if (cancel) {
    await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id, action: 'delete' } });
    await prisma.decision.update({ where: { id }, data: { deleteRequested: false } });
    return NextResponse.json({ deleteRequested: false });
  }

  // 申請ON＋本人の承認を記録
  await prisma.decision.update({ where: { id }, data: { deleteRequested: true } });
  const flags = roleFlags(member, 'decision', ctx);
  const existing = await prisma.approval.findFirst({ where: { entityType: 'decision', entityId: id, action: 'delete', approver: member.username } });
  if (!existing) {
    await prisma.approval.create({ data: { entityType: 'decision', entityId: id, action: 'delete', approver: member.username, asDirector: flags.asDirector, asManager: flags.asManager } });
    await writeAudit({ entityType: 'decision', entityId: id, title: dec.title, action: 'delete_approve', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: isRestore ? '中止解除を承認' : '中止を承認' });
  }

  const rows = (await prisma.approval.findMany({ where: { entityType: 'decision', entityId: id, action: 'delete' } })) as ApprovalRow[];
  if (isApproved('decision', rows, ctx)) {
    await prisma.approval.deleteMany({ where: { entityType: 'decision', entityId: id, action: 'delete' } });
    if (isRestore) {
      // 中止解除：archived を外しステータスを再計算（タスクはそのまま＝2重化なし・紐づけ維持）
      const allDone = dec.tasks.length > 0 && dec.tasks.every((t) => t.status === 'done');
      const nextStatus = dec.tasks.length > 0 ? (allDone ? 'done' : 'approved') : dec.status;
      await prisma.decision.update({ where: { id }, data: { archived: false, deleteRequested: false, status: nextStatus, completedAt: allDone ? (dec.completedAt ?? new Date()) : (dec.tasks.length > 0 ? null : dec.completedAt) } });
      await writeAudit({ entityType: 'decision', entityId: id, title: dec.title, action: 'edit', actor: member.username, detail: '中止を解除（元に戻す）' });
      return NextResponse.json({ restored: true });
    }
    // 中止確定：archived ON（完了タスクは完了のまま保持）
    await prisma.decision.update({ where: { id }, data: { archived: true, deleteRequested: false } });
    await writeAudit({ entityType: 'decision', entityId: id, title: dec.title, action: 'deleted', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: '中止承認が揃い中止しました' });
    return NextResponse.json({ cancelled: true });
  }
  return NextResponse.json({ deleteRequested: true, deleteApprovals: rows.length });
}

/** 親決定のステータスを再計算（中止タスクは集計から除外＝残りが全完了なら done）。pending/タスク0件は対象外。 */
async function recomputeDecisionStatus(decisionId: string) {
  const dec = await prisma.decision.findUnique({ where: { id: decisionId }, select: { status: true, completedAt: true, tasks: { select: { status: true, archived: true } } } });
  if (!dec || dec.status === 'pending') return;
  const active = dec.tasks.filter((t) => !t.archived);
  if (active.length === 0) return; // タスク0件＝手動完了管理に委ねる
  const allDone = active.every((t) => t.status === 'done');
  const next = allDone ? 'done' : 'approved';
  if (next !== dec.status) {
    await prisma.decision.update({ where: { id: decisionId }, data: { status: next, completedAt: next === 'done' ? (dec.completedAt ?? new Date()) : null } });
  }
}

/**
 * 実行タスクの「中止」「中止解除」の双方向2名承認フロー（決定事項の中止と同じルール）。
 * - 物理削除しない。`DecisionTask.archived` の ON/OFF のみ。
 * - 承認要件＝担当部長＋取締役1名（全社通達・取締役会限定は取締役2名）。役職構成は決定事項と同一なので 'decision' の判定を流用。
 * - 申請：中止＝起案者・担当者・担当部長・取締役／中止解除＝担当者・担当部長・取締役（起案者は不可）。
 * - 承認データは entityType='decisionTask'・entityId=taskId・action='delete' に保存。
 */
async function handleTaskCancel(member: NonNullable<Awaited<ReturnType<typeof getMember>>>, taskId: string, cancel: boolean) {
  const task = await prisma.decisionTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  const dec = await prisma.decision.findUnique({ where: { id: task.decisionId }, select: { departmentId: true, boardOnly: true, title: true } });
  // 承認の部門コンテキスト：タスク部門を優先、無ければ決定事項の部門
  const deptCtx = task.departmentId ?? dec?.departmentId ?? null;
  const ctx = { departmentId: deptCtx, boardOnly: !!dec?.boardOnly };
  const isRestore = task.archived; // archived 済み＝中止解除フロー／未 archived＝中止フロー
  const isDir = !!member.isDirector || !!member.isRepresentative;
  const deptForMgr = deptCtx && deptCtx !== 'all' ? deptCtx : null;
  const isDeptMgr = member.position === 'manager' && !!member.departmentId && deptForMgr === member.departmentId;

  // 申請権限
  const allowed = isRestore
    ? (isDir || (!!task.who && task.who === member.username) || isDeptMgr) // 中止解除：担当者・担当部長・取締役
    : canManageDecisionTask(task, member, dec?.departmentId ?? null, { includeCreator: true }); // 中止：起案者・担当者・担当部長・取締役
  if (!allowed) return NextResponse.json({ error: isRestore ? '中止解除の権限がありません' : '中止の権限がありません' }, { status: 403 });

  // 申請の取り下げ
  if (cancel) {
    await prisma.approval.deleteMany({ where: { entityType: 'decisionTask', entityId: taskId, action: 'delete' } });
    await prisma.decisionTask.update({ where: { id: taskId }, data: { deleteRequested: false } });
    return NextResponse.json({ deleteRequested: false });
  }

  // 申請ON＋本人の承認を記録（役職構成は決定事項と同じ＝'decision' で判定）
  await prisma.decisionTask.update({ where: { id: taskId }, data: { deleteRequested: true } });
  const flags = roleFlags(member, 'decision', ctx);
  const existing = await prisma.approval.findFirst({ where: { entityType: 'decisionTask', entityId: taskId, action: 'delete', approver: member.username } });
  if (!existing) {
    await prisma.approval.create({ data: { entityType: 'decisionTask', entityId: taskId, action: 'delete', approver: member.username, asDirector: flags.asDirector, asManager: flags.asManager } });
    await writeAudit({ entityType: 'decision', entityId: task.decisionId, title: dec?.title ?? '', action: 'delete_approve', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: `実行タスク「${task.what}」の${isRestore ? '中止解除' : '中止'}を承認` });
  }

  const rows = (await prisma.approval.findMany({ where: { entityType: 'decisionTask', entityId: taskId, action: 'delete' } })) as ApprovalRow[];
  if (isApproved('decision', rows, ctx)) {
    await prisma.approval.deleteMany({ where: { entityType: 'decisionTask', entityId: taskId, action: 'delete' } });
    await prisma.decisionTask.update({ where: { id: taskId }, data: { archived: !isRestore, deleteRequested: false } });
    await recomputeDecisionStatus(task.decisionId);
    await writeAudit({ entityType: 'decision', entityId: task.decisionId, title: dec?.title ?? '', action: isRestore ? 'edit' : 'deleted', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: isRestore ? `実行タスク「${task.what}」の中止を解除（元に戻す）` : `実行タスク「${task.what}」を中止しました` });
    return NextResponse.json(isRestore ? { restored: true } : { cancelled: true });
  }
  return NextResponse.json({ deleteRequested: true, deleteApprovals: rows.length });
}

// 中止/中止解除（決定事項・実行タスク）・削除申請/承認/取消（方針・プロジェクト）
export async function POST(req: NextRequest) {
  const member = await getMember(getUsername(req));
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  // 監査役は中止・中止解除・削除のいずれもできない（閲覧は取締役同等）
  if (isAuditor(member)) return NextResponse.json({ error: '監査役は中止・削除の操作はできません' }, { status: 403 });

  const { entityType, entityId, cancel } = await req.json();
  if (!['policy', 'project', 'decision', 'decisionTask'].includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 });
  }
  // 実行タスクは「中止/中止解除」フロー（物理削除しない）
  if (entityType === 'decisionTask') return handleTaskCancel(member, entityId, !!cancel);
  const et = entityType as EntityType;
  // 決定事項は「中止/中止解除」フロー（物理削除しない）
  if (et === 'decision') return handleDecisionCancel(member, entityId, !!cancel);

  const entity = await loadEntity(et, entityId);
  if (!entity) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });

  const ctx = {
    departmentId: (entity as { departmentId?: string | null }).departmentId ?? null,
    boardOnly: !!(entity as { boardOnly?: boolean }).boardOnly,
  };

  // 削除申請/取消できる人：
  //  - プロジェクト＝担当部長＋取締役
  //  - 決定事項＝入力者(起案者)＋担当者＋担当部長＋取締役
  //  - 方針＝承認できる人（取締役）
  // ※実削除は isApproved（決定=担当部長＋取締役/全社通達は取締役2名、方針PJ=取締役2名）を満たした時のみ。
  //   起案者・担当者の記録は承認人数に数えない（roleFlagsでasDirector/asManager=falseのため）。
  // ここに来るのは policy / project のみ（decision は handleDecisionCancel で早期return済み）
  const allowed = et === 'project' ? canManageProject(ctx.departmentId, member) : canApprove(member, et, ctx);
  if (!allowed) {
    return NextResponse.json({ error: '削除の権限がありません' }, { status: 403 });
  }

  // 取消
  if (cancel) {
    await prisma.approval.deleteMany({ where: { entityType: et, entityId, action: 'delete' } });
    await setDeleteRequested(et, entityId, false);
    return NextResponse.json({ deleted: false, deleteRequested: false });
  }

  const title = entityTitle(et, entity);
  // 申請（フラグON）＋ 本人の削除承認を記録
  await setDeleteRequested(et, entityId, true);
  const flags = roleFlags(member, et, ctx);
  const existing = await prisma.approval.findFirst({ where: { entityType: et, entityId, action: 'delete', approver: member.username } });
  if (!existing) {
    await prisma.approval.create({ data: { entityType: et, entityId, action: 'delete', approver: member.username, asDirector: flags.asDirector, asManager: flags.asManager } });
    await writeAudit({ entityType: et, entityId, title, action: 'delete_approve', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager });
  }

  // 必要人数を満たしたら実削除
  const rows = (await prisma.approval.findMany({ where: { entityType: et, entityId, action: 'delete' } })) as ApprovalRow[];
  if (isApproved(et, rows, ctx)) {
    await writeAudit({ entityType: et, entityId, title, action: 'deleted', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: '削除承認が揃い削除されました' });
    await actuallyDelete(et, entityId);
    return NextResponse.json({ deleted: true });
  }
  return NextResponse.json({ deleted: false, deleteRequested: true, deleteApprovals: rows.length });
}
