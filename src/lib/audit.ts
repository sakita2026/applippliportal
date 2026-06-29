import { prisma } from '@/lib/prisma';
import type { EntityType } from '@/lib/approval';

export type AuditAction = 'approve' | 'delete_approve' | 'deleted' | 'edit';

/**
 * 監査ログの可視範囲スナップショットを算出。
 * - deptIds: 関係する部門ID（部長の自部門フィルタ用）
 * - involved: 関与した username（課長・社員の本人関与フィルタ用）
 * 書き込み時点でエンティティを参照して確定するため、削除後も履歴で判定できる。
 */
async function computeScope(entityType: EntityType, entityId: string): Promise<{ deptIds: string[]; involved: string[]; assignees: string[]; creators: string[] }> {
  const deptIds = new Set<string>();
  const involved = new Set<string>();
  const assignees = new Set<string>(); // この内容の担当者（決定事項の担当者＋実行タスクの担当者who）
  const creators = new Set<string>();  // 作成者（決定:起案者＋実行タスク作成者／方針PJ:起案者）

  const addApprovers = async (et: string, id: string) => {
    const rows = await prisma.approval.findMany({ where: { entityType: et, entityId: id }, select: { approver: true } });
    rows.forEach((r) => r.approver && involved.add(r.approver));
  };
  const addDecision = (d: { departmentId: string | null; createdBy: string; assigneeUsername: string | null; tasks: { departmentId: string | null; who: string | null }[] }) => {
    if (d.departmentId) deptIds.add(d.departmentId);
    if (d.createdBy) involved.add(d.createdBy);
    if (d.assigneeUsername) involved.add(d.assigneeUsername);
    for (const t of d.tasks) {
      const dep = t.departmentId ?? d.departmentId;
      if (dep) deptIds.add(dep);
      if (t.who) involved.add(t.who);
    }
  };

  try {
    if (entityType === 'decision') {
      const d = await prisma.decision.findUnique({ where: { id: entityId }, include: { tasks: { select: { departmentId: true, who: true, createdBy: true } } } });
      if (d) {
        addDecision(d);
        if (d.assigneeUsername) assignees.add(d.assigneeUsername);           // 決定事項の担当者
        if (d.createdBy) creators.add(d.createdBy);                          // 決定事項の作成者（起案者）
        for (const t of d.tasks) {
          if (t.who) assignees.add(t.who);                                  // 実行タスクの担当者
          if (t.createdBy) creators.add(t.createdBy);                       // 実行タスクの作成者
        }
      }
      await addApprovers('decision', entityId);
    } else {
      // 本人関与(involved)は「その方針/PJ自体の起案者＋承認者」のみ（紐づく決定事項の参加者は含めない）
      const ent = entityType === 'policy'
        ? await prisma.policy.findUnique({ where: { id: entityId }, select: { createdBy: true } })
        : await prisma.project.findUnique({ where: { id: entityId }, select: { createdBy: true } });
      if (ent?.createdBy) { involved.add(ent.createdBy); creators.add(ent.createdBy); } // 方針・PJの作成者(起案者)
      await addApprovers(entityType, entityId);
      // 紐づく決定事項/実行タスクの「部門」だけを deptIds に反映（部長の自部門判定用・involvedには加えない）
      const decIds = new Set<string>();
      if (entityType === 'policy') {
        (await prisma.decisionPolicy.findMany({ where: { policyId: entityId }, select: { decisionId: true } })).forEach((x) => decIds.add(x.decisionId));
        (await prisma.taskPolicy.findMany({ where: { policyId: entityId }, include: { task: { select: { decisionId: true } } } })).forEach((x) => x.task?.decisionId && decIds.add(x.task.decisionId));
      } else {
        (await prisma.decisionProject.findMany({ where: { projectId: entityId }, select: { decisionId: true } })).forEach((x) => decIds.add(x.decisionId));
        (await prisma.taskProject.findMany({ where: { projectId: entityId }, include: { task: { select: { decisionId: true } } } })).forEach((x) => x.task?.decisionId && decIds.add(x.task.decisionId));
      }
      if (decIds.size) {
        const decs = await prisma.decision.findMany({ where: { id: { in: [...decIds] } }, include: { tasks: { select: { departmentId: true } } } });
        for (const d of decs) {
          if (d.departmentId) deptIds.add(d.departmentId);
          for (const t of d.tasks) { const dep = t.departmentId ?? d.departmentId; if (dep) deptIds.add(dep); }
        }
      }
    }
  } catch {
    /* スコープ算出失敗時は空（取締役会メンバーのみ閲覧可になる） */
  }
  return { deptIds: [...deptIds], involved: [...involved], assignees: [...assignees], creators: [...creators] };
}

/** 監査ログを追記（失敗してもメイン処理は止めない） */
export async function writeAudit(params: {
  entityType: EntityType;
  entityId: string;
  title: string;
  action: AuditAction;
  actor: string;
  asDirector?: boolean;
  asManager?: boolean;
  detail?: string;
}): Promise<void> {
  try {
    const scope = await computeScope(params.entityType, params.entityId);
    if (params.actor) scope.involved.push(params.actor); // 実行者は必ず関与に含める
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        action: params.action,
        actor: params.actor,
        asDirector: !!params.asDirector,
        asManager: !!params.asManager,
        detail: params.detail ?? null,
        deptIds: [...new Set(scope.deptIds)].join(','),
        involved: [...new Set(scope.involved)].join(','),
        assignee: scope.assignees.join(','),
        creator: scope.creators.join(','),
      },
    });
  } catch {
    /* 監査ログ失敗は無視 */
  }
}

/** エンティティの表示名を取り出す（decision=title, policy/project=name） */
export function entityTitle(entityType: EntityType, entity: unknown): string {
  const e = entity as { title?: string; name?: string };
  return (entityType === 'decision' ? e.title : e.name) ?? '(無題)';
}
