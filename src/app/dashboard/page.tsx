'use client';

import { useStore, PRIORITY_LABELS, STATUS_LABELS, COLOR_MAP } from '@/lib/store';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

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
  const { todos, events } = state;
  const today = new Date().toISOString().split('T')[0];

  // KPI calculations
  const totalTodos = todos.length;
  const doneTodos = todos.filter((t) => t.status === 'done').length;
  const inProgressTodos = todos.filter((t) => t.status === 'in_progress').length;
  const overdueTodos = todos.filter(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate < today
  ).length;

  const todayEvents = events.filter((e) => e.date === today);
  const recentTodos = [...todos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const kpiCards = [
    {
      title: '総タスク',
      value: totalTodos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-500',
    },
    {
      title: '完了済み',
      value: doneTodos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-500',
    },
    {
      title: '進行中',
      value: inProgressTodos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-500',
    },
    {
      title: '期限超過',
      value: overdueTodos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'from-rose-500 to-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-500',
    },
  ];

  const completionRate = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

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

      {/* KPI Cards — Bento Grid top row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.iconColor} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Todos — large card */}
        <div
          className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">最近のタスク</h2>
            <Link href="/todos" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
              すべて見る →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {recentTodos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  todo.status === 'done' ? 'bg-emerald-400' : todo.status === 'in_progress' ? 'bg-indigo-400' : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${todo.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {todo.title}
                  </p>
                  {todo.dueDate && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      期限: {format(new Date(todo.dueDate + 'T00:00:00'), 'M月d日', { locale: ja })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[todo.priority]}`}>
                    {PRIORITY_LABELS[todo.priority]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[todo.status]}`}>
                    {STATUS_LABELS[todo.status]}
                  </span>
                </div>
              </div>
            ))}
            {recentTodos.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">タスクがありません</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Progress card */}
          <div
            className="rounded-2xl p-5 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
          >
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">完了率</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="url(#grad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${completionRate * 2.51} 251`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completionRate}%</span>
                  <span className="text-xs text-slate-400">完了</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{doneTodos}</p>
                <p className="text-xs text-slate-400">完了</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{inProgressTodos}</p>
                <p className="text-xs text-slate-400">進行中</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalTodos - doneTodos - inProgressTodos}</p>
                <p className="text-xs text-slate-400">未着手</p>
              </div>
            </div>
          </div>

          {/* Today's events */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">本日の予定</h2>
              <Link href="/calendar" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
                カレンダー →
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {todayEvents.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">予定なし</p>
              ) : (
                todayEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_MAP[event.color]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{event.title}</p>
                      {event.startTime && (
                        <p className="text-xs text-slate-400">{event.startTime}{event.endTime && ` - ${event.endTime}`}</p>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      event.shareStatus === 'shared'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {event.shareStatus === 'shared' ? '共有' : '非公開'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity summary bottom */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
      >
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">今週のアクティビティ</h2>
        <div className="flex items-end gap-1.5 h-16">
          {[3, 5, 2, 7, 4, inProgressTodos + doneTodos, doneTodos].map((val, i) => {
            const days = ['月', '火', '水', '木', '金', '土', '日'];
            const max = 8;
            const height = Math.max((val / max) * 100, 8);
            const isToday = i === new Date().getDay() - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${isToday ? 'bg-gradient-to-t from-indigo-500 to-violet-500' : 'bg-indigo-200 dark:bg-indigo-800'}`}
                  style={{ height: `${height}%` }}
                />
                <span className={`text-xs ${isToday ? 'text-indigo-500 font-semibold' : 'text-slate-400'}`}>{days[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
