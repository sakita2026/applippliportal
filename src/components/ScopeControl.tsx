'use client';

import type { Member, Department } from '@/types';
import { isDirectorPlus, type View } from '@/lib/visibility';

/**
 * 表示範囲コントロール。
 *  - 取締役以上: 「全体／自分／各部門」を選べるドロップダウン（全体・部門でソート）
 *  - それ以外: 「自分／自部門」トグルのみ（他人の項目は閲覧不可）
 */
export function ScopeControl({
  view, setView, user, departments,
}: { view: View; setView: (v: View) => void; user: Member | null; departments: Department[] }) {
  if (isDirectorPlus(user)) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">表示:</span>
        <select value={view} onChange={(e) => setView(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          style={{ borderColor: 'var(--border-color)' }}>
          <option value="all">全体</option>
          <option value="mine">自分</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">表示範囲:</span>
      <div className="flex gap-1.5">
        {([['mine', '自分'], ['dept', '自部門']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === k ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
