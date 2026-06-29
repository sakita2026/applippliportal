import { NextRequest, NextResponse } from 'next/server';
import { fetchDirectory } from '@/lib/directory';

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// メンバー一覧は orgportal のディレクトリを参照（WorkPortal はユーザー管理を持たない）
export async function GET(req: NextRequest) {
  const username = getUsernameFromCookie(req);
  if (!username) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const { members } = await fetchDirectory();
    return NextResponse.json(members);
  } catch {
    return NextResponse.json([]);
  }
}

// 作成・編集・削除は組織管理アプリ（orgportal）で行う
export function POST() {
  return NextResponse.json({ error: 'メンバー管理は組織管理アプリで行ってください' }, { status: 410 });
}
