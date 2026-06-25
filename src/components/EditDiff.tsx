'use client';

type Change = { field: string; before: string; after: string };

// editNote（JSON配列）を「編集前 → 編集後」で表示。旧形式（プレーン文字列）はそのまま表示。
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
  const taskTarget = changes.find((c) => c.field === '対象実行タスク');     // 実行タスクの編集
  const addedTasks = changes.filter((c) => c.field === '追加した実行タスク'); // 実行タスクの追加
  const rest = changes.filter((c) => c.field !== '対象実行タスク' && c.field !== '追加した実行タスク');
  return (
    <div className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 space-y-1.5 border border-amber-200 dark:border-amber-800">
      <p className="font-bold text-amber-700 dark:text-amber-300">📝 この承認待ちで変更された内容</p>

      {/* 実行タスクの追加 */}
      {addedTasks.map((c, i) => (
        <div key={`add-${i}`} className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold flex-shrink-0">追加</span>
          <span className="text-slate-700 dark:text-slate-200 break-all">新しい実行タスクが追加されました：「<span className="font-bold">{c.after}</span>」</span>
        </div>
      ))}

      {/* 実行タスクの編集 */}
      {taskTarget && (
        <div className="flex items-center gap-1.5 pb-1 border-b border-amber-200 dark:border-amber-800">
          <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold flex-shrink-0">タスク編集</span>
          <span className="text-slate-700 dark:text-slate-200 break-all">実行タスク「<span className="font-bold">{taskTarget.after}</span>」が編集されました</span>
        </div>
      )}

      {/* フィールドごとの 編集前→編集後 */}
      {rest.map((c, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{c.field}:</span>
          <span className="line-through text-rose-400 dark:text-rose-300 break-all">{c.before || '（なし）'}</span>
          <span className="text-slate-400">→</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-medium break-all">{c.after || '（なし）'}</span>
        </div>
      ))}
    </div>
  );
}
