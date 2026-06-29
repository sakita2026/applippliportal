import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

// 方針 → プロジェクト → 決定事項/タスク件数 の集計（ビジュアル用）
export async function GET(req: NextRequest) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const [policies, projects, links, decisions] = await Promise.all([
      prisma.policy.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.project.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.decisionProject.findMany(),
      prisma.decision.findMany({ include: { tasks: true } }),
    ]);

    const decById = new Map(decisions.map((d) => [d.id, d]));
    // プロジェクトごとの集計
    const projStats = projects.map((p) => {
      const decIds = links.filter((l) => l.projectId === p.id).map((l) => l.decisionId);
      const decs = decIds.map((id) => decById.get(id)).filter(Boolean) as typeof decisions;
      const taskCount = decs.reduce((s, d) => s + d.tasks.length, 0);
      const doneTaskCount = decs.reduce((s, d) => s + d.tasks.filter((t) => t.status === 'done').length, 0);
      const doneDecisions = decs.filter((d) => d.status === 'done').length;
      return {
        id: p.id, name: p.name, policyId: p.policyId,
        decisionCount: decs.length, doneDecisions, taskCount, doneTaskCount,
      };
    });

    const tree = policies.map((pol) => {
      const ps = projStats.filter((p) => p.policyId === pol.id);
      return {
        id: pol.id, name: pol.name, description: pol.description,
        projectCount: ps.length,
        decisionCount: ps.reduce((s, p) => s + p.decisionCount, 0),
        taskCount: ps.reduce((s, p) => s + p.taskCount, 0),
        doneTaskCount: ps.reduce((s, p) => s + p.doneTaskCount, 0),
        projects: ps,
      };
    });
    // 方針未割当のプロジェクト
    const orphanProjects = projStats.filter((p) => !p.policyId || !policies.find((pol) => pol.id === p.policyId));

    return NextResponse.json({ tree, orphanProjects });
  } catch {
    return NextResponse.json({ tree: [], orphanProjects: [] });
  }
}
