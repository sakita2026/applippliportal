import { NextResponse } from 'next/server';

// メール認証（マジックリンク）は廃止。ログインは組織ポータル（orgportal）のSSOに統一。
export async function POST() {
  return NextResponse.json(
    { error: 'メールログインは廃止されました。組織ポータルからログインしてください。' },
    { status: 410 },
  );
}
