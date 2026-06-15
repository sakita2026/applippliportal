'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/store';
import type { Priority, TodoStatus, Todo, TodoStep } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
  medium: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-rose-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
};

type FilterStatus = 'all' | TodoStatus;
type FilterPriority = 'all' | Priority;

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// 工程の下書き型
type DraftStep = {
  id?: string;      // 既存工程はid有り、新規はなし
  title: string;
  done: boolean;
  stepOrder: number;
};

// ── Todo Form ────────────────────────────────────────────────────────────────
function TodoForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Todo>;
  onSave: (data: Omit<Todo, 'id' | 'createdAt' | 'steps'>, steps: DraftStep[]) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [status, setStatus] = useState<TodoStatus>(initial?.status ?? 'todo');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [steps, setSteps] = useState<DraftStep[]>(
    (initial?.steps ?? []).map((s) => ({ id: s.id, title: s.title, done: s.done, stepOrder: s.stepOrder }))
  );
  const [saving, setSaving] = useState(false);
  const lastInputRef = useRef<HTMLInputElement>(null);

  const addStep = () => {
    setSteps((prev) => [...prev, { title: '', done: false, stepOrder: prev.length }]);
    setTimeout(() => lastInputRef.current?.focus(), 50);
  };

  const updateStepTitle = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, title: value } : s));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i })));
  };

  const handleStepKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === steps.length - 1) {
        addStep();
      } else {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-step-input]');
        inputs[index + 1]?.focus();
      }
    }
    if (e.key === 'Backspace' && steps[index].title === '') {
      e.preventDefault();
      removeStep(index);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const validSteps = steps
      .filter((s) => s.title.trim())
      .map((s, i) => ({ ...s, title: s.title.trim(), stepOrder: i }));
    await onSave(
      { title: title.trim(), description: description.trim() || undefined, priority, status, dueDate: dueDate || undefined },
      validSteps
    );
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {initial?.id ? 'タスクを編集' : 'タスクを追加'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* タスク名 */}
          <input
            type="text" placeholder="タスク名 *" required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
          />

          {/* 詳細 */}
          <textarea
            placeholder="詳細（任意）" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            style={{ borderColor: 'var(--border-color)' }}
          />

          {/* 優先度 */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">優先度</label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-all ${priority === p ? PRIORITY_COLORS[p] : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}>
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* ステータス */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">ステータス</label>
            <div className="grid grid-cols-3 gap-2">
              {(['todo', 'in_progress', 'done'] as TodoStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${status === s ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* 期限 */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">期限</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ borderColor: 'var(--border-color)' }} />
          </div>

          {/* 工程 */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">工程</label>
            <div className="space-y-1.5">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  {/* ハンドル */}
                  <span className="text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </span>
                  {/* 番号 */}
                  <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
                  {/* 入力 */}
                  <input
                    type="text"
                    data-step-input
                    ref={index === steps.length - 1 ? lastInputRef : undefined}
                    value={step.title}
                    onChange={(e) => updateStepTitle(index, e.target.value)}
                    onKeyDown={(e) => handleStepKeyDown(e, index)}
                    placeholder={`工程 ${index + 1}`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                  {/* 削除 */}
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-400 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors mt-1 pl-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                工程を追加
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/25 disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Step Checkbox ────────────────────────────────────────────────────────────
function StepCheckbox({ todoId, step }: { todoId: string; step: TodoStep }) {
  const { updateStep } = useStore();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    await updateStep(todoId, { ...step, done: !step.done }).catch(() => null);
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
        step.done
          ? 'bg-indigo-500 border-indigo-500'
          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
      }`}
    >
      {step.done && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// ── Todo Item ────────────────────────────────────────────────────────────────
function TodoItem({ todo, onEdit, onDelete, onToggle }: {
  todo: Todo;
  onEdit: (t: Todo) => void;
  onDelete: (id: string) => void;
  onToggle: (t: Todo) => void;
}) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = todo.status !== 'done' && todo.dueDate && todo.dueDate < today;
  const steps = todo.steps ?? [];
  const doneCount = steps.filter((s) => s.done).length;
  const hasSteps = steps.length > 0;
  const progress = hasSteps ? (doneCount / steps.length) * 100 : 0;

  // 工程がある場合は初期表示を開く
  useEffect(() => {
    if (hasSteps) setStepsOpen(true);
  }, [hasSteps]);

  return (
    <div className={`rounded-xl border transition-all duration-200 hover:shadow-sm group ${
      todo.status === 'done' ? 'opacity-60' : ''
    }`} style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo)}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            todo.status === 'done'
              ? 'bg-emerald-400 border-emerald-400'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
          }`}
        >
          {todo.status === 'done' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${todo.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {todo.title}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_COLORS[todo.priority]}`}>
              {PRIORITY_LABELS[todo.priority]}
            </span>
          </div>
          {todo.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 truncate">{todo.description}</p>
          )}

          {/* Step progress bar */}
          {hasSteps && (
            <button
              onClick={() => setStepsOpen((v) => !v)}
              className="flex items-center gap-2 mb-1 w-full text-left group/prog"
            >
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                {doneCount}/{steps.length}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${stepsOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {todo.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isOverdue && '⚠ '}
                {format(new Date(todo.dueDate + 'T00:00:00'), 'M月d日', { locale: ja })}
              </span>
            )}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              todo.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' :
              todo.status === 'in_progress' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' :
              'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
              {STATUS_LABELS[todo.status]}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(todo)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(todo.id)}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Steps list */}
      {hasSteps && stepsOpen && (
        <div className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="pt-2.5 space-y-1.5">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2">
                <StepCheckbox todoId={todo.id} step={step} />
                <span className={`text-xs flex-1 ${step.done ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Todos Page ──────────────────────────────────────────────────────────
export default function TodosPage() {
  const { state, addTodo, updateTodo, deleteTodo, addStep, updateStep, deleteStep } = useStore();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');

  const filteredTodos = useMemo(() => {
    let todos = [...state.todos];
    if (filterStatus !== 'all') todos = todos.filter((t) => t.status === filterStatus);
    if (filterPriority !== 'all') todos = todos.filter((t) => t.priority === filterPriority);
    if (searchQuery) todos = todos.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    todos.sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === 'dueDate') return (a.dueDate ?? 'zzz').localeCompare(b.dueDate ?? 'zzz');
      return b.createdAt.localeCompare(a.createdAt);
    });
    return todos;
  }, [state.todos, filterStatus, filterPriority, searchQuery, sortBy]);

  const handleToggle = (todo: Todo) => {
    updateTodo({ ...todo, status: todo.status === 'done' ? 'todo' : 'done' });
  };

  const handleEdit = (todo: Todo) => {
    setEditTodo(todo);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<Todo, 'id' | 'createdAt' | 'steps'>, draftSteps: DraftStep[]) => {
    if (editTodo) {
      // タスク更新
      await updateTodo({ ...editTodo, ...data });

      const originalSteps = editTodo.steps ?? [];
      const draftIds = new Set(draftSteps.filter((s) => s.id).map((s) => s.id!));

      // 削除された工程
      for (const orig of originalSteps) {
        if (!draftIds.has(orig.id)) {
          await deleteStep(editTodo.id, orig.id).catch(() => null);
        }
      }
      // 更新・追加
      for (const draft of draftSteps) {
        if (draft.id) {
          const orig = originalSteps.find((s) => s.id === draft.id);
          if (orig && (orig.title !== draft.title || orig.done !== draft.done || orig.stepOrder !== draft.stepOrder)) {
            await updateStep(editTodo.id, { ...orig, title: draft.title, done: draft.done, stepOrder: draft.stepOrder }).catch(() => null);
          }
        } else {
          await addStep(editTodo.id, draft.title, draft.stepOrder).catch(() => null);
        }
      }
    } else {
      // タスク作成
      const newTodo = await addTodo(data);
      for (const draft of draftSteps) {
        if (draft.title.trim()) {
          await addStep(newTodo.id, draft.title, draft.stepOrder).catch(() => null);
        }
      }
    }
    setEditTodo(null);
  };

  const stats = useMemo(() => ({
    total: state.todos.length,
    done: state.todos.filter((t) => t.status === 'done').length,
    inProgress: state.todos.filter((t) => t.status === 'in_progress').length,
    high: state.todos.filter((t) => t.priority === 'high' && t.status !== 'done').length,
  }), [state.todos]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">タスク管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {stats.total}件のタスク / {stats.done}件完了
          </p>
        </div>
        <button
          onClick={() => { setEditTodo(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">タスクを追加</span>
          <span className="sm:hidden">追加</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '全タスク', value: stats.total, color: 'text-slate-700 dark:text-slate-200' },
          { label: '進行中', value: stats.inProgress, color: 'text-indigo-500' },
          { label: '完了', value: stats.done, color: 'text-emerald-500' },
          { label: '高優先度', value: stats.high, color: 'text-rose-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 border text-center" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(8px)' }}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="タスクを検索..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
          {([['all', 'すべて'], ['todo', '未着手'], ['in_progress', '進行中'], ['done', '完了']] as [FilterStatus, string][]).map(([s, label]) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 font-medium transition-colors ${filterStatus === s ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
          {([['all', '全優先度'], ['high', '高'], ['medium', '中'], ['low', '低']] as [FilterPriority, string][]).map(([p, label]) => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-3 py-2 font-medium transition-colors ${filterPriority === p ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
              {label}
            </button>
          ))}
        </div>
        <select
          value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <option value="createdAt">作成日順</option>
          <option value="dueDate">期限順</option>
          <option value="priority">優先度順</option>
        </select>
      </div>

      {/* Todo list */}
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">タスクが見つかりません</p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onEdit={handleEdit}
              onDelete={deleteTodo}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {showForm && (
        <TodoForm
          initial={editTodo ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTodo(null); }}
        />
      )}
    </div>
  );
}
