'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useStore, PRIORITY_LABELS, STATUS_LABELS, resolveMemberName } from '@/lib/store';
import { jstToday, jstDateStr, isOverdueDue, jstPeriodStartMs, type Period } from '@/lib/date';
import { combineDetail } from '@/lib/taskDetail';
import { categoryLabel, activeCategories } from '@/lib/category';
import type { Priority, TodoStatus, Todo, TodoStep, DecisionTask } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getDepartmentName } from '@/lib/departments';
import { ScopeControl } from '@/components/ScopeControl';
import { taskVisible, defaultView, canManageDecisionTask, canManageTodo, type View } from '@/lib/visibility';

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

type FilterStatus = 'all' | 'incomplete' | TodoStatus;
type FilterPriority = 'all' | Priority;

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// 工程の下書き型
type DraftStep = {
  id?: string;      // 既存工程はid有り、新規はなし
  title: string;
  done: boolean;
  stepOrder: number;
  dueDate?: string;
  dueTime?: string;
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
  const { state } = useStore();
  const me = useCurrentUser();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [status] = useState<TodoStatus>(initial?.status ?? 'todo');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [whereLoc] = useState('');
  const [why, setWhy] = useState(combineDetail(initial ?? {}));
  const [how] = useState('');
  const [isShared, setIsShared] = useState(initial?.isShared ?? false);
  const [saving, setSaving] = useState(false);
  // 所有者（担当/部門の基準）。新規=ログイン者、編集=元の所有者。編集者で上書きしない。
  const ownerUsername = initial?.userId ?? me?.username ?? null;
  const ownerMember = ownerUsername ? state.members.find((m) => m.username === ownerUsername) : null;
  const ownerName = ownerMember?.name ?? (ownerUsername ? resolveMemberName(state.members, ownerUsername) : '自分');
  const ownerDeptId = ownerMember?.departmentId ?? (initial ? initial.departmentId : me?.departmentId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave(
      {
        title: title.trim(), priority, status, dueDate: dueDate || undefined,
        startDate: startDate || undefined,
        // 新規は作成者(me)、編集は元の値を保持（編集者で上書きしない）
        who: initial?.id ? (initial.who ?? undefined) : (me?.username || undefined),
        departmentId: initial?.id ? (initial.departmentId ?? undefined) : (me?.departmentId || undefined),
        whereLoc: whereLoc.trim() || undefined, why: why.trim() || undefined, how: how.trim() || undefined,
        isShared,
      },
      []
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
          {/* 何を（タスク内容） */}
          <input
            type="text" placeholder="何を（タスク内容）*" required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
          />

          {/* 担当・部門は「所有者（作成者）」基準で表示（編集者ではない）。 */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>担当: <span className="font-medium text-slate-700 dark:text-slate-200">{ownerName}</span></span>
            <span>部門: <span className="font-medium text-slate-700 dark:text-slate-200">{ownerDeptId ? getDepartmentName(ownerDeptId, state.departments) : '（未設定）'}</span></span>
          </div>

          {/* 5W1H（担当・部門は自分固定） */}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400 flex flex-col gap-0.5">開始日
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" style={{ borderColor: 'var(--border-color)' }} /></label>
            <label className="text-xs text-slate-400 flex flex-col gap-0.5">完了予定日
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" style={{ borderColor: 'var(--border-color)' }} /></label>
            <textarea placeholder="目的・手法詳細など" value={why} onChange={(e) => setWhy(e.target.value)} rows={5}
              className="col-span-2 resize-none overflow-y-auto px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" style={{ borderColor: 'var(--border-color)' }} />
          </div>

          {/* 共有 */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">共有設定</label>
            <button
              type="button"
              onClick={() => setIsShared((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                isShared
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {isShared ? '全員に公開中' : '自分のみ（非公開）'}
            </button>
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
function TodoItem({ todo, onEdit, onDelete, onToggle, currentUsername }: {
  todo: Todo;
  onEdit: (t: Todo) => void;
  onDelete: (id: string) => void;
  onToggle: (t: Todo) => void;
  currentUsername: string | null;
}) {
  const { state, updateTodo } = useStore();
  const [stepsOpen, setStepsOpen] = useState(false);
  const isOverdue = todo.status !== 'done' && isOverdueDue(todo.dueDate);
  const steps: TodoStep[] = []; // 工程は廃止（表示しない）
  const isOwnTask = !todo.userId || todo.userId === currentUsername;
  const ownerName = todo.userId ? resolveMemberName(state.members, todo.userId) : null;
  const me = state.members.find((m) => m.username === currentUsername) ?? null;
  const ownerDeptId = todo.userId ? (state.members.find((m) => m.username === todo.userId)?.departmentId ?? null) : null;
  // 編集・ステータス変更は 担当者(所有者)＋担当部長＋取締役 のみ
  const canEdit = canManageTodo(todo, me, ownerDeptId);
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
          disabled={!canEdit}
          title={!canEdit ? '担当者・担当部長・取締役のみ変更できます' : undefined}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            todo.status === 'done'
              ? 'bg-emerald-400 border-emerald-400'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
          } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            {todo.isShared && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-500 border border-violet-200 dark:border-violet-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                共有
              </span>
            )}
            {!isOwnTask && ownerName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {ownerName}
              </span>
            )}
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
            {ownerName && <span>作成者: {ownerName}</span>}
            {todo.who && <span>担当: {resolveMemberName(state.members, todo.who)}</span>}
            {todo.departmentId && <span>部門: {getDepartmentName(todo.departmentId, state.departments)}</span>}
            {todo.startDate && <span>開始: {todo.startDate.slice(5)}</span>}
            {todo.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isOverdue && '⚠ '}完了予定 {format(new Date(todo.dueDate + 'T00:00:00'), 'M月d日', { locale: ja })}
              </span>
            )}
            {combineDetail(todo) && (
              <span className="text-slate-400">／目的・手法詳細: {combineDetail(todo)}</span>
            )}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              todo.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' :
              todo.status === 'in_progress' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' :
              'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {STATUS_LABELS[todo.status]}
            </span>
          </div>

          {/* ステータス切替（担当者・担当部長・取締役のみ） */}
          <div className="flex gap-1 mt-2">
            {(['todo', 'in_progress', 'done'] as TodoStatus[]).map((s) => (
              <button key={s} disabled={!canEdit} onClick={() => { if (canEdit && s !== todo.status) updateTodo({ ...todo, status: s }); }}
                title={!canEdit ? '担当者・担当部長・取締役のみ変更できます' : undefined}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  todo.status === s ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {canEdit && (
          <button onClick={() => onEdit(todo)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          )}
          {canEdit && (
          <button onClick={() => onDelete(todo.id)}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          )}
        </div>
      </div>

      {/* Steps list */}
      {hasSteps && stepsOpen && (
        <div className="px-4 pb-3 space-y-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="pt-2.5 space-y-1.5">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2">
                <StepCheckbox todoId={todo.id} step={step} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs ${step.done ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {step.title}
                  </span>
                  {(step.dueDate || step.dueTime) && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {step.dueDate && format(new Date(step.dueDate + 'T00:00:00'), 'M月d日', { locale: ja })}
                      {step.dueTime && ` ${step.dueTime}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type FilterView = 'mine' | 'shared';
type FilterType = 'all' | 'todo' | 'decision';

type ActiveDecisionTask = DecisionTask & { decisionTitle: string; boardOnly?: boolean; decisionCreatedBy?: string | null; decisionDepartmentId?: string | null; decisionArchived?: boolean };

const DT_STATUS: TodoStatus[] = ['todo', 'in_progress', 'done'];

// ── Decision Task Item（決定事項由来の 5W1H タスク）─────────────────────────────
function DecisionTaskItem({ task }: { task: ActiveDecisionTask }) {
  const { state, updateDecisionTask, editDecisionTask, undoEditTask } = useStore();
  const me = useCurrentUser();
  const [open, setOpen] = useState(false);      // 第1段：決定事項を表示
  const [taskOpen, setTaskOpen] = useState(false); // 第2段：5W1H（実行タスク詳細）を表示
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [draft, setDraft] = useState({
    what: task.what, why: combineDetail(task), who: task.who ?? '', whereLoc: '',
    whenDue: task.whenDue ?? '', how: '', departmentId: task.departmentId ?? '', category: task.category ?? '', startDate: task.startDate ?? '',
  });
  const [projList, setProjList] = useState<{ id: string; name: string; policyId?: string | null }[]>([]);
  const [polList, setPolList] = useState<{ id: string; name: string }[]>([]);
  const [selProjects, setSelProjects] = useState<string[]>(task.projects?.map((p) => p.projectId) ?? []);
  const [selPolicies, setSelPolicies] = useState<string[]>(task.policies?.map((p) => p.policyId) ?? []);
  const isOverdue = task.status !== 'done' && isOverdueDue(task.whenDue);
  // 編集・ステータス変更は 担当者＋担当部長＋取締役 のみ。中止中の決定事項は閲覧のみ（操作不可）。
  const canEdit = !task.decisionArchived && canManageDecisionTask(task, me, task.decisionDepartmentId);
  const efld = 'w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400';

  const startEdit = () => {
    setEditing(true);
    if (projList.length === 0) fetch('/api/projects').then((r) => r.ok ? r.json() : []).then(setProjList).catch(() => {});
    if (polList.length === 0) fetch('/api/policies').then((r) => r.ok ? r.json() : []).then(setPolList).catch(() => {});
  };
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id));
    else if (arr.length < 5) set([...arr, id]);
  };
  // プロジェクト選択：選択時は紐づく方針を自動チェック／解除時は（他に同じ方針を持つ選択中PJが無ければ）方針も外す
  const selectProj = (id: string) => {
    const polId = projList.find((p) => p.id === id)?.policyId;
    if (selProjects.includes(id)) {
      const next = selProjects.filter((x) => x !== id);
      setSelProjects(next);
      if (polId && !next.some((pid) => projList.find((p) => p.id === pid)?.policyId === polId)) {
        setSelPolicies(selPolicies.filter((x) => x !== polId));
      }
      return;
    }
    if (selProjects.length >= 5) return;
    setSelProjects([...selProjects, id]);
    if (polId && !selPolicies.includes(polId) && selPolicies.length < 5) setSelPolicies([...selPolicies, polId]);
  };

  const changeStatus = async (status: TodoStatus) => {
    if (busy || status === task.status) return;
    setBusy(true);
    await updateDecisionTask(task.decisionId, { ...task, status }).catch(() => null);
    setBusy(false);
  };

  const saveEdit = async () => {
    if (busy || !draft.what.trim()) return;
    setBusy(true);
    setEditErr('');
    try {
      await editDecisionTask(task.decisionId, {
        ...task,
        what: draft.what.trim(), why: draft.why.trim(), who: draft.who || undefined,
        whereLoc: '', whenDue: draft.whenDue || undefined,
        how: '', departmentId: draft.departmentId || undefined,
        category: draft.category || null,
        startDate: draft.startDate || undefined,
        projectIds: selProjects, policyIds: selPolicies,
      } as DecisionTask & { projectIds: string[]; policyIds: string[] });
      setEditing(false);
    } catch {
      // 失敗を握りつぶさず明示（再承認にならない等の無言失敗を防ぐ）
      setEditErr('保存に失敗しました。時間をおいて再度お試しください（変更は反映されていません）。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 hover:shadow-sm group ${task.status === 'done' ? 'opacity-60' : ''}`}
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-start gap-3 p-4">
        {/* 完了トグル */}
        <button
          onClick={() => changeStatus(task.status === 'done' ? 'todo' : 'done')}
          disabled={!canEdit || busy}
          title={!canEdit ? '担当者・担当部長・取締役のみ変更できます' : undefined}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            task.status === 'done' ? 'bg-emerald-400 border-emerald-400' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
          } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {task.status === 'done' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button onClick={() => setOpen((o) => { const next = !o; if (!next) { setTaskOpen(false); setEditing(false); } return next; })} className="flex flex-wrap items-center gap-2 mb-1 text-left w-full">
            <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {task.what}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-50 dark:bg-sky-900/20 text-sky-600 border border-sky-200 dark:border-sky-800">
              決定事項
            </span>
            {task.boardOnly && (
              <span title="取締役＋担当部長のみに表示" className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                取締役会限定（取締役＋担当部長のみ表示）
              </span>
            )}
            {task.pendingEdit && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">再承認待ち</span>
            )}
            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {task.pendingEdit && task.editedBy === me?.username && (
            <div className="mb-1">
              <button
                onClick={async () => { if (busy) return; if (!confirm('この実行タスクの編集を取り消して、編集前に戻しますか？')) return; setBusy(true); await undoEditTask(task.decisionId, task.id).catch(() => null); setBusy(false); }}
                disabled={busy}
                className="text-xs px-2.5 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {busy ? '取り消し中…' : '編集を取り消す（編集前に戻す）'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {task.whenDue && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isOverdue && '⚠ '}{format(new Date(task.whenDue + 'T00:00:00'), 'M月d日', { locale: ja })}
              </span>
            )}
            {task.who && <span>担当: {resolveMemberName(state.members, task.who)}</span>}
            {task.departmentId && <span>部門: {getDepartmentName(task.departmentId, state.departments)}</span>}
            {categoryLabel(task.category, state.categories) && <span className="text-violet-600">🏷 {categoryLabel(task.category, state.categories)}</span>}
            {task.decisionCreatedBy && <span>決定作成: {resolveMemberName(state.members, task.decisionCreatedBy)}</span>}
            {task.createdBy && <span>タスク作成: {resolveMemberName(state.members, task.createdBy)}</span>}
          </div>
          {((task.policies && task.policies.length > 0) || (task.projects && task.projects.length > 0)) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.policies?.map((p) => <span key={p.policyId} className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600">方針: {p.policy.name}</span>)}
              {task.projects?.map((p) => <span key={p.projectId} className="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600">PJ: {p.project.name}</span>)}
            </div>
          )}

          {/* ステータス切替（担当者・担当部長・取締役のみ） */}
          <div className="flex gap-1 mt-2">
            {DT_STATUS.map((s) => (
              <button key={s} onClick={() => changeStatus(s)} disabled={busy || !canEdit}
                title={!canEdit ? '担当者・担当部長・取締役のみ変更できます' : undefined}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  task.status === s ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* 第1段：決定事項 */}
          {open && (
            <div className="mt-2 pt-2 border-t text-xs text-slate-500 dark:text-slate-400 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
              <p>決定事項: <Link href={task.decisionArchived ? '/cancelled' : `/decisions?dec=${task.decisionId}`} className="text-indigo-500 hover:underline">{task.decisionTitle}</Link>{task.decisionArchived && <span className="ml-1 text-xs text-rose-600">🚫 中止中</span>}</p>
              {task.decisionCreatedBy && <p>決定事項作成者: {resolveMemberName(state.members, task.decisionCreatedBy)}</p>}
              {/* 第2段トグル：5W1H（実行タスク）。決定事項は残したまま展開 */}
              <button onClick={() => setTaskOpen((o) => !o)} className="flex items-center gap-1 text-indigo-500 hover:underline mt-1">
                5W1H（実行タスク）を{taskOpen ? '閉じる' : '表示'}
                <svg className={`w-3 h-3 transition-transform ${taskOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {taskOpen && !editing && (
                <div className="mt-1 pl-3 border-l-2 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
                  <p>内容: {task.what}</p>
                  {task.who && <p>担当（誰が）: {resolveMemberName(state.members, task.who)}</p>}
                  {task.departmentId && <p>部門: {getDepartmentName(task.departmentId, state.departments)}</p>}
                  {categoryLabel(task.category, state.categories) && <p>集計分類: {categoryLabel(task.category, state.categories)}</p>}
                  {task.startDate && <p>開始日: {task.startDate}</p>}
                  {task.whenDue && <p>完了予定日: {task.whenDue}</p>}
                  {combineDetail(task) && <p className="whitespace-pre-wrap">目的・手法詳細: {combineDetail(task)}</p>}
                  {(task.policies?.length ?? 0) > 0 && <p>方針: {task.policies!.map((p) => p.policy.name).join('、')}</p>}
                  {(task.projects?.length ?? 0) > 0 && <p>プロジェクト: {task.projects!.map((p) => p.project.name).join('、')}</p>}
                  {task.createdBy && <p>実行タスク作成者: {resolveMemberName(state.members, task.createdBy)}</p>}
                  {canEdit
                    ? <button onClick={startEdit} className="text-indigo-500 hover:underline mt-1">5W1H・方針・プロジェクトを編集（編集すると再承認になります）</button>
                    : <p className="text-slate-400 mt-1">{task.decisionArchived ? '中止中のため閲覧のみ（編集不可）' : '編集は担当者・担当部長・取締役のみ可能です'}</p>}
                </div>
              )}
            </div>
          )}
          {open && taskOpen && editing && (
            <div className="mt-2 pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
              <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="何を *" value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.who} onChange={(e) => setDraft({ ...draft, who: e.target.value })}>
                  <option value="">誰が（担当）</option>
                  {state.members.map((m) => <option key={m.username} value={m.username}>{m.name}</option>)}
                </select>
                <select className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.departmentId} onChange={(e) => setDraft({ ...draft, departmentId: e.target.value })}>
                  <option value="">部門</option>
                  {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  <option value="">集計分類（空白）</option>
                  {activeCategories(state.categories).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <label className="text-xs text-slate-400 flex flex-col gap-0.5">開始日
                  <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
                <label className="text-xs text-slate-400 flex flex-col gap-0.5">完了予定日
                  <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.whenDue} onChange={(e) => setDraft({ ...draft, whenDue: e.target.value })} /></label>
                <textarea rows={5} className={`${efld} resize-none overflow-y-auto`} style={{ borderColor: 'var(--border-color)' }} placeholder="目的・手法詳細など" value={draft.why} onChange={(e) => setDraft({ ...draft, why: e.target.value })} />
              </div>
              {projList.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">プロジェクト（最大5）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {projList.map((p) => (
                      <button key={p.id} type="button" onClick={() => selectProj(p.id)}
                        className={`px-2 py-0.5 rounded-full text-xs border ${selProjects.includes(p.id) ? 'bg-sky-500 text-white border-sky-500' : 'text-slate-500 border-slate-200 dark:border-slate-700'}`}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )}
              {polList.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">方針（最大5）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {polList.map((p) => (
                      <button key={p.id} type="button" onClick={() => toggle(selPolicies, setSelPolicies, p.id)}
                        className={`px-2 py-0.5 rounded-full text-xs border ${selPolicies.includes(p.id) ? 'bg-amber-500 text-white border-amber-500' : 'text-slate-500 border-slate-200 dark:border-slate-700'}`}>{p.name}</button>
                    ))}
                  </div>
                </div>
              )}
              {editErr && <p className="text-xs text-rose-500">{editErr}</p>}
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white disabled:opacity-60">保存（再承認へ）</button>
                <button onClick={() => { setEditing(false); setEditErr(''); setDraft({ what: task.what, why: combineDetail(task), who: task.who ?? '', whereLoc: '', whenDue: task.whenDue ?? '', how: '', departmentId: task.departmentId ?? '', category: task.category ?? '', startDate: task.startDate ?? '' }); }} className="px-3 py-1.5 rounded-lg text-xs text-slate-500">取消</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Tasks Page（通常タスク + 決定タスクの統合）───────────────────────────
export default function TodosPage() {
  const { state, addTodo, updateTodo, deleteTodo, addStep, updateStep, deleteStep } = useStore();
  const currentUser = useCurrentUser();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('incomplete');
  const [filterView, setFilterView] = useState<FilterView>('mine');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('dueDate');
  const [quickFilter, setQuickFilter] = useState<'none' | 'overdue' | 'dueSoon' | 'inProgress'>('none');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // 集計分類での絞り込み（'all'=全て / ''=未設定 / code）
  const [period, setPeriod] = useState<Period | null>(null); // 完了の期間絞り込み（ダッシュボードの完了カードから）
  const [view, setView] = useState<View>('mine');
  const [viewInit, setViewInit] = useState(false);
  const [todoParam, setTodoParam] = useState<string | null>(null);
  const [todoParamHandled, setTodoParamHandled] = useState(false);

  // ダッシュボード等から ?status= / ?type= / ?view= / ?fv= / ?todo= を初期フィルターへ反映
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s === 'todo' || s === 'in_progress' || s === 'done' || s === 'incomplete' || s === 'all') setFilterStatus(s);
    const ty = params.get('type');
    if (ty === 'todo' || ty === 'decision') setFilterType(ty);
    const v = params.get('view');
    if (v === 'mine' || v === 'dept' || v === 'all') { setView(v); setViewInit(true); }
    const fv = params.get('fv');
    if (fv === 'mine' || fv === 'shared') setFilterView(fv);
    // 期限超過カードから ?overdue=1（期限切れのみ絞込）
    if (params.get('overdue') === '1') { setQuickFilter('overdue'); setFilterStatus('all'); }
    // ダッシュボードの完了カードから ?status=done&period=（完了を期間で絞込）
    const pd = params.get('period');
    if (pd === 'today' || pd === 'week' || pd === 'month' || pd === 'year') { setPeriod(pd); setFilterStatus('done'); }
    setTodoParam(params.get('todo'));
  }, []);

  // ?todo=<id> で来たら、対象の個人タスクの編集をその場で開く（読み込み後に一度だけ）
  useEffect(() => {
    if (todoParamHandled || !todoParam) return;
    const t = state.todos.find((x) => x.id === todoParam);
    if (t) { setEditTodo(t); setShowForm(true); setTodoParamHandled(true); }
  }, [todoParam, todoParamHandled, state.todos]);

  // 役職に応じた初期表示（取締役以上=全体／部長=自部門／社員=自分）。ただしURLでview指定済みなら上書きしない。
  useEffect(() => {
    if (!viewInit && currentUser) {
      const v = new URLSearchParams(window.location.search).get('view');
      if (!(v === 'mine' || v === 'dept' || v === 'all')) setView(defaultView(currentUser));
      setViewInit(true);
    }
  }, [currentUser, viewInit]);

  // 決定事項由来のタスク（承認済みのうち、再承認待ちでなく、表示対象のもの）
  // アーカイブ済み決定（削除済みだが完了実績を保持）は、完了表示(status=done)や期間絞り込みのときだけ含める。
  const includeArchived = filterStatus === 'done' || period !== null;
  const decisionTasks = useMemo<ActiveDecisionTask[]>(() =>
    state.decisions
      .filter((d) => d.everApproved && (includeArchived || !d.archived))
      .flatMap((d) => d.tasks
        .filter((t) => {
          // 中止（archived）タスクは実行タスク一覧から除外（中止一覧／決定事項カードで閲覧・中止解除）
          if (t.archived) return false;
          // 再承認待ち(pendingEdit)は通常非表示。ただし「自分が編集した」タスクは本人に表示し取消できるようにする
          if (t.pendingEdit) return t.editedBy === currentUser?.username;
          // 全社通達（部門=全員）は共有タスク側に集約。本人担当のものは「自分」にも表示する
          if (d.departmentId === 'all') {
            return t.who === currentUser?.username || filterView === 'shared';
          }
          return taskVisible(d, t, view, currentUser);
        })
        .map((t) => ({ ...t, decisionTitle: d.title, boardOnly: d.boardOnly, decisionCreatedBy: d.createdBy, decisionDepartmentId: d.departmentId, decisionArchived: d.archived }))),
    [state.decisions, view, filterView, currentUser, includeArchived]);

  const filteredDecisionTasks = useMemo(() => {
    let tasks = [...decisionTasks];
    if (filterStatus === 'incomplete') tasks = tasks.filter((t) => t.status !== 'done');
    else if (filterStatus !== 'all') tasks = tasks.filter((t) => t.status === filterStatus);
    // 集計分類での絞り込み（'all'=全て / ''=未設定のみ / それ以外=該当コード）
    if (categoryFilter !== 'all') tasks = tasks.filter((t) => (t.category ?? '') === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter((t) => t.what.toLowerCase().includes(q) || t.decisionTitle.toLowerCase().includes(q));
    }
    tasks.sort((a, b) => {
      if (sortBy === 'dueDate') return (a.whenDue ?? 'zzz').localeCompare(b.whenDue ?? 'zzz');
      if (sortBy === 'priority') return 0; // 決定事項タスクは優先度を持たない
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? ''); // 作成日順（新しい順）
    });
    return tasks;
  }, [decisionTasks, filterStatus, searchQuery, sortBy, categoryFilter]);

  const filteredTodos = useMemo(() => {
    let todos = [...state.todos];
    if (filterView === 'mine') {
      todos = todos.filter((t) => t.userId === currentUser?.username);
    } else {
      todos = todos.filter((t) => t.isShared);
    }
    if (filterStatus === 'incomplete') todos = todos.filter((t) => t.status !== 'done');
    else if (filterStatus !== 'all') todos = todos.filter((t) => t.status === filterStatus);
    if (searchQuery) todos = todos.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    todos.sort((a, b) => {
      if (sortBy === 'dueDate') return (a.dueDate ?? 'zzz').localeCompare(b.dueDate ?? 'zzz');
      return b.createdAt.localeCompare(a.createdAt);
    });
    return todos;
  }, [state.todos, filterView, filterStatus, searchQuery, sortBy, currentUser]);

  // 個人タスクと決定タスクを統合して1つの並び順に（完了予定日＝古い順／作成日＝新しい順）
  const combinedList = useMemo(() => {
    const items: Array<{ key: string; kind: 'todo' | 'decision'; due?: string | null; created: string; status: string; completed?: string | null; todo?: Todo; task?: ActiveDecisionTask }> = [];
    if (filterType !== 'decision') filteredTodos.forEach((t) => items.push({ key: `todo-${t.id}`, kind: 'todo', due: t.dueDate, created: t.createdAt, status: t.status, completed: t.completedAt, todo: t }));
    if (filterType !== 'todo') filteredDecisionTasks.forEach((t) => items.push({ key: `dec-${t.id}`, kind: 'decision', due: t.whenDue, created: t.createdAt, status: t.status, completed: t.completedAt, task: t }));
    // ステータスカード（期限切れ・今週締切・進行中）クリック時の絞り込み
    let result = items;
    if (quickFilter !== 'none') {
      const today = jstToday();
      const weekLater = jstDateStr(7);
      if (quickFilter === 'overdue') result = items.filter((x) => x.status !== 'done' && isOverdueDue(x.due));
      else if (quickFilter === 'dueSoon') result = items.filter((x) => x.status !== 'done' && !isOverdueDue(x.due) && x.due && x.due >= today && x.due <= weekLater);
      else if (quickFilter === 'inProgress') result = items.filter((x) => x.status === 'in_progress');
    }
    // 完了の期間絞り込み（ダッシュボードの完了カードから）：completedAt が期間内の完了タスク
    if (period) { const from = jstPeriodStartMs(period); result = result.filter((x) => x.completed && new Date(x.completed).getTime() >= from); }
    result.sort((a, b) => {
      if (sortBy === 'dueDate') return (a.due || 'zzzz').localeCompare(b.due || 'zzzz');
      return (b.created || '').localeCompare(a.created || ''); // 作成日（新しい順）
    });
    return result;
  }, [filteredTodos, filteredDecisionTasks, filterType, sortBy, quickFilter, period]);

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
          if (orig && (orig.title !== draft.title || orig.done !== draft.done || orig.stepOrder !== draft.stepOrder || orig.dueDate !== draft.dueDate || orig.dueTime !== draft.dueTime)) {
            await updateStep(editTodo.id, { ...orig, title: draft.title, done: draft.done, stepOrder: draft.stepOrder, dueDate: draft.dueDate, dueTime: draft.dueTime }).catch(() => null);
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
          await addStep(newTodo.id, draft.title, draft.stepOrder, draft.dueDate, draft.dueTime).catch(() => null);
        }
      }
    }
    setEditTodo(null);
  };

  // 表示範囲（自分/自部門・通常/決定）に連動し、ステータス絞り込みには左右されない固定指標
  const stats = useMemo(() => {
    const todosInScope = filterType !== 'decision'
      ? (filterView === 'mine' ? state.todos.filter((t) => t.userId === currentUser?.username) : state.todos.filter((t) => t.isShared))
      : [];
    const decInScope = filterType !== 'todo' ? decisionTasks : [];
    const items = [
      ...todosInScope.map((t) => ({ status: t.status, due: t.dueDate })),
      ...decInScope.map((t) => ({ status: t.status, due: t.whenDue })),
    ];
    const today = jstToday();
    const weekLater = jstDateStr(7);
    const open = items.filter((x) => x.status !== 'done');
    return {
      remaining: open.length,
      overdue: open.filter((x) => isOverdueDue(x.due)).length,
      dueSoon: open.filter((x) => !isOverdueDue(x.due) && x.due && x.due >= today && x.due <= weekLater).length,
      inProgress: items.filter((x) => x.status === 'in_progress').length,
    };
  }, [state.todos, decisionTasks, filterType, filterView, currentUser]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">実行タスク</h1>
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

      {/* 決定事項由来タスクの表示範囲（取締役以上=全体/部門、それ以外=自分/自部門） */}
      <ScopeControl view={view} setView={setView} user={currentUser} departments={state.departments} />

      {/* Stats（クリックで該当タスクに絞り込み） */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: '残タスク', value: stats.remaining, color: 'text-slate-700 dark:text-slate-200', qf: 'none', onSelect: () => { setQuickFilter('none'); setFilterStatus('incomplete'); } },
          { label: '期限切れ', value: stats.overdue, color: 'text-rose-500', qf: 'overdue', onSelect: () => { setQuickFilter('overdue'); setFilterStatus('all'); } },
          { label: '今週締切', value: stats.dueSoon, color: 'text-amber-500', qf: 'dueSoon', onSelect: () => { setQuickFilter('dueSoon'); setFilterStatus('all'); } },
          { label: '進行中', value: stats.inProgress, color: 'text-indigo-500', qf: 'inProgress', onSelect: () => { setQuickFilter('inProgress'); setFilterStatus('all'); } },
        ] as const).map((s) => {
          const isActive = quickFilter === s.qf;
          return (
            <button key={s.label} onClick={s.onSelect}
              className={`rounded-xl p-3 border text-center transition-all ${isActive ? 'ring-2 ring-indigo-400 shadow-md' : 'hover:shadow-sm hover:-translate-y-0.5'}`}
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(8px)' }}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* View tabs */}
      <div className="flex rounded-xl overflow-hidden border text-sm" style={{ borderColor: 'var(--border-color)', width: 'fit-content' }}>
        {([['mine', '自分のタスク'], ['shared', '共有タスク']] as [FilterView, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setFilterView(v)}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${filterView === v ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
            {v === 'shared' && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
            {label}
          </button>
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
          {([['all', 'すべて'], ['incomplete', '未完了'], ['todo', '未着手'], ['in_progress', '進行中'], ['done', '完了']] as [FilterStatus, string][]).map(([s, label]) => (
            <button key={s} onClick={() => { setFilterStatus(s); setQuickFilter('none'); }}
              className={`px-3 py-2 font-medium transition-colors ${filterStatus === s && quickFilter === 'none' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
              {label}
            </button>
          ))}
        </div>
        <select
          value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <option value="dueDate">完了予定日</option>
          <option value="createdAt">作成日（新しい順）</option>
        </select>
        {/* 集計分類で絞り込み（実行タスク対象）。'all'=全て / ''=未設定 */}
        {filterType !== 'todo' && (
          <select
            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderColor: 'var(--border-color)' }}
            title="集計分類で絞り込み"
          >
            <option value="all">分類: すべて</option>
            <option value="">分類: 未設定</option>
            {[...state.categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
              <option key={c.code} value={c.code}>分類: {c.label}{c.active ? '' : '（非表示）'}</option>
            ))}
          </select>
        )}
      </div>

      {/* 期限超過で来た時、共有タブにも期限超過があれば案内 */}
      {quickFilter === 'overdue' && filterView === 'mine' && (() => {
        // 共有タブだけに出る期限超過 = ①共有の個人タスク(他人所有) ②全社通達の決定タスク(担当が自分でない=自分タブには出ない)
        const sharedTodo = state.todos.filter((t) => t.isShared && t.userId !== currentUser?.username && t.status !== 'done' && isOverdueDue(t.dueDate)).length;
        const sharedDecision = state.decisions
          .filter((d) => d.everApproved && d.departmentId === 'all')
          .flatMap((d) => d.tasks.filter((t) => !t.pendingEdit && t.who !== currentUser?.username && taskVisible(d, t, view, currentUser) && t.status !== 'done' && isOverdueDue(t.whenDue)))
          .length;
        const sharedOverdue = sharedTodo + sharedDecision;
        if (sharedOverdue === 0) return null;
        const msg = combinedList.length > 0 ? '共有タスクにも期限超過タスクがあります' : '共有タスクに期限超過タスクが入っています';
        return (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <span className="flex-1">⚠ {msg}（{sharedOverdue}件）</span>
            <button onClick={() => setFilterView('shared')} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 flex-shrink-0">共有タスクを見る</button>
          </div>
        );
      })()}

      {/* Task list（通常タスク + 決定タスク 統合） */}
      <div className="space-y-2">
        {combinedList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">タスクが見つかりません</p>
          </div>
        ) : (
          <>
            {combinedList.map((c) => c.kind === 'todo' ? (
              <TodoItem
                key={c.key}
                todo={c.todo!}
                onEdit={handleEdit}
                onDelete={deleteTodo}
                onToggle={handleToggle}
                currentUsername={currentUser?.username ?? null}
              />
            ) : (
              <DecisionTaskItem key={c.key} task={c.task!} />
            ))}
          </>
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

