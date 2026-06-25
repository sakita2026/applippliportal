import { NextRequest, NextResponse } from 'next/server';

// マジックリンク検証は廃止。ログインは組織ポータル（orgportal）のSSOに統一。
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
}
