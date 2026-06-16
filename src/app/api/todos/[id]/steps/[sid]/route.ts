import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  try {
    const { sid } = await params;
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  try {
    const { sid } = await params;
    await prisma.todoStep.delete({ where: { id: sid } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '工程の削除に失敗しました' }, { status: 500 });
  }
}
