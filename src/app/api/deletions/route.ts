import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, roleFlags, canApprove, isApproved, type EntityType, type ApprovalRow } from '@/lib/approval';
import { writeAudit, entityTitle } from '@/lib/audit';

function getUsername(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
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
  if (et === 'decision') await prisma.decision.delete({ where: { id } });
  else if (et === 'policy') await prisma.policy.delete({ where: { id } });
  else await prisma.project.delete({ where: { id } });
}

// 削除申請 / 削除承認 / 取消
export async function POST(req: NextRequest) {
  const member = await getMember(getUsername(req));
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const { entityType, entityId, cancel } = await req.json();
  if (!['policy', 'project', 'decision'].includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 });
  }
  const et = entityType as EntityType;
  const entity = await loadEntity(et, entityId);
  if (!entity) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });

  const ctx = {
    departmentId: (entity as { departmentId?: string | null }).departmentId ?? null,
    boardOnly: !!(entity as { boardOnly?: boolean }).boardOnly,
  };

  // 削除の承認は「承認できる人」と同じ
  if (!canApprove(member, et, ctx)) {
    return NextResponse.json({ error: '削除の承認権限がありません' }, { status: 403 });
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
