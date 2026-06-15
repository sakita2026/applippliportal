import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, date, startTime, endTime, shareStatus, color, todoId } = body;
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title, description: description ?? null, date,
        startTime: startTime ?? null, endTime: endTime ?? null,
        shareStatus, color, todoId: todoId ?? null,
      },
    });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: 'イベントの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'イベントの削除に失敗しました' }, { status: 500 });
  }
}
