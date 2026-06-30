import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// カレンダーは未実装。CalendarEvent に所有者(userId)列が無く、誰でも他人のイベントを
// 作成/編集/削除できてしまうため、書込みは封鎖する（IDOR防止）。
// 実装時：CalendarEvent へ userId を追加し、GET は所有者/共有範囲で絞り、PUT/DELETE は所有者・担当部長・取締役で認可する。
export async function POST() {
  return NextResponse.json({ error: 'カレンダーは未実装のため、イベントの作成はできません' }, { status: 403 });
}
