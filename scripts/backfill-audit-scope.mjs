// 既存の AuditLog に deptIds / involved を埋めるバックフィル。
// 対象が現存すれば現データから再計算。削除済みは actor のみ involved に。
// 冪等：deptIds が未設定(null)の行のみ処理。
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function computeScope(entityType, entityId) {
  const deptIds = new Set();
  const involved = new Set();
  const assignees = new Set();
  const creators = new Set();
  const addApprovers = async (et, id) => {
    const rows = await prisma.approval.findMany({ where: { entityType: et, entityId: id }, select: { approver: true } });
    rows.forEach((r) => r.approver && involved.add(r.approver));
  };
  const addDecision = (d) => {
    if (d.departmentId) deptIds.add(d.departmentId);
    if (d.createdBy) involved.add(d.createdBy);
    if (d.assigneeUsername) involved.add(d.assigneeUsername);
    for (const t of d.tasks) { const dep = t.departmentId ?? d.departmentId; if (dep) deptIds.add(dep); if (t.who) involved.add(t.who); }
  };
  try {
    if (entityType === 'decision') {
      const d = await prisma.decision.findUnique({ where: { id: entityId }, include: { tasks: { select: { departmentId: true, who: true, createdBy: true } } } });
      if (d) {
        addDecision(d);
        if (d.assigneeUsername) assignees.add(d.assigneeUsername);
        if (d.createdBy) creators.add(d.createdBy);
        for (const t of d.tasks) { if (t.who) assignees.add(t.who); if (t.createdBy) creators.add(t.createdBy); }
      }
      await addApprovers('decision', entityId);
    } else {
      const ent = entityType === 'policy'
        ? await prisma.policy.findUnique({ where: { id: entityId }, select: { createdBy: true } })
        : await prisma.project.findUnique({ where: { id: entityId }, select: { createdBy: true } });
      if (ent?.createdBy) { involved.add(ent.createdBy); creators.add(ent.createdBy); }
      await addApprovers(entityType, entityId);
      // 紐づく決定事項の「部門」だけ deptIds に（involvedには加えない）
      const decIds = new Set();
      if (entityType === 'policy') {
        (await prisma.decisionPolicy.findMany({ where: { policyId: entityId }, select: { decisionId: true } })).forEach((x) => decIds.add(x.decisionId));
        (await prisma.taskPolicy.findMany({ where: { policyId: entityId }, include: { task: { select: { decisionId: true } } } })).forEach((x) => x.task?.decisionId && decIds.add(x.task.decisionId));
      } else {
        (await prisma.decisionProject.findMany({ where: { projectId: entityId }, select: { decisionId: true } })).forEach((x) => decIds.add(x.decisionId));
        (await prisma.taskProject.findMany({ where: { projectId: entityId }, include: { task: { select: { decisionId: true } } } })).forEach((x) => x.task?.decisionId && decIds.add(x.task.decisionId));
      }
      if (decIds.size) {
        const decs = await prisma.decision.findMany({ where: { id: { in: [...decIds] } }, include: { tasks: { select: { departmentId: true } } } });
        for (const d of decs) { if (d.departmentId) deptIds.add(d.departmentId); for (const t of d.tasks) { const dep = t.departmentId ?? d.departmentId; if (dep) deptIds.add(dep); } }
      }
    }
  } catch { /* 算出失敗時は空 */ }
  return { deptIds: [...deptIds], involved: [...involved], assignees: [...assignees], creators: [...creators] };
}

// 既存の DecisionTask に createdBy が無いものは、親決定の起案者で補完
const taskFix = await prisma.decisionTask.findMany({ where: { createdBy: null }, select: { id: true, decisionId: true } });
const decCache = new Map();
let taskFixed = 0;
for (const t of taskFix) {
  let cb = decCache.get(t.decisionId);
  if (cb === undefined) { const d = await prisma.decision.findUnique({ where: { id: t.decisionId }, select: { createdBy: true } }); cb = d?.createdBy ?? null; decCache.set(t.decisionId, cb); }
  if (cb) { await prisma.decisionTask.update({ where: { id: t.id }, data: { createdBy: cb } }); taskFixed++; }
}
console.log(`DecisionTask.createdBy 補完: ${taskFixed}件`);

// 全行を再計算（involvedの過剰登録を修正するため上書き）
const rows = await prisma.auditLog.findMany({ select: { id: true, entityType: true, entityId: true, actor: true } });
console.log(`backfill対象: ${rows.length}件`);
let live = 0, deleted = 0;
for (const r of rows) {
  const scope = await computeScope(r.entityType, r.entityId);
  if (r.actor) scope.involved.push(r.actor);
  const hadEntity = scope.deptIds.length > 0 || scope.involved.length > 1; // actor以外に何かあれば現存とみなす
  if (hadEntity) live++; else deleted++;
  await prisma.auditLog.update({
    where: { id: r.id },
    data: { deptIds: [...new Set(scope.deptIds)].join(','), involved: [...new Set(scope.involved)].join(','), assignee: scope.assignees.join(','), creator: scope.creators.join(',') },
  });
}
console.log(`完了: 現存から再計算=${live} / 削除済み(actorのみ)=${deleted}`);
await prisma.$disconnect();
