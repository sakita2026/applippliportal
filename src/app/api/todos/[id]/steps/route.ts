import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: todoId } = await params;
    const body = await req.json();
    const { title, stepOrder } = body;
    if (!title) {
      return NextResponse.json({ error: '工程名は必須です' }, { status: 400 });
    }
    const step = await prisma.todoStep.create({
      data: { todoId, title, stepOrder: stepOrder ?? 0, done: false },
    });
    return NextResponse.json(step, { status: 201 });
  } catch {
    return NextResponse.json({ error: '工程の作成に失敗しました' }, { status: 500 });
  }
}
