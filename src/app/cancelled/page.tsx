'use client';

import { useMemo, useState } from 'react';
import { useStore, resolveMemberName, DECISION_STATUS_LABELS, STATUS_LABELS } from '@/lib/store';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { isDirectorPlus, type ManageActor } from '@/lib/visibility';
import { approvalRemaining } from '@/lib/approval';
import { getDepartmentName } from '@/lib/departments';
import { combineDetail } from '@/lib/taskDetail';
import { TaskCancelControls } from '@/components/TaskCancelControls';
import type { Decision } from '@/types';

export default function CancelledPage() {
  const { state, requestDeleteDecision, cancelDeleteDecision } = useStore();
  const me = useCurrentUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [openTasks, setOpenTasks] = useState<Set<string>>(new Set());
  const toggleTask = (id: string) => setOpenTasks((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const isDir = isDirectorPlus(me);
  const deptOf = (username?: string | null) => username ? (state.members.find((m) => m.username === username)?.departmentId ?? null) : null;

  // 自分に関係するか（承認履歴と同ルール）：起案者・担当者・タスク担当(who)・担当部署の部長・承認者。取締役以上は全件。
  const involved = (d: Decision): boolean => {
    if (!me) return false;
    if (isDir || me.isAuditor) return true; // 取締役・監査役は全件閲覧
    if (d.createdBy === me.username) return true;
    if (d.assigneeUsername === me.username) return true;
    if (d.tasks?.some((t) => t.who === me.username)) return true;
    if ((d.approvals ?? []).some((a) => a.approver === me.username)) return true;
    if ((d.deleteApprovals ?? []).some((a) => a.approver === me.username)) return true;
    if (me.position === 'manager' && me.departmentId) {
      const dept = d.departmentId && d.departmentId !== 'all' ? d.departmentId : deptOf(d.assigneeUsername);
      if (dept === me.departmentId) return true;
      if (d.tasks?.some((t) => (t.departmentId ?? d.departmentId) === me.departmentId)) return true;
    }
    return false;
  };

  const cancelledList = useMemo(
    () => state.decisions.filter((d) => d.archived && involved(d)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [state.decisions, me], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 個別に中止された実行タスク（親決定は中止されていないもの）。決定ごと中止は上の一覧に含まれる。
  const cancelledTasks = useMemo(() => {
    const out: { d: Decision; t: Decision['tasks'][number] }[] = [];
    for (const d of state.decisions) {
      if (d.archived || !involved(d)) continue;
      for (const t of d.tasks ?? []) if (t.archived) out.push({ d, t });
    }
    return out.sort((a, b) => (b.t.createdAt ?? '').localeCompare(a.t.createdAt ?? ''));
  }, [state.decisions, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const doRestoreRequest = async (d: Decision) => {
    if (busy) return; setBusy(d.id); setErr('');
    try { await requestDeleteDecision(d); } catch (e) { setErr(e instanceof Error ? e.message : '操作に失敗しました'); } finally { setBusy(null); }
  };
  const doRestoreCancel = async (d: Decision) => {
    if (busy) return; setBusy(d.id); setErr('');
    try { await cancelDeleteDecision(d); } catch (e) { setErr(e instanceof Error ? e.message : '操作に失敗しました'); } finally { setBusy(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">中止一覧</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">中止した決定事項と紐づく実行タスク。完了済みタスクは完了のまま保持されます。「元に戻す」は担当者・担当部長・取締役が申請し、担当部長＋取締役の承認で復活します。</p>
      </div>
      {err && <p className="text-sm text-rose-500">{err}</p>}
      {cancelledList.length === 0 && cancelledTasks.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-16">中止した決定事項・実行タスクはありません</p>
      ) : (
        <div className="space-y-6">
        {cancelledList.length > 0 && (
        <div className="space-y-3">
          {cancelledList.map((d) => {
            const noManager = d.boardOnly || d.departmentId === 'all';
            const assigneeDept = d.departmentId && d.departmentId !== 'all' ? d.departmentId : deptOf(d.assigneeUsername);
            const u = me as ManageActor;
            const isDeptMgr = !!u && u.position === 'manager' && !!u.departmentId && assigneeDept === u.departmentId;
            const canInitiate = isDir || (!!d.assigneeUsername && d.assigneeUsername === me?.username) || isDeptMgr; // 中止解除を申請できる
            const canApprove = noManager ? isDir : (isDir || isDeptMgr); // 中止解除を承認できる
            const restoreRows = d.deleteApprovals ?? [];
            const iApproved = !!me && restoreRows.some((a) => a.approver === me.username);
            const { remaining, need } = approvalRemaining('decision', restoreRows, { departmentId: d.departmentId, boardOnly: d.boardOnly });
            const deptName = d.departmentId === 'all' ? '全員（通達）' : d.departmentId ? getDepartmentName(d.departmentId, state.departments) : '—';
            const doneCount = d.tasks?.filter((t) => t.status === 'done').length ?? 0;
            return (
              <div key={d.id} className="rounded-2xl border p-4 sm:p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 flex-shrink-0">🚫 中止</span>
                  <span className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-100">{d.title}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{DECISION_STATUS_LABELS[d.status] ?? d.status}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>担当（部署）: {deptName}</span>
                  {d.assigneeUsername && <span>担当者: {resolveMemberName(state.members, d.assigneeUsername)}</span>}
                  <span>起案: {resolveMemberName(state.members, d.createdBy)}</span>
                  <span>タスク {doneCount}/{d.tasks?.length ?? 0} 完了</span>
                </div>
                {(d.tasks?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    {d.tasks.map((t) => {
                      const open = openTasks.has(t.id);
                      return (
                        <div key={t.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
                          <button onClick={() => toggleTask(t.id)} className="w-full flex items-center gap-2 text-xs px-2 py-1.5 text-left">
                            <svg className={`w-3 h-3 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span className={`flex-1 min-w-0 truncate ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{t.what}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full ${t.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{STATUS_LABELS[t.status] ?? t.status}{t.status === 'done' && t.completedAt ? '（保持）' : ''}</span>
                          </button>
                          {open && (
                            <dl className="px-6 pb-2 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {t.who && (<><dt>担当(誰が)</dt><dd className="text-slate-700 dark:text-slate-200">{resolveMemberName(state.members, t.who)}</dd></>)}
                              {t.startDate && (<><dt>開始日</dt><dd className="text-slate-700 dark:text-slate-200">{t.startDate}</dd></>)}
                              {t.whenDue && (<><dt>完了予定日</dt><dd className="text-slate-700 dark:text-slate-200">{t.whenDue}</dd></>)}
                              {combineDetail(t) && (<><dt>目的・手法詳細</dt><dd className="text-slate-700 dark:text-slate-200 break-words whitespace-pre-wrap">{combineDetail(t)}</dd></>)}
                              {(t.policies?.length ?? 0) > 0 && (<><dt>方針</dt><dd className="text-amber-700 dark:text-amber-300">{t.policies!.map((p) => p.policy.name).join('、')}</dd></>)}
                              {(t.projects?.length ?? 0) > 0 && (<><dt>プロジェクト</dt><dd className="text-sky-700 dark:text-sky-300">{t.projects!.map((p) => p.project.name).join('、')}</dd></>)}
                              {t.createdBy && (<><dt>実行タスク作成者</dt><dd className="text-slate-700 dark:text-slate-200">{resolveMemberName(state.members, t.createdBy)}</dd></>)}
                              <dt className="col-span-2 pt-1 text-rose-500">※中止中のため閲覧のみ（編集不可）</dt>
                            </dl>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {d.deleteRequested ? (
                    <>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">中止解除 承認待ち{remaining > 0 ? `・あと${remaining}名${need ? `（${need}）` : ''}` : ''}</span>
                      {canApprove && !iApproved && <button onClick={() => doRestoreRequest(d)} disabled={busy === d.id} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60">中止解除を承認</button>}
                      {iApproved && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓承認済</span>}
                      {canInitiate && <button onClick={() => doRestoreCancel(d)} disabled={busy === d.id} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取消</button>}
                    </>
                  ) : canInitiate ? (
                    <button onClick={() => doRestoreRequest(d)} disabled={busy === d.id} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60">元に戻す（中止解除を申請）</button>
                  ) : (
                    <span className="text-xs text-slate-400">中止解除は担当者・担当部長・取締役が申請できます</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* 個別に中止された実行タスク（親決定は稼働中） */}
        {cancelledTasks.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-2">中止された実行タスク</h2>
            <div className="space-y-2">
              {cancelledTasks.map(({ d, t }) => {
                const open = openTasks.has(t.id);
                return (
                  <div key={t.id} className="rounded-2xl border p-3 sm:p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 flex-shrink-0">🚫 中止タスク</span>
                      <span className="flex-1 min-w-0 font-medium text-slate-700 dark:text-slate-200 line-through">{t.what}</span>
                      <TaskCancelControls task={t} decisionDepartmentId={d.departmentId} boardOnly={d.boardOnly} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      決定事項: <span className="text-slate-700 dark:text-slate-300">{d.title}</span>
                      {t.who && <span className="ml-3">担当: {resolveMemberName(state.members, t.who)}</span>}
                    </div>
                    <button onClick={() => toggleTask(t.id)} className="mt-1 text-xs text-indigo-500 hover:underline">{open ? '内容を閉じる' : '内容を表示'}</button>
                    {open && (
                      <dl className="mt-1 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.startDate && (<><dt>開始日</dt><dd className="text-slate-700 dark:text-slate-200">{t.startDate}</dd></>)}
                        {t.whenDue && (<><dt>完了予定日</dt><dd className="text-slate-700 dark:text-slate-200">{t.whenDue}</dd></>)}
                        {combineDetail(t) && (<><dt>目的・手法詳細</dt><dd className="text-slate-700 dark:text-slate-200 break-words whitespace-pre-wrap">{combineDetail(t)}</dd></>)}
                        {(t.policies?.length ?? 0) > 0 && (<><dt>方針</dt><dd className="text-amber-700 dark:text-amber-300">{t.policies!.map((p) => p.policy.name).join('、')}</dd></>)}
                        {(t.projects?.length ?? 0) > 0 && (<><dt>プロジェクト</dt><dd className="text-sky-700 dark:text-sky-300">{t.projects!.map((p) => p.project.name).join('、')}</dd></>)}
                        <dt className="col-span-2 pt-1 text-rose-500">※中止中のため閲覧のみ（中止解除すると編集できます）</dt>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
