import type { SegmentOption } from '@/types';

/** 実行管理集計区分コード → 名称（見つからなければコードをそのまま返す。空は null＝未選択） */
export function segmentLabel(code: string | null | undefined, segments: SegmentOption[]): string | null {
  if (!code) return null;
  const found = segments.find((s) => s.code === code);
  return found ? found.label : code;
}

/** プルダウン用：active な区分を sortOrder 順で返す */
export function activeSegments(segments: SegmentOption[]): SegmentOption[] {
  return [...segments].filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}
