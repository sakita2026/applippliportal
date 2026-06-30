import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 集計分類の一覧（ログインユーザー全員。プルダウンは active のみ使う）
export async function GET(req: NextRequest) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const list = await prisma.categoryOption.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(list);
}

// 追加（システム管理者のみ）。code は一意（重複・誤作動防止）。
export async function POST(req: NextRequest) {
  if (!(await isAdminUser(getUsername(req)))) return NextResponse.json({ error: 'システム管理者のみ操作できます' }, { status: 403 });
  const { code, label } = await req.json();
  const c = typeof code === 'string' ? code.trim() : '';
  const l = typeof label === 'string' ? label.trim() : '';
  if (!c || !l) return NextResponse.json({ error: 'コードと名称は必須です' }, { status: 400 });
  if (!/^[A-Za-z0-9_-]+$/.test(c)) return NextResponse.json({ error: 'コードは半角英数・ハイフン・アンダースコアのみ使用できます' }, { status: 400 });
  const exists = await prisma.categoryOption.findUnique({ where: { code: c } });
  if (exists) return NextResponse.json({ error: `コード「${c}」は既に存在します` }, { status: 409 });
  const max = await prisma.categoryOption.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.categoryOption.create({ data: { code: c, label: l, sortOrder: (max._max.sortOrder ?? -1) + 1, active: true } });
  return NextResponse.json(created, { status: 201 });
}
