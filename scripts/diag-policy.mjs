import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
// 該当方針の監査行
const rows = await p.auditLog.findMany({ where: { entityType:'policy' }, select:{id:true,title:true,deptIds:true,involved:true,entityId:true,action:true} });
const target = rows.filter(r => (r.title||'').includes('クラウド契約数'));
console.log('該当方針の監査行数:', target.length);
target.slice(0,3).forEach(r=>console.log('  action='+r.action,'| deptIds=['+(r.deptIds||'')+'] | involved=['+(r.involved||'')+']'));
if (target[0]) {
  const pid = target[0].entityId;
  console.log('policyId=', pid);
  // この方針に紐づく決定事項とその部門
  const dp = await p.decisionPolicy.findMany({ where:{policyId:pid}, select:{decisionId:true} });
  const tp = await p.taskPolicy.findMany({ where:{policyId:pid}, include:{task:{select:{decisionId:true}}} });
  const decIds = [...new Set([...dp.map(x=>x.decisionId), ...tp.map(x=>x.task?.decisionId).filter(Boolean)])];
  console.log('紐づく決定事項数:', decIds.length);
  if (decIds.length){
    const decs = await p.decision.findMany({ where:{id:{in:decIds}}, include:{tasks:{select:{departmentId:true}}} });
    decs.forEach(d=>console.log('  決定:',(d.title||'').slice(0,18),'| dept='+d.departmentId,'| taskDepts='+d.tasks.map(t=>t.departmentId).join(',')));
  }
  // この方針のpolicy本体
  const pol = await p.policy.findUnique({where:{id:pid},select:{createdBy:true}});
  console.log('policy.createdBy=', pol?.createdBy);
}
await p.$disconnect();
