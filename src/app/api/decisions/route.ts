import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, isBoardMember } from '@/lib/approval';

const TASK_INCLUDE = { projects: { include: { project: true } }, policies: { include: { policy: true } } };
const DECISION_INCLUDE = {
  tasks: { orderBy: { sortOrder: 'asc' as const }, include: TASK_INCLUDE },
  projects: { include: { project: true } },
  policies: { include: { policy: true } },
};

function getUsernameFromCookie(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 通常の決定事項は全員に通達。取締役会限定は取締役会メンバーのみに返す。
export async function GET(req: NextRequest) {
  try {
    const member = await getMember(getUsernameFromCookie(req));
    const board = member ? isBoardMember(member) : false;
    // 取締役会限定は取締役会メンバーに加え、担当部長（担当者本人 or 担当部門が自部門）のものはその部長にも返す
    let where: Record<string, unknown>;
    if (board) {
      where = {};
    } else if (member && member.position === 'manager') {
      const or: Record<string, unknown>[] = [
        { boardOnly: false },
        { tasks: { some: { who: member.username } } },
      ];
      if (member.departmentId) {
        or.push({ departmentId: member.departmentId });
        or.push({ tasks: { some: { departmentId: member.departmentId } } });
      }
      where = { OR: or };
    } else {
      where = { boardOnly: false };
    }
    const decisions = await prisma.decision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: DECISION_INCLUDE,
    });
    // 承認の進捗（誰が承認したか）を付与＝1人目承認後も「あと1名」が分かるように
    const ids = decisions.map((d) => d.id);
    const rows = ids.length
      ? await prisma.approval.findMany({
          where: { entityType: 'decision', entityId: { in: ids } },
          select: { entityId: true, approver: true, asDirector: true, asManager: true, action: true, createdAt: true },
        })
      : [];
    type Ap = { approver: string; asDirector: boolean; asManager: boolean; createdAt: string };
    const byId = new Map<string, Ap[]>();
    const delById = new Map<string, Ap[]>();
    for (const a of rows) {
      const map = a.action === 'delete' ? delById : byId;
      const arr = map.get(a.entityId) ?? [];
      arr.push({ approver: a.approver, asDirector: a.asDirector, asManager: a.asManager, createdAt: a.createdAt.toISOString() });
      map.set(a.entityId, arr);
    }
    // 実行タスクの中止/中止解除 承認進捗（entityType='decisionTask'）をタスクごとに付与
    const taskIds = decisions.flatMap((d) => d.tasks.map((t) => t.id));
    const taskDelRows = taskIds.length
      ? await prisma.approval.findMany({ where: { entityType: 'decisionTask', entityId: { in: taskIds }, action: 'delete' }, select: { entityId: true, approver: true, asDirector: true, asManager: true, createdAt: true } })
      : [];
    const taskDelById = new Map<string, Ap[]>();
    for (const a of taskDelRows) {
      const arr = taskDelById.get(a.entityId) ?? [];
      arr.push({ approver: a.approver, asDirector: a.asDirector, asManager: a.asManager, createdAt: a.createdAt.toISOString() });
      taskDelById.set(a.entityId, arr);
    }
    // prevState は重いのでフラグだけ返す（編集の取り消し可否判定用）
    const withApprovals = decisions.map(({ prevState, ...d }) => ({
      ...d,
      approvals: byId.get(d.id) ?? [],
      deleteApprovals: delById.get(d.id) ?? [],
      hasPrevState: !!prevState,
      tasks: d.tasks.map((t) => ({ ...t, deleteApprovals: taskDelById.get(t.id) ?? [] })),
    }));
    return NextResponse.json(withApprovals);
  } catch {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const username = getUsernameFromCookie(req);
    if (!username) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    const body = await req.json();
    const { title, description, tasks, projectIds, policyIds, departmentId, assigneeUsername, boardOnly, startDate, dueDate } = body;
    if (!title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 });
    }
    // 取締役会限定は取締役会メンバーのみ作成可
    if (boardOnly) {
      const member = await getMember(username);
      if (!member || !isBoardMember(member)) {
        return NextResponse.json({ error: '取締役会限定の決定事項は取締役会メンバーのみ作成できます' }, { status: 403 });
      }
    }

    const taskList: Array<Record<string, unknown>> = Array.isArray(tasks) ? tasks : [];
    const projIds: string[] = Array.isArray(projectIds) ? projectIds.slice(0, 5) : [];
    const polIds: string[] = Array.isArray(policyIds) ? policyIds.slice(0, 5) : [];

    const decision = await prisma.decision.create({
      data: {
        title,
        description: description ?? null,
        status: 'pending',
        createdBy: username,
        departmentId: departmentId ?? null,
        assigneeUsername: assigneeUsername ?? null,
        boardOnly: !!boardOnly,
        startDate: startDate ?? null,
        dueDate: dueDate ?? null,
        tasks: {
          create: taskList
            .filter((t) => t && typeof t.what === 'string' && (t.what as string).trim() !== '')
            .map((t, i) => ({
              what: t.what as string,
              why: (t.why as string) ?? null,
              who: (t.who as string) ?? null,
              whereLoc: (t.whereLoc as string) ?? null,
              whenDue: (t.whenDue as string) ?? null,
              how: (t.how as string) ?? null,
              departmentId: (t.departmentId as string) ?? null,
              category: (t.category as string) ?? null,
              startDate: (t.startDate as string) ?? null,
              status: 'todo',
              createdBy: username, // 決定と同時作成のタスク＝決定の起案者を作成者に
              sortOrder: i,
            })),
        },
        projects: { create: projIds.map((pid) => ({ projectId: pid })) },
        policies: { create: polIds.map((pid) => ({ policyId: pid })) },
      },
      include: DECISION_INCLUDE,
    });
    return NextResponse.json(decision, { status: 201 });
  } catch {
    return NextResponse.json({ error: '決定事項の作成に失敗しました' }, { status: 500 });
  }
}
