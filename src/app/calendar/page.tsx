'use client';

import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, addYears, subYears,
  startOfYear, endOfYear, eachMonthOfInterval,
  getHours, setHours, setMinutes,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useStore, COLOR_MAP, SHARE_STATUS_LABELS } from '@/lib/store';
import type { CalendarView, CalendarEvent, EventColor, ShareStatus } from '@/types';

const EVENT_COLORS: { value: EventColor; label: string }[] = [
  { value: 'indigo', label: 'インディゴ' },
  { value: 'violet', label: 'バイオレット' },
  { value: 'pink', label: 'ピンク' },
  { value: 'emerald', label: 'グリーン' },
  { value: 'amber', label: 'アンバー' },
  { value: 'sky', label: 'スカイ' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

// ── Event Form Modal ─────────────────────────────────────────────────────────
function EventModal({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Partial<CalendarEvent> & { date: string };
  onSave: (e: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime ?? '');
  const [endTime, setEndTime] = useState(initial.endTime ?? '');
  const [shareStatus, setShareStatus] = useState<ShareStatus>(initial.shareStatus ?? 'private');
  const [color, setColor] = useState<EventColor>(initial.color ?? 'indigo');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim() || undefined, date, startTime: startTime || undefined, endTime: endTime || undefined, shareStatus, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4"
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {initial.id ? 'イベントを編集' : 'イベントを追加'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text" placeholder="タイトル *" required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <textarea
            placeholder="メモ（任意）" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">開始時刻</label>
              <input
                type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">終了時刻</label>
              <input
                type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>
          {/* Share status */}
          <div className="flex gap-2">
            {(['shared', 'private'] as ShareStatus[]).map((s) => (
              <button
                key={s} type="button"
                onClick={() => setShareStatus(s)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${shareStatus === s ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}
              >
                {s === 'shared' ? '🌐 共有' : '🔒 プライベート'}
              </button>
            ))}
          </div>
          {/* Color picker */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">カラー</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value} type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${COLOR_MAP[c.value]} transition-transform ${color === c.value ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : 'hover:scale-105'}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {onDelete && (
              <button type="button" onClick={() => { onDelete(); onClose(); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-rose-200 dark:border-rose-800 transition-colors">
                削除
              </button>
            )}
            <button type="submit"
              className="flex-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/25">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Month View ───────────────────────────────────────────────────────────────
function MonthView({ currentDate, events, onDayClick, onEventClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = events.filter((e) => e.date === dateStr);
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dow = day.getDay();
          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`min-h-20 sm:min-h-24 p-1 sm:p-2 border-b border-r cursor-pointer transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10`}
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md' :
                !isCurrentMonth ? 'text-slate-300 dark:text-slate-600' :
                dow === 0 ? 'text-rose-400' : dow === 6 ? 'text-sky-400' : 'text-slate-700 dark:text-slate-200'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className={`${COLOR_MAP[ev.color]} text-white text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
                  >
                    {ev.shareStatus === 'private' && <span className="opacity-70">🔒</span>}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-slate-400 px-1">+{dayEvents.length - 3}件</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events, onSlotClick, onEventClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: string, time: string) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b sticky top-0 z-10" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(8px)' }}>
        <div className="py-2 text-xs text-slate-400 text-center">時刻</div>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className={`py-2 text-center ${isToday ? 'text-indigo-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
              <p className="text-xs">{WEEKDAYS_SHORT[day.getDay()]}</p>
              <p className={`text-base font-bold ${isToday ? 'text-indigo-500' : ''}`}>{format(day, 'd')}</p>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div>
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="py-2 px-2 text-xs text-slate-400 text-right pr-3 pt-1">{`${String(hour).padStart(2, '0')}:00`}</div>
            {days.map((day, di) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const slotEvents = events.filter((e) => e.date === dateStr && e.startTime && parseInt(e.startTime) === hour);
              return (
                <div
                  key={di}
                  className="min-h-12 border-l p-0.5 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                  onClick={() => onSlotClick(dateStr, hourStr)}
                >
                  {slotEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className={`${COLOR_MAP[ev.color]} text-white text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80`}
                    >
                      {ev.shareStatus === 'private' && '🔒 '}{ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day View ─────────────────────────────────────────────────────────────────
function DayView({ currentDate, events, onSlotClick, onEventClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: string, time: string) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayEvents = events.filter((e) => e.date === dateStr);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto">
        {HOURS.map((hour) => {
          const hourStr = `${String(hour).padStart(2, '0')}:00`;
          const slotEvents = dayEvents.filter((e) => e.startTime && parseInt(e.startTime) === hour);
          return (
            <div key={hour} className="flex gap-3 border-b py-2 px-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
              onClick={() => onSlotClick(dateStr, hourStr)}
            >
              <span className="text-xs text-slate-400 w-12 pt-1 flex-shrink-0">{hourStr}</span>
              <div className="flex-1 space-y-1">
                {slotEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className={`${COLOR_MAP[ev.color]} text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:opacity-80`}
                  >
                    {ev.shareStatus === 'private' && <span>🔒</span>}
                    <span>{ev.title}</span>
                    {ev.startTime && <span className="opacity-80 text-xs ml-auto">{ev.startTime}{ev.endTime && ` - ${ev.endTime}`}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Year View ────────────────────────────────────────────────────────────────
function YearView({ currentDate, events, onMonthClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onMonthClick: (date: Date) => void;
}) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
          const days = eachDayOfInterval({ start: calStart, end: endOfWeek(monthEnd, { weekStartsOn: 0 }) });
          const isCurrentMonth = isSameMonth(month, today);
          const monthEventDates = new Set(events.filter((e) => e.date.startsWith(format(month, 'yyyy-MM'))).map((e) => e.date));

          return (
            <div
              key={month.toISOString()}
              onClick={() => onMonthClick(month)}
              className={`rounded-xl p-3 border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isCurrentMonth ? 'ring-2 ring-indigo-400' : ''}`}
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <p className={`text-sm font-bold mb-2 ${isCurrentMonth ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-200'}`}>
                {format(month, 'M月', { locale: ja })}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const ds = format(day, 'yyyy-MM-dd');
                  const hasEvent = monthEventDates.has(ds);
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={ds} className={`aspect-square flex items-center justify-center rounded text-xs ${
                      !isSameMonth(day, month) ? 'opacity-20' :
                      isToday ? 'bg-indigo-500 text-white font-bold' :
                      hasEvent ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' :
                      'text-slate-500 dark:text-slate-400'
                    }`}>
                      {isSameMonth(day, month) ? format(day, 'd') : ''}
                    </div>
                  );
                })}
              </div>
              {monthEventDates.size > 0 && (
                <p className="text-xs text-indigo-500 mt-2">{monthEventDates.size}件の予定</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar Page ───────────────────────────────────────────────────────
export default function CalendarPage() {
  const { state, addEvent, updateEvent, deleteEvent } = useStore();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modal, setModal] = useState<{ initial: Partial<CalendarEvent> & { date: string } } | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [shareFilter, setShareFilter] = useState<'all' | 'shared' | 'private'>('all');

  const filteredEvents = useMemo(() =>
    shareFilter === 'all' ? state.events : state.events.filter((e) => e.shareStatus === shareFilter),
    [state.events, shareFilter]
  );

  const navigate = (dir: 1 | -1) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else if (view === 'day') setCurrentDate(dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else setCurrentDate(dir > 0 ? addYears(currentDate, 1) : subYears(currentDate, 1));
  };

  const headerLabel = useMemo(() => {
    if (view === 'month') return format(currentDate, 'yyyy年M月', { locale: ja });
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'M/d')} - ${format(we, 'M/d')}`;
    }
    if (view === 'day') return format(currentDate, 'yyyy年M月d日（E）', { locale: ja });
    return format(currentDate, 'yyyy年', { locale: ja });
  }, [view, currentDate]);

  const openNew = (date: string, time?: string) =>
    setModal({ initial: { date, startTime: time ?? '', shareStatus: 'private', color: 'indigo' } });

  const openEdit = (ev: CalendarEvent) => {
    setEditEvent(ev);
    setModal({ initial: ev });
  };

  const handleSave = (data: Omit<CalendarEvent, 'id'>) => {
    if (editEvent) updateEvent({ ...data, id: editEvent.id });
    else addEvent(data);
    setEditEvent(null);
  };

  const handleDelete = () => {
    if (editEvent) deleteEvent(editEvent.id);
    setEditEvent(null);
  };

  const VIEWS: { key: CalendarView; label: string }[] = [
    { key: 'day', label: '日' },
    { key: 'week', label: '週' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
            今日
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 min-w-32">{headerLabel}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Share filter */}
          <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
            {(['all', 'shared', 'private'] as const).map((f) => (
              <button key={f} onClick={() => setShareFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${shareFilter === f ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                {f === 'all' ? 'すべて' : f === 'shared' ? '🌐 共有' : '🔒 非公開'}
              </button>
            ))}
          </div>
          {/* View switcher */}
          <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
            {VIEWS.map((v) => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`px-3 py-1.5 font-medium transition-colors ${view === v.key ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Add button */}
          <button
            onClick={() => openNew(format(currentDate, 'yyyy-MM-dd'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-90 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>
      </div>

      {/* Calendar body */}
      {view === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} onDayClick={openNew} onEventClick={openEdit} />}
      {view === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} onSlotClick={openNew} onEventClick={openEdit} />}
      {view === 'day' && <DayView currentDate={currentDate} events={filteredEvents} onSlotClick={openNew} onEventClick={openEdit} />}
      {view === 'year' && (
        <YearView currentDate={currentDate} events={filteredEvents}
          onMonthClick={(m) => { setCurrentDate(m); setView('month'); }} />
      )}

      {/* Modal */}
      {modal && (
        <EventModal
          initial={modal.initial}
          onSave={handleSave}
          onDelete={editEvent ? handleDelete : undefined}
          onClose={() => { setModal(null); setEditEvent(null); }}
        />
      )}
    </div>
  );
}
