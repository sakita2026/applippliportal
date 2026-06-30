import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember } from '@/lib/approval';
import { canManageTodo } from '@/lib/visibility';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: todoId } = await params;
    // 工程の追加は親タスクを操作できる人のみ（担当者(所有者)・担当部長・取締役）
    const member = await getMember(req.headers.get('x-wp-user'));
    const todo = await prisma.todo.findUnique({ where: { id: todoId }, select: { userId: true, departmentId: true } });
    if (!todo) return NextResponse.json({ error: '対象のタスクが見つかりません' }, { status: 404 });
    const ownerDept = todo.userId ? (await getMember(todo.userId))?.departmentId ?? null : null;
    if (!canManageTodo({ userId: todo.userId, departmentId: todo.departmentId }, member, ownerDept)) {
      return NextResponse.json({ error: '工程の追加は担当者・担当部長・取締役のみ可能です' }, { status: 403 });
    }
    const body = await req.json();
    const { title, stepOrder, dueDate, dueTime } = body;
    if (!title) {
      return NextResponse.json({ error: '工程名は必須です' }, { status: 400 });
    }
    const step = await prisma.todoStep.create({
      data: { todoId, title, stepOrder: stepOrder ?? 0, done: false, dueDate: dueDate ?? null, dueTime: dueTime ?? null },
    });
    return NextResponse.json(step, { status: 201 });
  } catch {
    return NextResponse.json({ error: '工程の作成に失敗しました' }, { status: 500 });
  }
}
