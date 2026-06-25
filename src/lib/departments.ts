/**
 * 部門マスタの既定値。
 * DB の Department テーブルが正本だが、シード元 & DB が空のときの UI フォールバックとして使う。
 */
export type Department = {
  id: string
  name: string
  sortOrder: number
}

// 取締役・代表取締役は「役職（チェックボックス）」で表現するため部門には含めない
export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'management', name: '管理部', sortOrder: 3 },
  { id: 'sales', name: '営業部', sortOrder: 4 },
  { id: 'tech', name: '技術部', sortOrder: 5 },
  { id: 'tech-strategy', name: '技術戦略室', sortOrder: 6 },
]

export function getDepartmentName(
  id: string | null | undefined,
  departments: Department[] = DEFAULT_DEPARTMENTS,
): string {
  if (!id) return '未設定'
  return departments.find((d) => d.id === id)?.name ?? '未設定'
}
