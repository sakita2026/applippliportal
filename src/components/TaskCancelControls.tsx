'use client';

import { useState } from 'react';
import type { DecisionTask } from '@/types';
import { useStore } from '@/lib/store';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { canManageDecisionTask } from '@/lib/visibility';
import { approvalRemaining } from '@/lib/approval';

/**
 * 実行タスクの「中止 / 中止解除」操作（決定事項の中止と同じ2名承認ルール）。
 * - 通常タスク      … 「中止」申請ボタン（起案者・担当者・担当部長・取締役）
 * - 中止申請中      … 「中止を承認」(担当部長/取締役) ＋「取り下げ」、進捗「あと◯名」
 * - 中止中(archived)… 「中止解除」申請（担当者・担当部長・取締役）／申請中は「中止解除を承認」＋「取り下げ」
 */
export function TaskCancelControls({
  task,
  decisionDepartmentId,
  boardOnly,
}: {
  task: DecisionTask;
  decisionDepartmentId?: string | null;
  boardOnly?: boolean;
}) {
  const { requestCancelTask, undoRequestCancelTask } = useStore();
  const me = useCurrentUser();
  const [busy, setBusy] = useState(false);

  const isDir = !!me?.isDirector || !!me?.isRepresentative;
  const auditor = !!me?.isAuditor; // 監査役は中止・中止解除・承認のいずれも不可（閲覧のみ）
  const deptCtx = task.departmentId ?? decisionDepartmentId ?? null;
  const noMgr = !!boardOnly || deptCtx === 'all';
  // 承認できる人（＝担当部長 or 取締役）。全社通達・取締役会限定は取締役のみ。監査役は不可。
  const eligible = !auditor && !!me && (noMgr ? isDir : (isDir || (me.position === 'manager' && !!me.departmentId && me.departmentId === deptCtx)));
  // 申請できる人：中止＝起案者・担当者・担当部長・取締役／中止解除＝担当者・担当部長・取締役（起案者除外）。監査役は不可。
  const canRequestCancel = !auditor && canManageDecisionTask(task, me, decisionDepartmentId, { includeCreator: true });
  const canRequestRestore = !auditor && canManageDecisionTask(task, me, decisionDepartmentId, { includeCreator: false });

  const approvals = task.deleteApprovals ?? [];
  const iApproved = !!me && approvals.some((a) => a.approver === me.username);
  const { remaining, need } = approvalRemaining('decision', approvals, { departmentId: deptCtx, boardOnly });

  const act = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); await fn().catch(() => null); setBusy(false); };
  const confirmReq = (msg: string) => window.confirm(msg);

  const reqLabel = noMgr ? '取締役2名' : '担当部長＋取締役1名';

  // ── 中止中（archived）＝中止解除フロー ──
  if (task.archived) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-medium">🚫 中止中</span>
        {task.deleteRequested ? (
          <>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600">中止解除 承認待ち{remaining > 0 ? `・あと${remaining}名${need ? `（${need}）` : ''}` : ''}</span>
            {eligible && !iApproved && (
              <button onClick={() => act(() => requestCancelTask(task.id))} disabled={busy}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60">中止解除を承認</button>
            )}
            {iApproved && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓承認済</span>}
            {canRequestRestore && (
              <button onClick={() => act(() => undoRequestCancelTask(task.id))} disabled={busy}
                className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取り下げ</button>
            )}
          </>
        ) : canRequestRestore && (
          <button onClick={() => act(() => { if (!confirmReq(`この実行タスクの中止を解除しますか？（中止解除には ${reqLabel} の承認が必要です）`)) return Promise.resolve(); return requestCancelTask(task.id); })} disabled={busy}
            className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-600 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">中止解除（元に戻す）</button>
        )}
      </span>
    );
  }

  // ── 中止申請中（未 archived）＝中止フロー ──
  if (task.deleteRequested) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600">中止 承認待ち{remaining > 0 ? `・あと${remaining}名${need ? `（${need}）` : ''}` : ''}</span>
        {eligible && !iApproved && (
          <button onClick={() => act(() => requestCancelTask(task.id))} disabled={busy}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60">中止を承認</button>
        )}
        {iApproved && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓承認済</span>}
        {canRequestCancel && (
          <button onClick={() => act(() => undoRequestCancelTask(task.id))} disabled={busy}
            className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取り下げ</button>
        )}
      </span>
    );
  }

  // ── 通常＝中止申請ボタン ──
  if (!canRequestCancel) return null;
  return (
    <button onClick={() => act(() => { if (!confirmReq(`この実行タスクを中止申請しますか？（中止には ${reqLabel} の承認が必要です。完了済みなら完了のまま保持されます）`)) return Promise.resolve(); return requestCancelTask(task.id); })} disabled={busy}
      className="px-2 py-1 rounded-lg text-xs font-medium text-rose-500 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="中止を申請">中止</button>
  );
}
