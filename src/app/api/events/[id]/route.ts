import { NextResponse } from 'next/server';

// カレンダーは未実装。所有者モデルが無く誰でも他人のイベントを操作できてしまうため、
// 編集・削除を封鎖する（IDOR防止）。実装時に所有者(userId)で認可すること。
export async function PUT() {
  return NextResponse.json({ error: 'カレンダーは未実装のため、イベントの編集はできません' }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'カレンダーは未実装のため、イベントの削除はできません' }, { status: 403 });
}
