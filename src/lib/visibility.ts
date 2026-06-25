import type { Decision, DecisionTask, Member } from '@/types';

/** 取締役以上（取締役 or 代表取締役）。すべてを閲覧できる。 */
export function isDirectorPlus(u?: Member | null): boolean {
  return !!u && (!!u.isDirector || !!u.isRepresentative);
}

/** 役職に応じた初期表示範囲：取締役以上=全体／部長=自部門／一般社員=自分 */
export function defaultView(u?: Member | null): View {
  if (isDirectorPlus(u)) return 'all';
  if (u?.position === 'manager') return 'dept';
  return 'mine';
}

/**
 * 表示ビュー:
 *  - 'all'  … 全体（取締役以上のみ）
 *  - 'mine' … 自分
 *  - 'dept' … 自部門
 *  - <departmentId> … 特定部門（取締役以上が部門でソートする時）
 */
export type View = 'all' | 'mine' | 'dept' | (string & {});

/** 決定事項が現在のビューで表示対象か（全社通達 dept='all' は常に表示） */
export function decisionVisible(d: Decision, view: View, u?: Member | null): boolean {
  if (view === 'all') return true;
  if (d.departmentId === 'all') return true;
  // 自分が編集して承認待ちのものは、表示範囲に関わらず本人に表示（編集の取り消し導線のため）
  if (u && d.status === 'pending' && d.editedBy === u.username) return true;
  // 自分が編集して再承認待ちの実行タスクを含むものも、本人に表示
  if (u && d.tasks.some((t) => t.pendingEdit && t.editedBy === u.username)) return true;
  if (view === 'mine') {
    return d.createdBy === u?.username || d.tasks.some((t) => t.who === u?.username);
  }
  const dept = view === 'dept' ? (u?.departmentId ?? null) : view;
  if (!dept) return false;
  if (d.departmentId === dept) return true;
  return d.tasks.some((t) => (t.departmentId ?? d.departmentId) === dept);
}

/** 実行タスクが現在のビューで表示対象か */
export function taskVisible(d: Decision, t: DecisionTask, view: View, u?: Member | null): boolean {
  if (view === 'all') return true;
  // 「自分」は担当者本人のみ（全社通達でも他人担当は除外）
  if (view === 'mine') return t.who === u?.username;
  if (d.departmentId === 'all') return true;
  const dept = view === 'dept' ? (u?.departmentId ?? null) : view;
  if (!dept) return false;
  return (t.departmentId ?? d.departmentId) === dept;
}

/** 表示対象の決定事項・実行タスクに紐づく方針/プロジェクトの ID 集合 */
export function visibleTagIds(
  decisions: Decision[],
  view: View,
  u?: Member | null,
): { policyIds: Set<string>; projectIds: Set<string> } {
  const policyIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const d of decisions) {
    const dVis = decisionVisible(d, view, u);
    if (dVis) {
      d.policies?.forEach((p) => policyIds.add(p.policyId));
      d.projects?.forEach((p) => projectIds.add(p.projectId));
    }
    for (const t of d.tasks) {
      if (dVis || taskVisible(d, t, view, u)) {
        t.policies?.forEach((p) => policyIds.add(p.policyId));
        t.projects?.forEach((p) => projectIds.add(p.projectId));
      }
    }
  }
  return { policyIds, projectIds };
}
