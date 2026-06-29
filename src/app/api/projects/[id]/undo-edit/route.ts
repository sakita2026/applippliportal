import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { restoreProject } from '@/lib/snapshot';

// プロジェクトの編集取り消し（承認待ちの間のみ・部長/取締役のみ）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMember(req.headers.get('x-wp-user'));
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  if (p.status !== 'pending') return NextResponse.json({ error: '承認後は編集を取り消せません' }, { status: 409 });
  if (!p.prevState) return NextResponse.json({ error: '取り消せる編集がありません' }, { status: 409 });
  if (p.editedBy !== member.username) return NextResponse.json({ error: '編集の取り消しは編集した本人のみ可能です' }, { status: 403 });
  await restoreProject(id);
  return NextResponse.json(await prisma.project.findUnique({ where: { id } }));
}
