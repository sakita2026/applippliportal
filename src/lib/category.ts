import type { CategoryOption } from '@/types';

/** 集計分類コード → 名称（見つからなければコードをそのまま返す。空は「（なし）」扱いで null） */
export function categoryLabel(code: string | null | undefined, categories: CategoryOption[]): string | null {
  if (!code) return null;
  const found = categories.find((c) => c.code === code);
  return found ? found.label : code;
}

/** プルダウン用：active な分類を sortOrder 順で返す */
export function activeCategories(categories: CategoryOption[]): CategoryOption[] {
  return [...categories].filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder);
}
