'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/useCurrentUser';
import type { Decision, Todo } from '@/types';

type LiveTask = { id: string; title: string; due?: string | null; who?: string | null; departmentId?: string | null; status: string; source: 'todo' | 'decision'; decisionTitle?: string; decisionId?: string };
type ApprovalItem = { key: string; title: string; type: '方針' | 'プロジェクト' | '決定事項'; action: '承認' | '削除承認'; href: string; entityType: 'decision' | 'policy' | 'project'; entityId: string; approved?: number; required?: number; iApproved?: boolean };
type Pol = { id: string; name: string; status: string; deleteRequested?: boolean; approvals?: { approver: string; createdAt: string }[]; deleteApprovals?: { approver: string; createdAt: string }[] };
type Proj = Pol & { departmentId?: string | null };

export function MyWork() {
  const me = useCurrentUser();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [policies, setPolicies] = useState<Pol[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  const load = useCallback(async () => {
    const [d, t, p, pr] = await Promise.all([
      fetch('/api/decisions').then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/todos').then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/policies').then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/projects').then((r) => r.ok ? r.json() : []).catch(() => []),
    ]);
    setDecisions(d); setTodos(t); setPolicies(p); setProjects(pr);
    setUpdatedAt(new Date().toLocaleTimeString('ja-JP'));
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
      .filter((d) => d.everApproved)
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
  const isBoard = !!me && (!!me.isDirector || !!me.isRepresentative || !!me.isAdvisor);
  const boardOnlyDecisions = useMemo(() => {
    if (!me) return [];
    const isManager = me.position === 'manager';
    if (!isBoard && !isManager) return [];
    return decisions.filter((d) => {
      if (!d.boardOnly) return false;
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
      if (decEligible(d)) {
        if (d.status === 'pending') {
          const approved = d.approvals?.length ?? 0;
          const iApproved = !!d.approvals?.some((a) => a.approver === me.username);
          items.push({ key: `d-a-${d.id}`, title: d.title, type: '決定事項', action: '承認', href: `/decisions?dec=${d.id}`, entityType: 'decision', entityId: d.id, approved, required: 2, iApproved });
        }
        if (d.deleteRequested) items.push({ key: `d-d-${d.id}`, title: d.title, type: '決定事項', action: '削除承認', href: `/decisions?dec=${d.id}`, entityType: 'decision', entityId: d.id, approved: d.deleteApprovals?.length ?? 0, required: 2, iApproved: !!d.deleteApprovals?.some((a) => a.approver === me.username) });
      }
    }
    if (isDir) {
      for (const p of policies) {
        if (p.status === 'pending') items.push({ key: `p-a-${p.id}`, title: p.name, type: '方針', action: '承認', href: '/projects', entityType: 'policy', entityId: p.id, approved: p.approvals?.length ?? 0, required: 2, iApproved: !!p.approvals?.some((a) => a.approver === me.username) });
        if (p.deleteRequested) items.push({ key: `p-d-${p.id}`, title: p.name, type: '方針', action: '削除承認', href: '/projects', entityType: 'policy', entityId: p.id, approved: p.deleteApprovals?.length ?? 0, required: 2, iApproved: !!p.deleteApprovals?.some((a) => a.approver === me.username) });
      }
      for (const pr of projects) {
        if (pr.status === 'pending') items.push({ key: `pj-a-${pr.id}`, title: pr.name, type: 'プロジェクト', action: '承認', href: '/projects', entityType: 'project', entityId: pr.id, approved: pr.approvals?.length ?? 0, required: 2, iApproved: !!pr.approvals?.some((a) => a.approver === me.username) });
        if (pr.deleteRequested) items.push({ key: `pj-d-${pr.id}`, title: pr.name, type: 'プロジェクト', action: '削除承認', href: '/projects', entityType: 'project', entityId: pr.id, approved: pr.deleteApprovals?.length ?? 0, required: 2, iApproved: !!pr.deleteApprovals?.some((a) => a.approver === me.username) });
      }
    }
    return items;
  }, [decisions, policies, projects, me, isDir]);

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = (due?: string | null) => due && due < today;

  const TYPE_BADGE: Record<string, string> = {
    '方針': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    'プロジェクト': 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
    '決定事項': 'bg-violet-50 dark:bg-violet-900/20 text-violet-600',
  };

  const Section = ({ title, count, accent, href, children }: { title: string; count: number; accent: string; href: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent}`} />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{title}</h3>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-400'}`}>{count}件</span>
        </div>
        <Link href={href} className="text-xs text-indigo-500 hover:text-indigo-600">すべて見る →</Link>
      </div>
      <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border-color)' }}>{children}</div>
    </div>
  );

  const TaskRow = ({ t }: { t: LiveTask }) => (
    // 行クリックで対象を開く（決定事項由来＝決定事項ページ／通常タスク＝実行タスクページ）
    <Link href={t.source === 'decision' ? `/decisions?dec=${t.decisionId}&task=${t.id}` : `/todos?todo=${t.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
      <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
      {t.source === 'decision' && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/20 text-sky-600 flex-shrink-0">決定</span>}
      {t.due && <span className={`text-xs flex-shrink-0 ${isOverdue(t.due) ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>{isOverdue(t.due) ? '⚠ ' : ''}{t.due.slice(5)}</span>}
    </Link>
  );

  if (!me) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">今日やること（リアルタイム）</h2>
        {updatedAt && <span className="text-xs text-slate-400">更新 {updatedAt}・30秒ごと自動更新</span>}
      </div>
      {/* 1段目: あなたの承認待ち（左）＋取締役会限定（右・該当時のみ） */}
      <div className={`grid grid-cols-1 gap-4 ${boardOnlyDecisions.length > 0 ? 'lg:grid-cols-2' : ''}`}>
        <Section title="あなたの承認待ち" count={approvals.length} accent="bg-amber-500" href="/decisions?status=pending">
          {approveErr && <p className="px-5 py-2 text-xs text-rose-600 dark:text-rose-400">{approveErr}</p>}
          {approvals.length === 0 ? <p className="text-center text-xs text-slate-400 py-6">承認待ちなし</p> : (<>
            {approvals.slice(0, 10).map((a) => (
            <div key={a.key} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[a.type]}`}>{a.type}</span>
              <Link href={a.href} className="flex-1 text-slate-700 dark:text-slate-200 truncate hover:underline">{a.title}</Link>
              {a.required != null && (
                a.iApproved
                  ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓{a.action === '削除承認' ? '削除' : ''}承認済・あと{Math.max(0, a.required - (a.approved ?? 0))}名</span>
                  : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">{a.approved ?? 0}/{a.required}・あと{Math.max(0, a.required - (a.approved ?? 0))}名</span>
              )}
              {a.action === '承認' && !a.iApproved ? (
                <button onClick={() => approveItem(a)} disabled={busyKey === a.key}
                  className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                  {busyKey === a.key ? '承認中…' : '承認する'}
                </button>
              ) : (
                <Link href={a.href} className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${a.action === '削除承認' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>{a.action === '削除承認' ? '削除承認 →' : '確認 →'}</Link>
              )}
            </div>
            ))}
            {approvals.length > 10 && <Link href="/decisions?status=pending" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{approvals.length - 10}件 — すべて見る →</Link>}
          </>)}
        </Section>
        {/* 取締役会限定（取締役会メンバー＋該当する担当部長のみ・該当0件なら非表示） */}
        {boardOnlyDecisions.length > 0 && (
          <Section title="取締役会限定" count={boardOnlyDecisions.length} accent="bg-rose-500" href="/decisions?board=1">
            {boardOnlyDecisions.slice(0, 10).map((d) => {
              const open = d.tasks.filter((t) => t.status !== 'done').length;
              return (
                <Link key={d.id} href={`/decisions?dec=${d.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800">🔒 限定</span>
                  <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{d.title}</span>
                  {open > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">未完了{open}件</span>}
                  {d.status === 'pending' && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">承認待ち</span>}
                </Link>
              );
            })}
            {boardOnlyDecisions.length > 10 && <Link href="/decisions?board=1" className="block text-center text-xs text-indigo-500 hover:text-indigo-600 py-2">他{boardOnlyDecisions.length - 10}件 — すべて見る →</Link>}
          </Section>
        )}
      </div>
      {/* 2段目: 自分の未完了・自部門の未完了 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="自分の未完了タスク" count={myTasks.length} accent="bg-indigo-500" href="/todos?status=incomplete&view=mine&fv=mine">
          {myTasks.length === 0 ? <p className="text-center text-xs text-slate-400 py-6">未完了なし 🎉</p> : (<>
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
    </div>
  );
}
