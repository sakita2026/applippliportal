import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, date, startTime, endTime, shareStatus, color, todoId } = body;
    if (!title || !date || !shareStatus || !color) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const event = await prisma.calendarEvent.create({
      data: {
        title, description: description ?? null, date,
        startTime: startTime ?? null, endTime: endTime ?? null,
        shareStatus, color, todoId: todoId ?? null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'イベントの作成に失敗しました' }, { status: 500 });
  }
}
