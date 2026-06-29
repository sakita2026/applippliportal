import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminUser } from '@/lib/members';

const TASKS_INCLUDE = { tasks: { orderBy: { sortOrder: 'asc' as const } } };

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 管理者が決定事項を承認 → ステータスを approved にしてタスクを稼働させる
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const username = getUsernameFromCookie(req);
    if (!(await isAdminUser(username))) {
      return NextResponse.json({ error: '承認は管理者のみ可能です' }, { status: 403 });
    }
    const { id } = await params;
    const decision = await prisma.decision.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: username,
        approvedAt: new Date(),
        everApproved: true,
      },
      include: TASKS_INCLUDE,
    });
    await prisma.decisionTask.updateMany({ where: { decisionId: id, pendingEdit: true }, data: { pendingEdit: false, prevState: null, editedBy: null } });
    return NextResponse.json(decision);
  } catch {
    return NextResponse.json({ error: '承認に失敗しました' }, { status: 500 });
  }
}
