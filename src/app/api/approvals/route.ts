import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, roleFlags, canApprove, isApproved, type EntityType, type ApprovalRow } from '@/lib/approval';
import { fetchDirectory } from '@/lib/directory';
import { writeAudit, entityTitle } from '@/lib/audit';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

const UNDO_WINDOW_MS = 30 * 60 * 1000; // 承認の取り消しは30分以内

// 承認者リスト（承認時刻付き）。クライアントが「あと何名」「30分以内の取り消し可否」を判定するのに使う。
async function approvalPayload(entityType: EntityType, entityId: string) {
  const rows = await prisma.approval.findMany({
    where: { entityType, entityId, action: 'approve' },
    select: { approver: true, asDirector: true, asManager: true, createdAt: true },
  });
  return rows.map((r) => ({ approver: r.approver, asDirector: r.asDirector, asManager: r.asManager, createdAt: r.createdAt.toISOString() }));
}

async function loadEntity(entityType: EntityType, id: string) {
  if (entityType === 'decision') return prisma.decision.findUnique({ where: { id } });
  if (entityType === 'policy') return prisma.policy.findUnique({ where: { id } });
  return prisma.project.findUnique({ where: { id } });
}

// 承認履歴の取得。entityId 指定時は対象1件の生データ、未指定時は名称解決した一覧（責任明確化）。
export async function GET(req: NextRequest) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const entityType = req.nextUrl.searchParams.get('entityType');
  const entityId = req.nextUrl.searchParams.get('entityId');

  if (entityType && entityId) {
    const rows = await prisma.approval.findMany({ where: { entityType, entityId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(rows);
  }

  // 一覧（名称・承認者名を解決）
  const rows = await prisma.approval.findMany({
    where: entityType ? { entityType } : {},
    orderBy: { createdAt: 'desc' },
  });
  const [decs, pols, projs, dir] = await Promise.all([
    prisma.decision.findMany({ select: { id: true, title: true } }),
    prisma.policy.findMany({ select: { id: true, name: true } }),
    prisma.project.findMany({ select: { id: true, name: true } }),
    fetchDirectory().catch(() => ({ members: [] as { username: string; name: string }[] })),
  ]);
  const titleMap = new Map<string, string>();
  decs.forEach((d) => titleMap.set(`decision:${d.id}`, d.title));
  pols.forEach((p) => titleMap.set(`policy:${p.id}`, p.name));
  projs.forEach((p) => titleMap.set(`project:${p.id}`, p.name));
  const nameOf = (u: string) => dir.members.find((m) => m.username === u)?.name ?? u;

  const enriched = rows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    title: titleMap.get(`${r.entityType}:${r.entityId}`) ?? '(削除済み)',
    approver: r.approver,
    approverName: nameOf(r.approver),
    asDirector: r.asDirector,
    asManager: r.asManager,
    createdAt: r.createdAt,
  }));
  return NextResponse.json(enriched);
}

