import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STEPS_INCLUDE = { steps: { orderBy: { stepOrder: 'asc' as const } } };

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
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
    const body = await req.json();
    const { title, description, priority, status, dueDate } = body;
    if (!title || !priority || !status) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const todo = await prisma.todo.create({
      data: { title, description: description ?? null, priority, status, dueDate: dueDate ?? null },
      include: STEPS_INCLUDE,
    });
    return NextResponse.json(todo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'タスクの作成に失敗しました' }, { status: 500 });
  }
}
