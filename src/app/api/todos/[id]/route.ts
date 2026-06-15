import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STEPS_INCLUDE = { steps: { orderBy: { stepOrder: 'asc' as const } } };

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, priority, status, dueDate, isShared } = body;
    const todo = await prisma.todo.update({
      where: { id },
      data: { title, description: description ?? null, priority, status, dueDate: dueDate ?? null, isShared: isShared ?? false },
      include: STEPS_INCLUDE,
    });
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.todo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'タスクの削除に失敗しました' }, { status: 500 });
  }
}
