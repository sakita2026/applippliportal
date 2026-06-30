import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { canManageTodo } from '@/lib/visibility';

// 工程が指定タスク([id])に属し、操作者が親タスクを管理できる（担当者・担当部長・取締役）ことを検証する
async function authorizeStep(req: NextRequest, id: string, sid: string): Promise<NextResponse | null> {
  const member = await getMember(req.headers.get('x-wp-user'));
  const step = await prisma.todoStep.findUnique({ where: { id: sid }, select: { todoId: true } });
  if (!step || step.todoId !== id) return NextResponse.json({ error: '対象の工程が見つかりません' }, { status: 404 });
  const todo = await prisma.todo.findUnique({ where: { id: step.todoId }, select: { userId: true, departmentId: true } });
  if (!todo) return NextResponse.json({ error: '対象のタスクが見つかりません' }, { status: 404 });
  const ownerDept = todo.userId ? (await getMember(todo.userId))?.departmentId ?? null : null;
  if (!canManageTodo({ userId: todo.userId, departmentId: todo.departmentId }, member, ownerDept)) {
    return NextResponse.json({ error: '工程の編集・削除は担当者・担当部長・取締役のみ可能です' }, { status: 403 });
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  try {
    const { id, sid } = await params;
    const denied = await authorizeStep(req, id, sid);
    if (denied) return denied;
    const body = await req.json();
    const { title, done, stepOrder, dueDate, dueTime } = body;
    const step = await prisma.todoStep.update({
      where: { id: sid },
      data: {
        ...(title !== undefined && { title }),
        ...(done !== undefined && { done }),
        ...(stepOrder !== undefined && { stepOrder }),
        ...(dueDate !== undefined && { dueDate }),
        ...(dueTime !== undefined && { dueTime }),
      },
    });
    return NextResponse.json(step);
  } catch {
    return NextResponse.json({ error: '工程の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  try {
    const { id, sid } = await params;
    const denied = await authorizeStep(req, id, sid);
    if (denied) return denied;
    await prisma.todoStep.delete({ where: { id: sid } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '工程の削除に失敗しました' }, { status: 500 });
  }
}
