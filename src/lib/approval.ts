import { fetchDirectory, type WpMember } from '@/lib/directory';

export type EntityType = 'policy' | 'project' | 'decision';
export type ApprovalRow = { approver: string; asDirector: boolean; asManager: boolean };

export async function getMember(username: string | null | undefined): Promise<WpMember | null> {
  if (!username) return null;
  const { members } = await fetchDirectory();
  return members.find((m) => m.username === username && m.active) ?? null;
}

type Ctx = { departmentId?: string | null; boardOnly?: boolean };

/** 担当部署「全員（全社通達）」を表す番兵値 */
export const ALL_DEPT = 'all';
/** 担当部長がいない承認（取締役2名）になる対象＝取締役会限定 or 全社通達 */
function noManagerApproval(ctx: Ctx): boolean {
  return !!ctx.boardOnly || ctx.departmentId === ALL_DEPT;
}

/** 代表取締役は取締役を兼ねる（取締役要件を満たす） */
export function isDirectorLike(member: WpMember): boolean {
  return !!member.isDirector || !!member.isRepresentative;
}

/** 取締役会メンバー = 取締役・代表取締役・顧問 */
export function isBoardMember(member: WpMember): boolean {
  return !!member.isDirector || !!member.isRepresentative || !!member.isAdvisor;
}

/** 承認時に記録する役職フラグ（その対象に対して本人が満たす役割） */
export function roleFlags(
  member: WpMember,
  entityType: EntityType,
  ctx: Ctx,
): { asDirector: boolean; asManager: boolean } {
  const asDirector = isDirectorLike(member);
  // 担当部長 = 対象部署の部長（通常の決定事項のみ。取締役会限定は担当部長不要）
  const asManager =
    entityType === 'decision' &&
    !noManagerApproval(ctx) &&
    member.position === 'manager' &&
    !!ctx.departmentId &&
    member.departmentId === ctx.departmentId;
  return { asDirector, asManager };
}

/** その人がこの対象を承認できるか */
export function canApprove(member: WpMember, entityType: EntityType, ctx: Ctx): boolean {
  if (entityType === 'decision' && !noManagerApproval(ctx)) {
    const f = roleFlags(member, entityType, ctx);
    return f.asDirector || f.asManager;
  }
  // policy / project / 取締役会限定の決定事項 は取締役（代表取締役含む）のみ
  return isDirectorLike(member);
}

/**
 * プロジェクトの作成・編集・削除申請ができるか。
 * 取締役（代表取締役含む）／または担当部長（対象部門の部長＝position=manager かつ自部門一致）のみ。
 */
export function canManageProject(projectDeptId: string | null | undefined, member: WpMember | null | undefined): boolean {
  if (!member) return false;
  if (isDirectorLike(member)) return true;
  if (member.position === 'manager' && member.departmentId && projectDeptId === member.departmentId) return true;
  return false;
}

/** その人がこの種別を新規登録できるか（承認マトリクスの「登録できる人」） */
export function canCreate(member: WpMember, entityType: EntityType): boolean {
  if (entityType === 'policy') return isDirectorLike(member);                          // 取締役のみ（代表取締役含む）
  if (entityType === 'project') return isDirectorLike(member) || member.position === 'manager'; // 部長・取締役
  return true; // decision: 担当部署全員（ログイン者）
}

/** 承認要件を満たしているか */
export function isApproved(entityType: EntityType, rows: ApprovalRow[], ctx: Ctx = {}): boolean {
  if (entityType === 'decision' && !noManagerApproval(ctx)) {
    // 担当部長1名 ＋ 取締役1名（別々の人）
    const managers = rows.filter((r) => r.asManager).map((r) => r.approver);
    const directors = rows.filter((r) => r.asDirector).map((r) => r.approver);
    for (const m of managers) {
      if (directors.some((d) => d !== m)) return true;
    }
    return false;
  }
  // policy / project / 取締役会限定の決定事項: 取締役2名（別々の人）
  const directors = new Set(rows.filter((r) => r.asDirector).map((r) => r.approver));
  return directors.size >= 2;
}

/** 必要承認の表示ラベル */
export function requiredLabel(entityType: EntityType, ctx: Ctx = {}): string {
  if (entityType === 'decision' && !noManagerApproval(ctx)) return '担当部長＋取締役1名';
  return '取締役2名';
}
