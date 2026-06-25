'use client';

import { useStore, PRIORITY_LABELS, STATUS_LABELS, COLOR_MAP } from '@/lib/store';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MyWork } from '@/components/MyWork';
import { useCurrentUser } from '@/lib/useCurrentUser';

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
  const today = new Date().toISOString().split('T')[0];

  // 稼働中の決定タスク
  const activeTasks = decisions
    .filter((d) => d.everApproved)
    .flatMap((d) => d.tasks.filter((t) => !t.pendingEdit));

  // 期限超過：実行タスク（個人タスク＋決定タスク）／決定事項
  const overdueTaskCount =
    todos.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length +
    activeTasks.filter((t) => t.status !== 'done' && t.whenDue && t.whenDue < today).length;
  const overdueDecisionCount = decisions.filter((d) => d.status !== 'done' && d.dueDate && d.dueDate < today).length;

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
    },
    {
      title: '期限超過（決定事項）',
      href: '/decisions?overdue=1',
      value: overdueDecisionCount,
      icon: overdueIcon,
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-500',
    },
  ];

  // 完了集計（本日・今週・今月・今年）— 個人タスク＋決定タスクの completedAt を期間でカウント
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dow = (now.getDay() + 6) % 7; // 月曜=0
  const startOfWeek = startOfToday - dow * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const completedTimes: number[] = [];
  for (const t of todos) {
    if (t.status === 'done' && t.completedAt) completedTimes.push(new Date(t.completedAt).getTime());
  }
  for (const d of decisions) {
    if (!d.everApproved) continue;
    for (const t of d.tasks) {
      if (t.status === 'done' && t.completedAt) completedTimes.push(new Date(t.completedAt).getTime());
    }
  }
  const periodCounts = (times: number[]) => [
    { label: '本日', value: times.filter((ms) => ms >= startOfToday).length },
    { label: '今週', value: times.filter((ms) => ms >= startOfWeek).length },
    { label: '今月', value: times.filter((ms) => ms >= startOfMonth).length },
    { label: '今年', value: times.filter((ms) => ms >= startOfYear).length },
  ];
  const completedCounts = periodCounts(completedTimes);
  // 完了決定事項（status='done' の決定を completedAt で期間集計）
  const completedDecisionTimes: number[] = [];
  for (const d of decisions) {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
          おはようございます 👋
        </h1>
      </div>

      {/* 今日やること（自分・自部門の未完了＋承認待ち・リアルタイム） */}
      <MyWork />

      {/* 完了実行タスク（本日・今週・今月・今年） */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">完了実行タスク</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {completedCounts.map((c) => (
            <div key={c.label} className="rounded-2xl p-4 sm:p-5 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
            </div>
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
            <div key={c.label} className="rounded-2xl p-4 sm:p-5 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
            </div>
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
          </Link>
        ))}
      </div>

    </div>
  );
}
