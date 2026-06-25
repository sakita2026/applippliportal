import { NextResponse } from 'next/server';
import { fetchDirectory } from '@/lib/directory';
import { DEFAULT_DEPARTMENTS } from '@/lib/departments';

// 部門一覧は orgportal のディレクトリを参照
export async function GET() {
  try {
    const { departments } = await fetchDirectory();
    return NextResponse.json(departments.length > 0 ? departments : DEFAULT_DEPARTMENTS);
  } catch {
    return NextResponse.json(DEFAULT_DEPARTMENTS);
  }
}

// 部門管理は組織管理アプリ（orgportal）で行う
export function POST() {
  return NextResponse.json({ error: '部門管理は組織管理アプリで行ってください' }, { status: 410 });
}
