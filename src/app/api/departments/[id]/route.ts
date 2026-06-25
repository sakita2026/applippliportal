import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { name, sortOrder } = body;
    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    });
    return NextResponse.json(department);
  } catch {
    return NextResponse.json({ error: '部門の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '部門の削除に失敗しました' }, { status: 500 });
  }
}
