import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { restoreDecision } from '@/lib/snapshot';
import { writeAudit } from '@/lib/audit';

const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: { projects: { include: { project: true } }, policies: { include: { policy: true } } } },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

// 編集の取り消し（承認待ちの間のみ）。承認後（approved）は不可。部長以上のみ。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = req.cookies.get('workportal_auth')?.value ?? null;
  const member = await getMember(username);
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const d = await prisma.decision.findUnique({ where: { id } });
  if (!d) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  if (d.status !== 'pending') return NextResponse.json({ error: '承認後は編集を取り消せません' }, { status: 409 });
  if (!d.prevState) return NextResponse.json({ error: '取り消せる編集がありません' }, { status: 409 });
  // 編集を取り消せるのは「編集した本人」のみ
  if (d.editedBy !== member.username) return NextResponse.json({ error: '編集の取り消しは編集した本人のみ可能です' }, { status: 403 });

  const ok = await restoreDecision(id);
  if (!ok) return NextResponse.json({ error: '取り消しに失敗しました' }, { status: 500 });
  await writeAudit({ entityType: 'decision', entityId: id, title: d.title, action: 'edit', actor: username ?? '', detail: '編集を取り消し（編集前に復元）' });
  const decision = await prisma.decision.findUnique({ where: { id }, include: DECISION_INCLUDE });
  return NextResponse.json({ ...decision, approvals: [], hasPrevState: false });
}
