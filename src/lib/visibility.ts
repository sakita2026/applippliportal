import type { Decision, DecisionTask, Member } from '@/types';

/** 取締役以上（取締役 or 代表取締役）。すべてを閲覧できる。 */
export function isDirectorPlus(u?: Member | null): boolean {
  return !!u && (!!u.isDirector || !!u.isRepresentative);
}

/**
 * 実行タスク（決定事項由来）の編集・ステータス変更ができるか。
 * 担当者(who) ＋ 担当部長（対象部署の部長）＋ 取締役（代表取締役含む）のみ。
 * deptOverride に決定事項の部門を渡すと、タスク部門が無い時のフォールバックに使う。
 */
export type ManageActor = { username: string; position?: string | null; departmentId?: string | null; isDirector?: boolean | null; isRepresentative?: boolean | null } | null | undefined;

export function canManageDecisionTask(
  t: { who?: string | null; departmentId?: string | null; createdBy?: string | null },
  u: ManageActor,
  decisionDepartmentId?: string | null,
  opts?: { includeCreator?: boolean },
): boolean {
  if (!u) return false;
  if (u.isDirector || u.isRepresentative) return true;                 // 取締役・代表取締役
  if (t.who && t.who === u.username) return true;     // 担当者
  // 編集は入力者（起案者）も可。削除は includeCreator=false で起案者を除外（担当者・担当部長・取締役のみ）。
  if (opts?.includeCreator !== false && t.createdBy && t.createdBy === u.username) return true; // 入力者（起案者）
  const dept = t.departmentId ?? decisionDepartmentId ?? null; // 担当部署
  if (u.position === 'manager' && u.departmentId && dept === u.departmentId) return true; // 担当部長
  return false;
}

/**
 * 決定事項の編集・削除ができるか。
 * 入力者(起案者=createdBy) ＋ 担当者(assigneeUsername) ＋ 担当部長 ＋ 取締役（代表取締役含む）のみ。
 * 担当部長＝決定の部門の部長。全社通達(departmentId='all')は部門が無いため「担当者の部署の部長」を担当部長とみなす。
 * assigneeDepartmentId に担当者の所属部門を渡すこと（全社通達の担当部長判定用）。
 */
export function canManageDecision(
  d: { createdBy?: string | null; assigneeUsername?: string | null; departmentId?: string | null },
  u: ManageActor,
  assigneeDepartmentId?: string | null,
): boolean {
  if (!u) return false;
  if (u.isDirector || u.isRepresentative) return true;                       // 取締役・代表取締役
  if (d.createdBy && d.createdBy === u.username) return true;                 // 入力者（起案者）
  if (d.assigneeUsername && d.assigneeUsername === u.username) return true;   // 担当者
  const dept = d.departmentId && d.departmentId !== 'all' ? d.departmentId : (assigneeDepartmentId ?? null);
  if (u.position === 'manager' && u.departmentId && dept && dept === u.departmentId) return true; // 担当部長
  return false;
}

/**
 * 個人タスク（Todo）の編集・ステータス変更ができるか。
 * 担当者＝所有者(userId) ＋ 担当部長（所有者の部署の部長）＋ 取締役。
 */
export function canManageTodo(
  todo: { userId?: string | null; departmentId?: string | null },
  u: ManageActor,
  ownerDepartmentId?: string | null,
): boolean {
  if (!u) return false;
  if (u.isDirector || u.isRepresentative) return true;
  if (todo.userId && todo.userId === u.username) return true; // 担当者=所有者
  const dept = todo.departmentId ?? ownerDepartmentId ?? null;
  if (u.position === 'manager' && u.departmentId && dept === u.departmentId) return true;
  return false;
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
