import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STEPS_INCLUDE = { steps: { orderBy: { stepOrder: 'asc' as const } } };

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, priority, status, dueDate, isShared, startDate, why, who, whereLoc, how, departmentId } = body;
    // 完了日時：done になった時に記録、未完了に戻したら null。既に done のものは時刻を保持。
    const existing = await prisma.todo.findUnique({ where: { id }, select: { completedAt: true } });
    const completedAt = status === 'done' ? (existing?.completedAt ?? new Date()) : null;
    const todo = await prisma.todo.update({
      where: { id },
      data: {
        title, description: description ?? null, priority, status, dueDate: dueDate ?? null, isShared: isShared ?? false,
        startDate: startDate ?? null, why: why ?? null, who: who ?? null, whereLoc: whereLoc ?? null, how: how ?? null, departmentId: departmentId ?? null,
        completedAt,
      },
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
