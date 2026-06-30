// 「どこで・なぜ・どうやって」を1つの自由記述（目的・手法詳細など）に統合して扱う。
// 既存データ（3項目に分かれて格納）は、各データの末尾に半角スペース3つを空けて結合して表示・編集する。

const SEP = '   '; // 半角スペース3つ

/** whereLoc / why / how を結合した1つのテキストにする（空のものは除外）。 */
export function combineDetail(t: { whereLoc?: string | null; why?: string | null; how?: string | null }): string {
  return [t.whereLoc, t.why, t.how]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
    .join(SEP);
}
