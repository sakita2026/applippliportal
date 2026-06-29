import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.auditLog.findMany({ where:{entityType:'project'}, select:{title:true,involved:true,actor:true} });
const t = rows.filter(r=>(r.title||'').includes('一般市場上場'));
console.log('「一般市場上場」project 監査行:', t.length);
t.slice(0,3).forEach(r=>console.log('  involved=['+(r.involved||'')+'] actor='+r.actor, '| kobayashi-t関与:', (r.involved||'').split(',').includes('kobayashi-t')||r.actor==='kobayashi-t'));
// このprojectのcreatedBy/承認者
const pr = await p.project.findFirst({where:{name:{contains:'一般市場上場'}},select:{id:true,createdBy:true}});
console.log('project.createdBy=', pr?.createdBy);
if(pr){const ap=await p.approval.findMany({where:{entityType:'project',entityId:pr.id},select:{approver:true}});console.log('承認者:', ap.map(a=>a.approver).join(','));}
await p.$disconnect();
