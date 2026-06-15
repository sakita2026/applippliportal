import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STEPS_INCLUDE = { steps: { orderBy: { stepOrder: 'asc' as const } } };

function getUsernameFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get('workportal_auth')
  return cookie?.value ?? null
}

export async function GET(req: NextRequest) {
  try {
    const username = getUsernameFromCookie(req)
    const todos = await prisma.todo.findMany({
      where: username
        ? { OR: [{ userId: username }, { isShared: true }] }
        : { isShared: true },
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
    const { title, description, priority, status, dueDate, isShared } = body;
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
