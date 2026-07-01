'use client';

type Change = { field: string; before: string; after: string; taskId?: string; detail?: string };

// 1件の「フィールド: 編集前 → 編集後」行
function FieldRow({ c }: { c: Change }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{c.field}:</span>
      <span className="line-through text-rose-400 dark:text-rose-300 break-all">{c.before || '（なし）'}</span>
      <span className="text-slate-400">→</span>
      <span className="text-emerald-700 dark:text-emerald-300 font-medium break-all">{c.after || '（なし）'}</span>
    </div>
  );
}

// editNote（JSON配列）を「編集前 → 編集後」で表示。旧形式（プレーン文字列）はそのまま表示。
// 実行タスクは taskId 単位でグループ化し、複数タスクを編集した場合は全タスク分の差分を個別に表示する。
export function EditDiff({ note }: { note?: string | null }) {
  if (!note) return null;
  let changes: Change[] | null = null;
  try {
    const parsed = JSON.parse(note);
    if (Array.isArray(parsed)) changes = parsed as Change[];
  } catch {
    return <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 inline-block">📝 {note}</p>;
  }
  if (!changes || changes.length === 0) return null;

  const addedTasks = changes.filter((c) => c.field === '追加した実行タスク');
  const grouped = changes.some((c) => c.taskId);

  // 実行タスクごとの編集グループ（名称＋変更フィールド）
  type Group = { name: string; fields: Change[] };
  let groups: Group[] = [];
  let decisionChanges: Change[] = [];

  if (grouped) {
    // 新形式：taskId 単位でグループ化（出現順を維持）
    decisionChanges = changes.filter((c) => !c.taskId && c.field !== '追加した実行タスク' && c.field !== '対象実行タスク');
    const order: string[] = [];
    const map = new Map<string, Change[]>();
    for (const c of changes) {
      if (!c.taskId) continue;
      if (!map.has(c.taskId)) { map.set(c.taskId, []); order.push(c.taskId); }
      map.get(c.taskId)!.push(c);
    }
    groups = order.map((tid) => {
      const arr = map.get(tid)!;
      const header = arr.find((c) => c.field === '対象実行タスク');
      return { name: header?.after || '(名称未設定)', fields: arr.filter((c) => c.field !== '対象実行タスク') };
    });
  } else {
    // 旧形式：単一の「対象実行タスク」＋残り（その1タスクの変更）／無ければ決定本体の変更
    const header = changes.find((c) => c.field === '対象実行タスク');
    const rest = changes.filter((c) => c.field !== '対象実行タスク' && c.field !== '追加した実行タスク');
    if (header) groups = [{ name: header.after || '(名称未設定)', fields: rest }];
    else decisionChanges = rest;
  }

  return (
    <div className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 space-y-1.5 border border-amber-200 dark:border-amber-800">
      <p className="font-bold text-amber-700 dark:text-amber-300">📝 この承認待ちで変更された内容</p>

      {/* 実行タスクの追加（担当/部署/期限も表示） */}
      {addedTasks.map((c, i) => (
        <div key={`add-${i}`} className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold flex-shrink-0">追加</span>
            <span className="text-slate-700 dark:text-slate-200 break-all">新しい実行タスクが追加されました：「<span className="font-bold">{c.after}</span>」</span>
          </div>
          {c.detail && <div className="pl-2 text-slate-500 dark:text-slate-400 break-all">{c.detail}</div>}
        </div>
      ))}

      {/* 決定事項本体の変更 */}
      {decisionChanges.map((c, i) => <FieldRow key={`dec-${i}`} c={c} />)}

      {/* 実行タスクごとの編集（複数タスクはそれぞれ表示） */}
      {groups.map((g, gi) => (
        <div key={`grp-${gi}`} className="space-y-1 pt-1.5 border-t border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold flex-shrink-0">タスク編集</span>
            <span className="text-slate-700 dark:text-slate-200 break-all">実行タスク「<span className="font-bold">{g.name}</span>」</span>
          </div>
          <div className="pl-2 space-y-1">
            {g.fields.length > 0
              ? g.fields.map((c, i) => <FieldRow key={i} c={c} />)
              : <p className="text-slate-500 dark:text-slate-400">内容を編集しました</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
