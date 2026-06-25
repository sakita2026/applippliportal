import { NextResponse } from 'next/server'

// ローカル認証は廃止。ログインは組織ポータル（orgportal）のSSOに統一。
export async function POST() {
  return NextResponse.json(
    { error: 'ローカルログインは廃止されました。組織ポータルからログインしてください。' },
    { status: 410 },
  )
}
