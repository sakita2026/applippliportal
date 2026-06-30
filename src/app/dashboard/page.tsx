'use client';

import { useStore, PRIORITY_LABELS, STATUS_LABELS, COLOR_MAP } from '@/lib/store';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MyWork } from '@/components/MyWork';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { taskVisible, decisionVisible, defaultView } from '@/lib/visibility';
import { jstToday, jstStartOfDayMs, isOverdueDue } from '@/lib/date';

const PRIORITY_COLORS = {
  high: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
  medium: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
};

const STATUS_COLORS = {
  todo: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  in_progress: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
  done: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
};

export default function DashboardPage() {
  const { state } = useStore();
  const me = useCurrentUser();
  const { todos: allTodos, events, decisions } = state;
  // 個人タスクは本人のもの（または共有）だけを対象にする
  const todos = allTodos.filter((t) => t.userId === me?.username || t.isShared);
  const today = jstToday();

  // 表示範囲（/todos・/decisions と同じ既定スコープ：取締役=全体／部長=自部門／社員=自分）
  const view = defaultView(me);
  // 稼働中の決定タスク（自分が見える範囲だけ＝/todos と一致）。アーカイブ済みは除外。
  const activeTasks = decisions
    .filter((d) => d.everApproved && !d.archived)
    .flatMap((d) => d.tasks.filter((t) => !t.pendingEdit && !t.archived && taskVisible(d, t, view, me)));
  // 完了集計用：アーカイブ済みも含む全ての見える決定タスク（完了実績を残すため）。中止(archived)タスクは実績から除外。
  const completedTaskList = decisions
    .filter((d) => d.everApproved)
    .flatMap((d) => d.tasks.filter((t) => !t.pendingEdit && !t.archived && taskVisible(d, t, view, me)));
  // 表示範囲内の決定事項（完了集計はアーカイブ含む／アクティブ判定では別途 !archived で絞る）
  const visibleDecisions = decisions.filter((d) => decisionVisible(d, view, me));

  // 期限超過：実行タスク（個人タスク＋決定タスク）／決定事項。アーカイブ済みは対象外。
  const overdueTaskCount =
    todos.filter((t) => t.status !== 'done' && isOverdueDue(t.dueDate)).length +
    activeTasks.filter((t) => t.status !== 'done' && isOverdueDue(t.whenDue)).length;
  const overdueDecisionCount = visibleDecisions.filter((d) => !d.archived && d.status !== 'done' && isOverdueDue(d.dueDate)).length;

  const overdueIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  const kpiCards = [
    {
      title: '期限超過（タスク）',
      href: '/todos?overdue=1',
      value: overdueTaskCount,
      icon: overdueIcon,
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-500',
      note: '完了予定日の15:00を過ぎると超過になります',
    },
    {
      title: '期限超過（決定事項）',
      href: '/decisions?overdue=1',
      value: overdueDecisionCount,
      icon: overdueIcon,
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-500',
      note: '完了予定日の15:00を過ぎると超過になります',
    },
  ];

  // 完了集計（本日・今週・今月・今年）— 個人タスク＋決定タスクの completedAt を JST 期間でカウント
  const [jy, jm] = today.split('-').map(Number); // today は JST 'YYYY-MM-DD'
  const startOfToday = jstStartOfDayMs(today);
  // 月曜=0 とする JST の曜日
  const dow = (new Date(`${today}T12:00:00+09:00`).getUTCDay() + 6) % 7;
  const startOfWeek = startOfToday - dow * 86400000;
  const startOfMonth = jstStartOfDayMs(`${jy}-${String(jm).padStart(2, '0')}-01`);
  const startOfYear = jstStartOfDayMs(`${jy}-01-01`);
  const completedTimes: number[] = [];
  for (const t of todos) {
    if (t.status === 'done' && t.completedAt) completedTimes.push(new Date(t.completedAt).getTime());
  }
  for (const t of completedTaskList) {
    if (t.status === 'done' && t.completedAt) completedTimes.push(new Date(t.completedAt).getTime());
  }
  const periodCounts = (times: number[]) => [
    { label: '本日', value: times.filter((ms) => ms >= startOfToday).length, period: 'today' },
    { label: '今週', value: times.filter((ms) => ms >= startOfWeek).length, period: 'week' },
    { label: '今月', value: times.filter((ms) => ms >= startOfMonth).length, period: 'month' },
    { label: '今年', value: times.filter((ms) => ms >= startOfYear).length, period: 'year' },
  ];
  const completedCounts = periodCounts(completedTimes);
  // 完了決定事項（status='done' の決定を completedAt で期間集計）
  const completedDecisionTimes: number[] = [];
  for (const d of visibleDecisions) {
    if (d.status === 'done' && d.completedAt) completedDecisionTimes.push(new Date(d.completedAt).getTime());
  }
  const completedDecisionCounts = periodCounts(completedDecisionTimes);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}
        </p>
      </div>

      <MyWork />

      {/* 完了実行タスク（本日・今週・今月・今年） */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">完了実行タスク</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {completedCounts.map((c) => (
            <Link key={c.label} href={`/todos?status=done&period=${c.period}`} className="rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 block" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 完了決定事項（本日・今週・今月・今年） */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">完了決定事項</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {completedDecisionCounts.map((c) => (
            <Link key={c.label} href={`/decisions?status=done&period=${c.period}`} className="rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 block" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* 期限超過（タスク／決定事項） */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {kpiCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 block"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.iconColor} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.title}</p>
            {card.note && <p className="text-[11px] text-rose-500 mt-1 leading-tight">{card.note}</p>}
          </Link>
        ))}
      </div>

    </div>
  );
}