// 承認する
export async function POST(req: NextRequest) {
  const username = getUsername(req);
  const member = await getMember(username);
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const { entityType, entityId } = await req.json();
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
  if (!canApprove(member, et, ctx)) {
    return NextResponse.json({ error: 'この対象を承認する権限がありません' }, { status: 403 });
  }

  const flags = roleFlags(member, et, ctx);

  // 承認した「申請種別」「変更内容」「申請者（部署）」「申請日時」を構造化(JSON)で監査ログに残す
  const e = entity as { editNote?: string | null; editedBy?: string | null; createdBy?: string; updatedAt?: Date; everApproved?: boolean };
  const reqKind = e.editNote ? '編集申請' : '新規申請';
  let changeSummary = '新規登録（タスク・内容一式）';
  if (e.editNote) {
    try {
      const arr = JSON.parse(e.editNote);
      if (Array.isArray(arr) && arr.length) changeSummary = arr.map((c: { field: string; before: string; after: string }) => `${c.field}「${c.before || '—'}」→「${c.after || '—'}」`).join(' / ');
    } catch { changeSummary = String(e.editNote); }
  }
  const submitter = e.editedBy ?? e.createdBy ?? null;
  let submitterName = submitter ?? '';
  let submitterDept = '';
  if (submitter) {
    const dir = await fetchDirectory().catch(() => ({ members: [] as Array<{ username: string; name: string; departmentId: string | null }>, departments: [] as Array<{ id: string; name: string }> }));
    const sm = dir.members.find((m) => m.username === submitter);
    submitterName = sm?.name ?? submitter;
    submitterDept = sm?.departmentId ? (dir.departments.find((d) => d.id === sm.departmentId)?.name ?? sm.departmentId) : '部署未設定';
  }
  const submittedAt = e.updatedAt ? new Date(e.updatedAt).toLocaleString('ja-JP') : '';
  const approveDetail = JSON.stringify({ kind: reqKind, changes: changeSummary, submitterName, submitterDept, submittedAt });

  // 同一人物の重複承認は1件に保つ（登録/編集の承認 = action: approve）
  const existing = await prisma.approval.findFirst({ where: { entityType: et, entityId, action: 'approve', approver: member.username } });
  if (!existing) {
    await prisma.approval.create({
      data: { entityType: et, entityId, action: 'approve', approver: member.username, asDirector: flags.asDirector, asManager: flags.asManager },
    });
    await writeAudit({ entityType: et, entityId, title: entityTitle(et, entity), action: 'approve', actor: member.username, asDirector: flags.asDirector, asManager: flags.asManager, detail: approveDetail });
  }

  const rows = (await prisma.approval.findMany({ where: { entityType: et, entityId, action: 'approve' } })) as ApprovalRow[];
  const approved = isApproved(et, rows, ctx);

  if (et === 'decision') {
    if (approved && entity.status === 'pending') {
      // 承認完了＝以後は編集の取り消し不可（prevState クリア）
      await prisma.decision.update({ where: { id: entityId }, data: { status: 'approved', approvedBy: member.username, approvedAt: new Date(), everApproved: true, prevState: null } });
      // 再承認待ちだったタスクを稼働再開（このタスクのみ非表示が解除される）
      await prisma.decisionTask.updateMany({ where: { decisionId: entityId, pendingEdit: true }, data: { pendingEdit: false, prevState: null, editedBy: null } });
    }
    const updated = await prisma.decision.findUnique({ where: { id: entityId }, include: DECISION_INCLUDE });
    const approvals = await approvalPayload(et, entityId);
    return NextResponse.json({ ...updated, approvals, hasPrevState: !!updated?.prevState });
  }
  if (approved && entity.status === 'pending') {
    if (et === 'policy') await prisma.policy.update({ where: { id: entityId }, data: { status: 'approved', prevState: null } });
    else await prisma.project.update({ where: { id: entityId }, data: { status: 'approved', prevState: null } });
  }
  const updated = await loadEntity(et, entityId);
  return NextResponse.json(updated);
}

// 承認の取り消し（自分の承認のみ・まだ承認待ち・承認から30分以内）
export async function DELETE(req: NextRequest) {
  const username = getUsername(req);
  const member = await getMember(username);
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const { entityType, entityId } = await req.json();
  if (!['policy', 'project', 'decision'].includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 });
  }
  const et = entityType as EntityType;
  const entity = await loadEntity(et, entityId);
  if (!entity) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });

  // 2名以上の承認で完了したもの（approved）は取り消し不可
  if (entity.status !== 'pending') {
    return NextResponse.json({ error: '承認が完了しているため取り消せません' }, { status: 409 });
  }
  const mine = await prisma.approval.findFirst({ where: { entityType: et, entityId, action: 'approve', approver: member.username } });
  if (!mine) return NextResponse.json({ error: '取り消せる承認がありません' }, { status: 409 });
  // 承認から30分以内のみ
  if (Date.now() - mine.createdAt.getTime() > UNDO_WINDOW_MS) {
    return NextResponse.json({ error: '承認から30分を過ぎたため取り消せません' }, { status: 409 });
  }

  await prisma.approval.delete({ where: { id: mine.id } });

  if (et === 'decision') {
    const updated = await prisma.decision.findUnique({ where: { id: entityId }, include: DECISION_INCLUDE });
    const approvals = await approvalPayload(et, entityId);
    return NextResponse.json({ ...updated, approvals, hasPrevState: !!updated?.prevState });
  }
  const updated = await loadEntity(et, entityId);
  return NextResponse.json(updated);
}
