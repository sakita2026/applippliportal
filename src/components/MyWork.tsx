'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { isOverdueDue } from '@/lib/date';
import { approvalRemaining } from '@/lib/approval';
import type { Decision, Todo } from '@/types';

type LiveTask = { id: string; title: string; due?: string | null; who?: string | null; departmentId?: string | null; status: string; source: 'todo' | 'decision'; decisionTitle?: string; decisionId?: string };
type ApprovalItem = { key: string; title: string; type: '方針' | 'プロジェクト' | '決定事項' | '実行タスク'; action: '承認' | '削除承認' | '中止承認' | '中止解除承認'; href: string; entityType: 'decision' | 'policy' | 'project' | 'decisionTask'; entityId: string; remaining: number; need: string; iApproved?: boolean };
type Pol = { id: string; name: string; status: string; deleteRequested?: boolean; approvals?: { approver: string; createdAt: string }[]; deleteApprovals?: { approver: string; createdAt: string }[] };
type Proj = Pol & { departmentId?: string | null };

export function MyWork() {
  const me = useCurrentUser();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [policies, setPolicies] = useState<Pol[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);

  const load = useCallback(async () => {
    // no-store: 承認直後など最新状態を必ず反映（承認済みが「承認待ち」に残らないように）
    const opt = { cache: 'no-store' as const };
    const [d, t, p, pr] = await Promise.all([
      fetch('/api/decisions', opt).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/todos', opt).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/policies', opt).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/projects', opt).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]);
    setDecisions(d); setTodos(t); setPolicies(p); setProjects(pr);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // 30秒ごとにリアルタイム更新
    return () => clearInterval(id);
  }, [load]);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [approveErr, setApproveErr] = useState<string>('');

  // ダッシュボードからその場で承認（決定事項・方針・プロジェクト共通の /api/approvals）
  const approveItem = useCallback(async (item: ApprovalItem) => {
    if (busyKey) return;
    setBusyKey(item.key); setApproveErr('');
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: item.entityType, entityId: item.entityId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? '承認に失敗しました'); }
      await load();
    } catch (e) {
      setApproveErr(e instanceof Error ? e.message : '承認に失敗しました（時間をおいて再度お試しください）');
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, load]);

  const isDir = !!me?.isDirector || !!me?.isRepresentative;

  const activeTasks: LiveTask[] = useMemo(() =>
    decisions
      .filter((d) => d.everApproved && !d.archived)
      .flatMap((d) => d.tasks.filter((t) => !t.pendingEdit).map((t) => ({
        id: t.id, title: t.what, due: t.whenDue, who: t.who, departmentId: t.departmentId ?? d.departmentId,
        status: t.status, source: 'decision' as const, decisionTitle: d.title, decisionId: d.id,
      }))),
    [decisions]);

  const myTodos: LiveTask[] = useMemo(() =>
    todos.filter((t) => t.userId === me?.username && t.status !== 'done')
      .map((t) => ({ id: t.id, title: t.title, due: t.dueDate, who: t.userId, status: t.status, source: 'todo' as const })),
    [todos, me]);

  // 完了予定日（due）の早い順。未設定は末尾。
  const byDueAsc = (a: LiveTask, b: LiveTask) => {
    const da = a.due || '', db = b.due || '';
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  };

  const myTasks = useMemo(() =>
    [...myTodos, ...activeTasks.filter((t) => t.who === me?.username && t.status !== 'done')].sort(byDueAsc),
    [myTodos, activeTasks, me]);

  const deptTasks = useMemo(() =>
    me?.departmentId ? activeTasks.filter((t) => t.departmentId === me.departmentId && t.status !== 'done').sort(byDueAsc) : [],
    [activeTasks, me]);

  // 取締役会限定：取締役会メンバーは全件、担当部長は「担当者本人 or 担当部門が自部門」のものだけ
  const isBoard = !!me && (!!me.isDirector || !!me.isRepresentative || !!me.isAdvisor || !!me.isAuditor);
  const boardOnlyDecisions = useMemo(() => {
    if (!me) return [];
    const isManager = me.position === 'manager';
    if (!isBoard && !isManager) return [];
    return decisions.filter((d) => {
      if (!d.boardOnly || d.archived) return false;
      if (isBoard) return true;
      // 担当部長：決定事項表示ルールに合致（担当者本人 or 担当部門が自部門）
      const whoMatch = d.tasks.some((t) => t.who === me.username);
      const deptMatch = !!me.departmentId && (d.departmentId === me.departmentId || d.tasks.some((t) => (t.departmentId ?? d.departmentId) === me.departmentId));
      return whoMatch || deptMatch;
    });
  }, [decisions, me, isBoard]);

  // あなたの承認が必要なもの（決定事項・方針・プロジェクト／承認＋削除承認）
  const approvals = useMemo<ApprovalItem[]>(() => {
    if (!me) return [];
    const items: ApprovalItem[] = [];
    const decEligible = (d: Decision) => d.boardOnly ? isDir : (isDir || (me.position === 'manager' && !!d.departmentId && me.departmentId === d.departmentId));
    for (const d of decisions) {
      if (!decEligible(d)) continue;
      const ctx = { departmentId: d.departmentId, boardOnly: d.boardOnly };
      if (d.archived) {
        // 中止済み：中止解除の申請中（deleteRequested）だけ承認待ちに出す（承認先は中止一覧）
        if (d.deleteRequested) {
          const { remaining, need } = approvalRemaining('decision', d.deleteApprovals ?? [], ctx);
          items.push({ key: `d-r-${d.id}`, title: d.title, type: '決定事項', action: '中止解除承認', href: '/cancelled', entityType: 'decision', entityId: d.id, remaining, need, iApproved: !!d.deleteApprovals?.some((a) => a.approver === me.username) });
        }
        continue;
      }
      if (d.status === 'pending') {
        const { remaining, need } = approvalRemaining('decision', d.approvals ?? [], ctx);
        items.push({ key: `d-a-${d.id}`, title: d.title, type: '決定事項', action: '承認', href: `/decisions?dec=${d.id}`, entityType: 'decision', entityId: d.id, remaining, need, iApproved: !!d.approvals?.some((a) => a.approver === me.username) });
      }
      if (d.deleteRequested) {
        const { remaining, need } = approvalRemaining('decision', d.deleteApprovals ?? [], ctx);
        items.push({ key: `d-d-${d.id}`, title: d.title, type: '決定事項', action: '中止承認', href: `/decisions?dec=${d.id}`, entityType: 'decision', entityId: d.id, remaining, need, iApproved: !!d.deleteApprovals?.some((a) => a.approver === me.username) });
      }
    }
    // 実行タスクの中止／中止解除 承認待ち（決定事項と同じ役職構成。承認は対象ページで操作）
    for (const d of decisions) {
      for (const t of d.tasks) {
        if (!t.deleteRequested) continue;
        const tDept = t.departmentId ?? d.departmentId ?? null;
        const noMgr = !!d.boardOnly || tDept === 'all';
        const eligibleTask = noMgr ? isDir : (isDir || (me.position === 'manager' && !!me.departmentId && me.departmentId === tDept));
        if (!eligibleTask) continue;
        const tctx = { departmentId: tDept, boardOnly: d.boardOnly };
        const { remaining, need } = approvalRemaining('decision', t.deleteApprovals ?? [], tctx);
        const isRestore = !!t.archived;
        items.push({
          key: `t-${t.id}`,
          title: `${d.title}：実行タスク「${t.what}」`,
          type: '実行タスク',
          action: isRestore ? '中止解除承認' : '中止承認',
          href: isRestore ? '/cancelled' : `/decisions?dec=${d.id}&task=${t.id}`,
          entityType: 'decisionTask', entityId: t.id, remaining, need,
          iApproved: !!t.deleteApprovals?.some((a) => a.approver === me.username),
        });
      }
    }
    if (isDir) {
      for (const p of policies) {
        if (p.status === 'pending') { const { remaining, need } = approvalRemaining('policy', p.approvals ?? []); items.push({ key: `p-a-${p.id}`, title: p.name, type: '方針', action: '承認', href: '/projects', entityType: 'policy', entityId: p.id, remaining, need, iApproved: !!p.approvals?.some((a) => a.approver === me.username) }); }
        if (p.deleteRequested) { const { remaining, need } = approvalRemaining('policy', p.deleteApprovals ?? []); items.push({ key: `p-d-${p.id}`, title: p.name, type: '方針', action: '削除承認', href: '/projects', entityType: 'policy', entityId: p.id, remaining, need, iApproved: !!p.deleteApprovals?.some((a) => a.approver === me.username) }); }
      }
      for (const pr of projects) {
        if (pr.status === 'pending') { const { remaining, need } = approvalRemaining('project', pr.approvals ?? []); items.push({ key: `pj-a-${pr.id}`, title: pr.name, type: 'プロジェクト', action: '承認', href: '/projects', entityType: 'project', entityId: pr.id, remaining, need, iApproved: !!pr.approvals?.some((a) => a.approver === me.username) }); }
        if (pr.deleteRequested) { const { remaining, need } = approvalRemaining('project', pr.deleteApprovals ?? []); items.push({ key: `pj-d-${pr.id}`, title: pr.name, type: 'プロジェクト', action: '削除承認', href: '/projects', entityType: 'project', entityId: pr.id, remaining, need, iApproved: !!pr.deleteApprovals?.some((a) => a.approver === me.username) }); }
      }
    }
    return items;
  }, [decisions, policies, projects, me, isDir]);

  const isOverdue = (due?: string | null) => isOverdueDue(due);

  const TYPE_BADGE: Record<string, string> = {
    '方針': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600',
    'プロジェクト': 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    '決定事項': 'bg-violet-50 dark:bg-violet-900/20 text-violet-600',
    '実行タスク': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
  };

  const Section = ({ title, count, accent, href, children }: { title: string; count: number; accent: string; href: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent}`} />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{title}</h3>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400'}`}>{count}件</span>
        </div>
        <Link href={href} className="text-xs text-indigo-500 hover:text-indigo-600">すべて見る →</Link>
      </div>
      <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border-color)' }}>{children}</div>
    </div>
  );

  const TaskRow = ({ t }: { t: LiveTask }) => (
    // 行クリックで対象を開く（決定事項由来＝決定事項ページ／通常タスク＝実行タスクページ）
    <Link href={t.source === 'decision' ? `/decisions?dec=${t.decisionId}&task=${t.id}` : `/todos?todo=${t.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'in_progress' ? 'bg-indigo-400' : 'bg-slate-300'}`} />
      <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
      {t.source === 'decision' && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/20 text-sky-600 flex-shrink-0">決定</span>}
      {t.due && <span className={`text-xs flex-shrink-0 ${isOverdue(t.due) ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>{isOverdue(t.due) ? '⚠ ' : ''}{t.due.slice(5)}</span>}
    </Link>
  );

  if (!me) return null;

  return (
    <div className="space-y-3">
      {/* 1段目: あなたの承認待ち（全幅） */}
      <Section title="あなたの承認待ち" count={approvals.length} accent="bg-indigo-500" href="/decisions?status=pending">
          {approveErr && <p className="px-5 py-2 text-xs text-rose-600 dark:text-rose-400">{approveErr}</p>}
          {approvals.length === 0 ? <p className="text-center text-xs text-slate-400 py-6">承認待ちなし</p> : (<>
            {approvals.slice(0, 10).map((a) => (
            <div key={a.key} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[a.type]}`}>{a.type}</span>
              <Link href={a.href} className="flex-1 text-slate-700 dark:text-slate-200 truncate hover:underline">{a.title}</Link>
              {a.iApproved
                ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓{a.action === '削除承認' ? '削除' : a.action === '中止承認' ? '中止' : a.action === '中止解除承認' ? '中止解除' : ''}承認済{a.remaining > 0 ? `・あと${a.remaining}名${a.need ? `（${a.need}）` : ''}` : ''}</span>
                : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">あと{a.remaining}名{a.need ? `（${a.need}）` : ''}</span>}
              {a.action === '承認' && !a.iApproved ? (
                <button onClick={() => approveItem(a)} disabled={busyKey === a.key}
                  className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60 transition-colors">
                  {busyKey === a.key ? '承認中…' : '承認する'}
                </button>
              ) : (
                <Link href={a.href} className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.action === '削除承認' || a.action === '中止承認' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : a.action === '中止解除承認' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'}`}>{a.action === '削除承認' ? '削除承認 →' : a.action === '中止承認' ? '中止承認 →' : a.action === '中止解除承認' ? '中止解除を承認 →' : '確認 →'}</Link>
              )}
            </div>
            ))}
            {approvals.length > 10 && <Link href="/decisions?status=pending" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{approvals.length - 10}件 — すべて見る →</Link>}
          </>)}
        </Section>
      {/* 2段目: 自分の未完了・自部門の未完了 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="自分の未完了タスク" count={myTasks.length} accent="bg-indigo-500" href="/todos?status=incomplete&view=mine&fv=mine">
          {myTasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-5xl leading-none animate-bounce inline-block" role="img" aria-label="全タスク制覇">🏆</div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">全タスク制覇！</p>
            </div>
          ) : (<>
            {myTasks.slice(0, 10).map((t) => <TaskRow key={`${t.source}-${t.id}`} t={t} />)}
            {myTasks.length > 10 && <Link href="/todos?status=incomplete&view=mine&fv=mine" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{myTasks.length - 10}件 — すべて見る →</Link>}
          </>)}
        </Section>
        <Section title="自部門の未完了タスク" count={deptTasks.length} accent="bg-violet-500" href="/todos?status=incomplete&view=dept">
          {deptTasks.length === 0 ? <p className="text-center text-xs text-slate-400 py-6">未完了なし</p> : (<>
            {deptTasks.slice(0, 10).map((t) => <TaskRow key={t.id} t={t} />)}
            {deptTasks.length > 10 && <Link href="/todos?status=incomplete&view=dept" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{deptTasks.length - 10}件 — すべて見る →</Link>}
          </>)}
        </Section>
      </div>
      {/* 3段目: 取締役会限定（自部門の未完了タスクの下・取締役会メンバー＋該当する担当部長のみ・該当0件なら非表示） */}
      {boardOnlyDecisions.length > 0 && (
        <Section title="取締役会限定" count={boardOnlyDecisions.length} accent="bg-rose-500" href="/decisions?board=1">
          {boardOnlyDecisions.slice(0, 10).map((d) => {
            const open = d.tasks.filter((t) => t.status !== 'done').length;
            return (
              <Link key={d.id} href={`/decisions?dec=${d.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800">🔒 限定</span>
                <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{d.title}</span>
                {open > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">未完了{open}件</span>}
                {d.status === 'pending' && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">承認待ち</span>}
              </Link>
            );
          })}
          {boardOnlyDecisions.length > 10 && <Link href="/decisions?board=1" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{boardOnlyDecisions.length - 10}件 — すべて見る →</Link>}
        </Section>
      )}
    </div>
  );
}
