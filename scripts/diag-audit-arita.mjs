import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.auditLog.findMany({ select: { id:true, actor:true, involved:true, deptIds:true, entityType:true, title:true, action:true } });
const U='arita-t';
const inv = rows.filter(r => (r.involved||'').split(',').includes(U));
const act = rows.filter(r => r.actor===U);
const both = rows.filter(r => (r.involved||'').split(',').includes(U) || r.actor===U);
console.log('total', rows.length);
console.log('arita-t in involved:', inv.length);
console.log('arita-t is actor:', act.length);
console.log('visible(involved or actor):', both.length);
// involvedにarita-tが入っている行のうち、本人がactorでないもの＝他人の操作だが関与で見えている数
console.log('involved-but-not-actor:', rows.filter(r => (r.involved||'').split(',').includes(U) && r.actor!==U).length);
// サンプル：involvedにarita-tが含まれる行を5件
inv.slice(0,6).forEach(r=>console.log('  ',r.action,r.entityType,'| involved=['+(r.involved||'')+']'));
await p.$disconnect();
