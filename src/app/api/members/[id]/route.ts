import { NextResponse } from 'next/server';

// メンバーの編集・削除は組織管理アプリ（orgportal）に一本化（身分の正は orgportal ディレクトリ）。
// WorkPortal 側ではローカルの影の台帳を持たず、メンバーを変更しない（権限昇格・二重管理の防止）。
export function PUT() {
  return NextResponse.json({ error: 'メンバー管理は組織管理アプリ（orgportal）で行ってください' }, { status: 410 });
}

export function DELETE() {
  return NextResponse.json({ error: 'メンバー管理は組織管理アプリ（orgportal）で行ってください' }, { status: 410 });
}
