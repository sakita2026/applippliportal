import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

// 名称変更・表示/非表示・表示順の変更（システム管理者のみ）。code は変更不可（誤作動防止）。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminUser(req.headers.get('x-wp-user')))) return NextResponse.json({ error: 'システム管理者のみ操作できます' }, { status: 403 });
  const { id } = await params;
  const { label, active, sortOrder } = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof label === 'string') { if (!label.trim()) return NextResponse.json({ error: '名称は必須です' }, { status: 400 }); data.label = label.trim(); }
  if (typeof active === 'boolean') data.active = active;
  if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: '変更内容がありません' }, { status: 400 });
  const updated = await prisma.categoryOption.update({ where: { id }, data });
  return NextResponse.json(updated);
}
