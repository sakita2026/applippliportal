'use client';

import { useMemo, useState } from 'react';
import { useStore, resolveMemberName, DECISION_STATUS_LABELS, STATUS_LABELS } from '@/lib/store';
import { isOverdueDue } from '@/lib/date';
import { combineDetail } from '@/lib/taskDetail';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function NoticesPage() {
  const { state } = useStore();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpenIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // 全社通達（部門=全員）かつ中止でないもの。承認済み（または完了）＝「決定したこと」。期限切れ・完了でも残す。
  const notices = useMemo(() =>
    state.decisions
      .filter((d) => d.departmentId === 'all' && !d.archived && (d.everApproved || d.status === 'done'))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [state.decisions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">全員通達一覧</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">全社通達（全員対象）の決定事項。期限切れ・完了になっても残し、決めたことを全員で共有・確認できます。</p>
      </div>

      {notices.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-16">全員通達はまだありません</p>
      ) : (
        <div className="space-y-3">
          {notices.map((d) => {
            const open = openIds.has(d.id);
            const done = d.status === 'done';
            const overdue = !done && isOverdueDue(d.dueDate);
            // 中止(archived)タスクは進捗集計から除外
            const activeTasks = d.tasks?.filter((t) => !t.archived) ?? [];
            const doneCount = activeTasks.filter((t) => t.status === 'done').length;
            return (
              <div key={d.id} className="rounded-2xl border p-4 sm:p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <button onClick={() => toggle(d.id)} className="w-full flex items-start gap-2 flex-wrap text-left">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 flex-shrink-0">📢 全員通達</span>
                  <span className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-100">{d.title}</span>
                  {done ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">完了</span>
                    : overdue ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">期限超過</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">{DECISION_STATUS_LABELS[d.status] ?? d.status}</span>}
                  <svg className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>起案: {resolveMemberName(state.members, d.createdBy)}</span>
                  {d.assigneeUsername && <span>担当者: {resolveMemberName(state.members, d.assigneeUsername)}</span>}
                  {d.dueDate && <span className={overdue ? 'text-rose-500 font-medium' : ''}>完了予定: {d.dueDate}{overdue ? '（超過）' : ''}</span>}
                  {d.completedAt && <span>完了日: {format(new Date(d.completedAt), 'yyyy/M/d', { locale: ja })}</span>}
                  {activeTasks.length > 0 && <span>タスク {doneCount}/{activeTasks.length} 完了</span>}
                </div>
                {d.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 break-words whitespace-pre-wrap">{d.description}</p>}
                {open && (d.tasks?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--border-color)' }}>
                    {d.tasks.map((t) => (
                      <div key={t.id} className={`text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 ${t.archived ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`flex-1 min-w-0 truncate ${t.archived || t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{t.what}</span>
                          {t.archived
                            ? <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">🚫 中止中</span>
                            : <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full ${t.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{STATUS_LABELS[t.status] ?? t.status}</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-400">
                          {t.who && <span>担当: {resolveMemberName(state.members, t.who)}</span>}
                          {t.whenDue && <span>完了予定: {t.whenDue}</span>}
                          {combineDetail(t) && <span className="whitespace-pre-wrap">目的・手法詳細: {combineDetail(t)}</span>}
                          {(t.policies?.length ?? 0) > 0 && <span className="text-amber-600">方針: {t.policies!.map((p) => p.policy.name).join('、')}</span>}
                          {(t.projects?.length ?? 0) > 0 && <span className="text-sky-600">PJ: {t.projects!.map((p) => p.project.name).join('、')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
