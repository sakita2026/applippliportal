import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

const SELECT = {
  id: true, username: true, name: true, initials: true, email: true,
  authType: true, role: true, departmentId: true, position: true,
  isDirector: true, isRepresentative: true, active: true,
} as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { name, initials, email, authType, password, role, departmentId, position, isDirector, isRepresentative, active } = body;
    const type = authType === 'email' ? 'email' : authType === 'password' ? 'password' : undefined;
    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(initials !== undefined ? { initials } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(type !== undefined ? { authType: type } : {}),
        // パスワードは空文字なら変更しない（指定があるときのみ更新）
        ...(password ? { password } : {}),
        ...(role !== undefined ? { role: role === 'admin' ? 'admin' : 'member' } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
        ...(position !== undefined ? { position: position || null } : {}),
        ...(isDirector !== undefined ? { isDirector: !!isDirector } : {}),
        ...(isRepresentative !== undefined ? { isRepresentative: !!isRepresentative } : {}),
        ...(active !== undefined ? { active: !!active } : {}),
      },
      select: SELECT,
    });
    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: 'メンバーの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }
    const { id } = await params;
    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'メンバーの削除に失敗しました' }, { status: 500 });
  }
}
