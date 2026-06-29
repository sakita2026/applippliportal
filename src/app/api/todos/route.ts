import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

const STEPS_INCLUDE = { steps: { orderBy: { stepOrder: 'asc' as const } } };

function getUsernameFromCookie(req: NextRequest): string | null {
  // middleware が検証済みでセットした信頼できるユーザー名
  return req.headers.get('x-wp-user')
}

export async function GET(req: NextRequest) {
  try {
    const username = getUsernameFromCookie(req)
    // 管理者は全ユーザーのタスクを取得、一般ユーザーは自分＋共有のみ
    const where = (await isAdminUser(username))
      ? {}
      : username
        ? { OR: [{ userId: username }, { isShared: true }] }
        : { isShared: true };
    const todos = await prisma.todo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: STEPS_INCLUDE,
    });
    return NextResponse.json(todos);
  } catch {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const username = getUsernameFromCookie(req)
    const body = await req.json();
    const { title, description, priority, status, dueDate, isShared, startDate, why, who, whereLoc, how, departmentId } = body;
    if (!title || !priority || !status) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const todo = await prisma.todo.create({
      data: {
        title,
        description: description ?? null,
        priority,
        status,
        dueDate: dueDate ?? null,
        startDate: startDate ?? null,
        why: why ?? null, who: who ?? null, whereLoc: whereLoc ?? null, how: how ?? null, departmentId: departmentId ?? null,
        userId: username ?? null,
        isShared: isShared ?? false,
      },
      include: STEPS_INCLUDE,
    });
    return NextResponse.json(todo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'タスクの作成に失敗しました' }, { status: 500 });
  }
}
