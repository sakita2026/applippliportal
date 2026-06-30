import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchDirectory } from '@/lib/directory';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 監査ログ一覧（承認・削除承認・削除）。実行者名を解決し、役職に応じて可視範囲を絞って返す。
export async function GET(req: NextRequest) {
  const username = getUsername(req);
  if (!username) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const [logs, dir] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
      fetchDirectory().catch(() => ({ members: [] as Array<{ username: string; name: string; departmentId: string | null; position?: string | null; isDirector?: boolean; isRepresentative?: boolean; isAdvisor?: boolean; isAuditor?: boolean }>, departments: [] as Array<{ id: string; name: string }> })),
    ]);
    const memberOf = (u: string) => dir.members.find((m) => m.username === u);
    const deptName = (id: string | null | undefined) => (id ? (dir.departments.find((d) => d.id === id)?.name ?? id) : '');
    const nameOf = (u: string) => memberOf(u)?.name ?? u;

    // 閲覧者の役職で可視範囲を決定
    const me = memberOf(username);
    const isBoard = !!me && (!!me.isDirector || !!me.isRepresentative || !!me.isAdvisor || !!me.isAuditor); // 取締役会メンバー・監査役=全件閲覧
    const isManager = me?.position === 'manager'; // 部長=自部門＋本人関与
    const myDept = me?.departmentId ?? null;
    const split = (s: string | null | undefined) => (s ? s.split(',').filter(Boolean) : []);
    const visible = (l: { involved: string | null; deptIds: string | null; actor: string; entityType: string }) => {
      if (isBoard) return true;
      const involved = split(l.involved);
      if (involved.includes(username) || l.actor === username) return true; // 本人関与（全種別）
      // 自部門表示は「決定事項・実行タスク」のみ。方針・プロジェクトは本人関与のみ（部長でも自部門紐づきでは出さない）
      if (isManager && myDept && l.entityType === 'decision' && split(l.deptIds).includes(myDept)) return true;
      return false;
    };

    return NextResponse.json(
      logs.filter(visible).map((l) => ({
        id: l.id,
        entityType: l.entityType,
        entityId: l.entityId,
        title: l.title,
        action: l.action,
        actor: l.actor,
        actorName: nameOf(l.actor),
        actorDept: deptName(memberOf(l.actor)?.departmentId),
        asDirector: l.asDirector,
        asManager: l.asManager,
        detail: l.detail,
        // この内容の担当者（決定事項の担当者＋実行タスク担当者）。複数を「氏名（部署）」で連結。
        assigneeNames: split(l.assignee).map((u) => `${nameOf(u)}${deptName(memberOf(u)?.departmentId) ? `（${deptName(memberOf(u)?.departmentId)}）` : ''}`).join('、') || null,
        // 作成者（決定:起案者＋実行タスク作成者／方針PJ:起案者）。複数を「氏名（部署）」で連結。
        creatorNames: split(l.creator).map((u) => `${nameOf(u)}${deptName(memberOf(u)?.departmentId) ? `（${deptName(memberOf(u)?.departmentId)}）` : ''}`).join('、') || null,
        createdAt: l.createdAt,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
