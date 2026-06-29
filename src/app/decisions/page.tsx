'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useStore, DECISION_STATUS_LABELS, STATUS_LABELS, resolveMemberName } from '@/lib/store';
import type { Decision, DecisionStatus, DecisionTask, TodoStatus } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getDepartmentName } from '@/lib/departments';
import { EditDiff } from '@/components/EditDiff';
import { isOverdueDue, jstPeriodStartMs, type Period } from '@/lib/date';
import { canManageDecisionTask, canManageDecision } from '@/lib/visibility';
import { ScopeControl } from '@/components/ScopeControl';
import { decisionVisible, defaultView, type View } from '@/lib/visibility';

const STATUS_BADGE: Record<DecisionStatus, string> = {
  pending: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  approved: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  done: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
};

// 5W1H タスクの下書き型
type DraftTask = {
  what: string;
  why: string;
  who: string;
  whereLoc: string;
  whenDue: string;
  how: string;
  departmentId: string;
  startDate: string;
};

const emptyTask = (): DraftTask => ({
  what: '', why: '', who: '', whereLoc: '', whenDue: '', how: '', departmentId: '', startDate: '',
});

// ── 決定事項 作成フォーム ──────────────────────────────────────────────────────
function DecisionForm({ onClose, initial }: { onClose: () => void; initial?: Decision }) {
  const { addDecision, updateDecision, state } = useStore();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  // 編集時は最初は空（「新しいタスクを追加」を押すまで入力欄を出さない）。新規作成時は1行表示。
  const [tasks, setTasks] = useState<DraftTask[]>(initial ? [] : [emptyTask()]);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [policyList, setPolicyList] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(initial?.projects?.map((p) => p.projectId) ?? []);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(initial?.policies?.map((p) => p.policyId) ?? []);
  const [deptId, setDeptId] = useState(initial?.departmentId ?? '');
  const [assignee, setAssignee] = useState(initial?.assigneeUsername ?? '');
  const [boardOnly, setBoardOnly] = useState(initial?.boardOnly ?? false);
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [editReason, setEditReason] = useState('');
  const [editingExistingId, setEditingExistingId] = useState<string | null>(null);
  const me = useCurrentUser();
  const isBoard = !!me && (!!me.isDirector || !!me.isRepresentative || !!me.isAdvisor);

  const departments = state.departments;

  useEffect(() => {
    fetch('/api/projects').then((r) => r.ok ? r.json() : []).then(setProjects).catch(() => {});
    fetch('/api/policies').then((r) => r.ok ? r.json() : []).then(setPolicyList).catch(() => {});
  }, []);

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 5) return prev; // 最大5
      return [...prev, id];
    });
  };
  const togglePolicy = (id: string) => {
    setSelectedPolicies((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const updateTask = (i: number, patch: Partial<DraftTask>) => {
    setTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (isEdit && initial) {
        const newTasks = tasks.filter((t) => t.what.trim()).map((t) => ({
          what: t.what.trim(), why: t.why.trim() || undefined, who: t.who || undefined,
          whereLoc: t.whereLoc.trim() || undefined, whenDue: t.whenDue || undefined,
          how: t.how.trim() || undefined, departmentId: t.departmentId || undefined, startDate: t.startDate || undefined,
        }));
        await updateDecision(initial.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          projectIds: selectedProjects,
          policyIds: selectedPolicies,
          departmentId: deptId || null,
          assigneeUsername: assignee || null,
          boardOnly: isBoard ? boardOnly : false,
          startDate: startDate || null,
          dueDate: dueDate || null,
          editReason: editReason.trim() || undefined,
          newTasks,
        });
      } else {
        await addDecision({
          title: title.trim(),
          description: description.trim() || undefined,
          tasks: tasks
            .filter((t) => t.what.trim())
            .map((t) => ({
              what: t.what.trim(),
              why: t.why.trim() || undefined,
              who: t.who || undefined,
              whereLoc: t.whereLoc.trim() || undefined,
              whenDue: t.whenDue || undefined,
              how: t.how.trim() || undefined,
              departmentId: t.departmentId || undefined,
              startDate: t.startDate || undefined,
            })),
          projectIds: selectedProjects,
          policyIds: selectedPolicies,
          departmentId: deptId || undefined,
          assigneeUsername: assignee || undefined,
          boardOnly: isBoard ? boardOnly : false,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
        });
      }
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
        style={{ background: 'var(--card-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{isEdit ? '決定事項を編集' : '新しい決定事項'}</h2>
        {isEdit && <p className="text-xs text-amber-500 -mt-3 mb-3">編集すると承認はリセットされ、再承認が必要になります（タスクの編集は各タスクから行います）。</p>}
        {isEdit && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">変更理由（承認者に表示・任意）</label>
            <input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="例: 期限の記載を修正" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 取締役会限定（先頭） */}
          {isBoard && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <input type="checkbox" checked={boardOnly} onChange={(e) => setBoardOnly(e.target.checked)} />
              取締役会限定（取締役＋担当部長のみに表示・承認は取締役2名）
            </label>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">決定内容 *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 新オフィスへの移転を決定"
              className={fieldCls}
              style={{ borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">補足説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={fieldCls}
              style={{ borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* 担当部署（担当部長の承認判定に使用） */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">担当（部署の部長＋取締役1名で承認。全員は取締役2名で承認）</label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
              <option value="">未設定</option>
              <option value="all">全員（全社通達）</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* 担当者（だれが） */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">担当者（だれが）</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
              <option value="">未設定</option>
              {state.members.map((m) => <option key={m.username} value={m.username}>{m.name}</option>)}
            </select>
          </div>

          {/* 開始日・完了予定日 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">開始日
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls + ' mt-1'} style={{ borderColor: 'var(--border-color)' }} />
            </label>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">完了予定日
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldCls + ' mt-1'} style={{ borderColor: 'var(--border-color)' }} />
            </label>
          </div>

          {/* 方針（タグ・最大5） */}
          {policyList.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                方針（タグ・最大5）{selectedPolicies.length > 0 && ` — ${selectedPolicies.length}/5`}
              </label>
              <div className="flex flex-wrap gap-2">
                {policyList.map((p) => {
                  const sel = selectedPolicies.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => togglePolicy(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        sel ? 'bg-amber-500 text-white border-amber-500' : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                      }`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* プロジェクト（タグ・最大5） */}
          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                プロジェクト（タグ・最大5）{selectedProjects.length > 0 && ` — ${selectedProjects.length}/5`}
              </label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => {
                  const sel = selectedProjects.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        sel
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                      }`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 実行タスク（最後に配置）。編集時は既存タスクを一覧表示し、「新しいタスクを追加」を押すと入力欄が出る。 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              {isEdit ? '実行タスク' : 'タスク（5W1H） — 承認されると稼働します'}
            </label>
            {isEdit && initial && initial.tasks.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-slate-400 mb-1">紐づいている実行タスク（内容を確認・その場で編集できます）</p>
                {initial.tasks.map((t) => (
                  <div key={t.id} className="rounded-lg border p-2.5 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                      <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate">{t.what}</span>
                      {t.pendingEdit && <span className="text-amber-600">再承認待ち</span>}
                      <button type="button" onClick={() => setEditingExistingId(editingExistingId === t.id ? null : t.id)}
                        className="text-xs px-2 py-0.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex-shrink-0">
                        {editingExistingId === t.id ? '閉じる' : '編集'}
                      </button>
                    </div>
                    {editingExistingId === t.id ? (
                      <InlineTaskEditor task={{ ...t, decisionId: initial.id }} onClose={() => setEditingExistingId(null)} />
                    ) : (
                      <div className="mt-1 pl-3.5 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-400">
                        {t.who && <span>担当: {resolveMemberName(state.members, t.who)}</span>}
                        {t.departmentId && <span>部門: {getDepartmentName(t.departmentId, state.departments)}</span>}
                        {t.startDate && <span>開始: {t.startDate}</span>}
                        {t.whenDue && <span>完了予定: {t.whenDue}</span>}
                        {t.whereLoc && <span>どこで: {t.whereLoc}</span>}
                        {t.why && <span>なぜ: {t.why}</span>}
                        {t.how && <span>どうやって: {t.how}</span>}
                        {t.policies?.map((p) => <span key={p.policyId} className="text-amber-600">方針:{p.policy.name}</span>)}
                        {t.projects?.map((p) => <span key={p.projectId} className="text-sky-600">PJ:{p.project.name}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isEdit && tasks.length > 0 && <p className="text-xs text-slate-400 mb-1">追加するタスク（追加分は再承認後に稼働）</p>}
            {tasks.length > 0 && (
              <div className="space-y-3">
                {tasks.map((task, i) => (
                  <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-500 flex-shrink-0">#{i + 1}</span>
                      <input value={task.what} onChange={(e) => updateTask(i, { what: e.target.value })} placeholder="何を（タスク内容）*" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
                      <button type="button" onClick={() => setTasks((p) => p.filter((_, idx) => idx !== i))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                      <select value={task.who} onChange={(e) => updateTask(i, { who: e.target.value })} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                        <option value="">誰が（担当者）</option>
                        {state.members.map((m) => <option key={m.username} value={m.username}>{m.name}</option>)}
                      </select>
                      <select value={task.departmentId} onChange={(e) => updateTask(i, { departmentId: e.target.value })} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                        <option value="">部門</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <label className="text-xs text-slate-400 flex flex-col gap-0.5">開始日
                        <input type="date" value={task.startDate} onChange={(e) => updateTask(i, { startDate: e.target.value })} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} /></label>
                      <label className="text-xs text-slate-400 flex flex-col gap-0.5">完了予定日
                        <input type="date" value={task.whenDue} onChange={(e) => updateTask(i, { whenDue: e.target.value })} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} /></label>
                      <input value={task.whereLoc} onChange={(e) => updateTask(i, { whereLoc: e.target.value })} placeholder="どこで" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
                      <input value={task.why} onChange={(e) => updateTask(i, { why: e.target.value })} placeholder="なぜ" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
                      <input value={task.how} onChange={(e) => updateTask(i, { how: e.target.value })} placeholder="どうやって" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setTasks((p) => [...p, emptyTask()])}
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors mt-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isEdit ? '新しいタスクを追加' : 'タスクを追加'}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}>
              キャンセル
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-md shadow-indigo-500/25 disabled:opacity-60">
              {saving ? '保存中...' : (isEdit ? '更新する（再承認）' : '決定事項を登録')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 実行タスク インライン編集（5W1H・方針・プロジェクト） ───────────────────────
function InlineTaskEditor({ task, onClose }: { task: DecisionTask & { decisionId: string }; onClose: () => void }) {
  const { editDecisionTask, state } = useStore();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    what: task.what, why: task.why ?? '', who: task.who ?? '', whereLoc: task.whereLoc ?? '',
    whenDue: task.whenDue ?? '', how: task.how ?? '', departmentId: task.departmentId ?? '', startDate: task.startDate ?? '',
  });
  const [polList, setPolList] = useState<Array<{ id: string; name: string }>>([]);
  const [projList, setProjList] = useState<Array<{ id: string; name: string }>>([]);
  const [selProjects, setSelProjects] = useState<string[]>(task.projects?.map((p) => p.projectId) ?? []);
  const [selPolicies, setSelPolicies] = useState<string[]>(task.policies?.map((p) => p.policyId) ?? []);
  const efld = 'w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400';

  useEffect(() => {
    fetch('/api/projects').then((r) => r.ok ? r.json() : []).then(setProjList).catch(() => {});
    fetch('/api/policies').then((r) => r.ok ? r.json() : []).then(setPolList).catch(() => {});
  }, []);

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id));
    else if (arr.length < 5) set([...arr, id]);
  };

  const save = async () => {
    if (busy || !draft.what.trim()) return;
    setBusy(true);
    await editDecisionTask(task.decisionId, {
      ...task,
      what: draft.what.trim(), why: draft.why.trim() || undefined, who: draft.who || undefined,
      whereLoc: draft.whereLoc.trim() || undefined, whenDue: draft.whenDue || undefined,
      how: draft.how.trim() || undefined, departmentId: draft.departmentId || undefined,
      startDate: draft.startDate || undefined,
      projectIds: selProjects, policyIds: selPolicies,
    } as DecisionTask & { projectIds: string[]; policyIds: string[] }).catch(() => null);
    setBusy(false);
    onClose();
  };

  return (
    <div className="mt-1.5 ml-4 space-y-2 rounded-lg border p-2.5" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
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
        <label className="text-xs text-slate-400 flex flex-col gap-0.5">開始日
          <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
        <label className="text-xs text-slate-400 flex flex-col gap-0.5">完了予定日
          <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.whenDue} onChange={(e) => setDraft({ ...draft, whenDue: e.target.value })} /></label>
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="どこで" value={draft.whereLoc} onChange={(e) => setDraft({ ...draft, whereLoc: e.target.value })} />
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="なぜ" value={draft.why} onChange={(e) => setDraft({ ...draft, why: e.target.value })} />
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="どうやって" value={draft.how} onChange={(e) => setDraft({ ...draft, how: e.target.value })} />
      </div>
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
      {projList.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1">プロジェクト（最大5）</p>
          <div className="flex flex-wrap gap-1.5">
            {projList.map((p) => (
              <button key={p.id} type="button" onClick={() => toggle(selProjects, setSelProjects, p.id)}
                className={`px-2 py-0.5 rounded-full text-xs border ${selProjects.includes(p.id) ? 'bg-sky-500 text-white border-sky-500' : 'text-slate-500 border-slate-200 dark:border-slate-700'}`}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white disabled:opacity-60">{busy ? '保存中…' : '保存（再承認へ）'}</button>
        <button onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取消</button>
      </div>
    </div>
  );
}

// ── 実行タスク インライン追加（既存の決定事項に後から追加） ───────────────
// requireApproval: 決定事項から追加するときは再承認が必要（追加タスクは承認まで非表示）。
function InlineTaskCreator({ decisionId, onClose, requireApproval = false }: { decisionId: string; onClose: () => void; requireApproval?: boolean }) {
  const { addDecisionTask, state } = useStore();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ what: '', why: '', who: '', whereLoc: '', whenDue: '', how: '', departmentId: '', startDate: '' });
  const [polList, setPolList] = useState<Array<{ id: string; name: string }>>([]);
  const [projList, setProjList] = useState<Array<{ id: string; name: string }>>([]);
  const [selProjects, setSelProjects] = useState<string[]>([]);
  const [selPolicies, setSelPolicies] = useState<string[]>([]);
  const efld = 'w-full px-2 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400';
  useEffect(() => {
    fetch('/api/projects').then((r) => r.ok ? r.json() : []).then(setProjList).catch(() => {});
    fetch('/api/policies').then((r) => r.ok ? r.json() : []).then(setPolList).catch(() => {});
  }, []);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id));
    else if (arr.length < 5) set([...arr, id]);
  };
  const save = async () => {
    if (busy || !draft.what.trim()) return;
    setBusy(true);
    await addDecisionTask(decisionId, {
      what: draft.what.trim(), why: draft.why.trim() || undefined, who: draft.who || undefined,
      whereLoc: draft.whereLoc.trim() || undefined, whenDue: draft.whenDue || undefined,
      how: draft.how.trim() || undefined, departmentId: draft.departmentId || undefined, startDate: draft.startDate || undefined,
      projectIds: selProjects, policyIds: selPolicies,
    }, requireApproval).catch(() => null);
    setBusy(false);
    onClose();
  };
  return (
    <div className="mt-2 space-y-2 rounded-lg border p-2.5" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{requireApproval ? '実行タスクを追加（追加後に再承認が必要）' : '実行タスクを追加（承認不要・すぐ稼働）'}</p>
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
        <label className="text-xs text-slate-400 flex flex-col gap-0.5">開始日
          <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
        <label className="text-xs text-slate-400 flex flex-col gap-0.5">完了予定日
          <input type="date" className={efld} style={{ borderColor: 'var(--border-color)' }} value={draft.whenDue} onChange={(e) => setDraft({ ...draft, whenDue: e.target.value })} /></label>
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="どこで" value={draft.whereLoc} onChange={(e) => setDraft({ ...draft, whereLoc: e.target.value })} />
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="なぜ" value={draft.why} onChange={(e) => setDraft({ ...draft, why: e.target.value })} />
        <input className={efld} style={{ borderColor: 'var(--border-color)' }} placeholder="どうやって" value={draft.how} onChange={(e) => setDraft({ ...draft, how: e.target.value })} />
      </div>
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
      {projList.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1">プロジェクト（最大5）</p>
          <div className="flex flex-wrap gap-1.5">
            {projList.map((p) => (
              <button key={p.id} type="button" onClick={() => toggle(selProjects, setSelProjects, p.id)}
                className={`px-2 py-0.5 rounded-full text-xs border ${selProjects.includes(p.id) ? 'bg-sky-500 text-white border-sky-500' : 'text-slate-500 border-slate-200 dark:border-slate-700'}`}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white disabled:opacity-60">{busy ? '追加中…' : (requireApproval ? '追加する（再承認へ）' : '追加する')}</button>
        <button onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取消</button>
      </div>
    </div>
  );
}

// ── 決定事項 カード ───────────────────────────────────────────────────────────
function DecisionCard({ decision, onEdit, autoOpen, autoEditTaskId }: { decision: Decision; isAdmin: boolean; onEdit: (d: Decision) => void; autoOpen?: boolean; autoEditTaskId?: string | null }) {
  const { approveDecision, completeDecision, undoApproveDecision, undoEditDecision, requestDeleteDecision, cancelDeleteDecision, state } = useStore();
  const me = useCurrentUser();
  const cardRef = useRef<HTMLDivElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(autoEditTaskId ?? null);
  const [addingTask, setAddingTask] = useState(false);
  // 承認待ち（編集・タスク追加/編集による再承認）のとき、または指定で開かれたときは全タスク内容を自動展開
  const [open, setOpen] = useState(decision.status === 'pending' || !!autoOpen);
  const [busy, setBusy] = useState(false);

  // ダッシュボード等から対象指定で来たら、展開＋該当タスクの編集を開いて見やすい位置へスクロール
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      if (autoEditTaskId) setEditingTaskId(autoEditTaskId);
      // 展開後にレイアウトが確定してから、上部へスクロール（scroll-mt でヘッダー分の余白を確保）
      const t = setTimeout(() => {
        const el = cardRef.current;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-indigo-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400'), 2000);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [autoOpen, autoEditTaskId]);

  // 承認・削除できるのは「担当部署の部長」または「取締役」。取締役会限定は取締役のみ。
  const isDir = !!me?.isDirector || !!me?.isRepresentative;
  // 全社通達（担当=全員）・取締役会限定は担当部長を伴わず取締役2名で承認
  const noManager = decision.boardOnly || decision.departmentId === 'all';
  const eligible = !!me && (
    noManager
      ? isDir
      : (isDir || (me.position === 'manager' && !!decision.departmentId && me.departmentId === decision.departmentId))
  );
  const approvedList = decision.approvals ?? [];
  const iApproved = !!me && approvedList.some((a) => a.approver === me.username);
  const requiredCount = 2; // 方針/PJ=取締役2名、決定=担当部長＋取締役1名 いずれも2名
  const remaining = Math.max(0, requiredCount - approvedList.length);
  const canApproveThis = eligible && decision.status === 'pending' && !iApproved;
  const deptName = decision.departmentId === 'all' ? '全員（通達）' : decision.departmentId ? getDepartmentName(decision.departmentId, state.departments) : null;
  const requiredText = noManager ? '取締役2名' : '担当部長＋取締役1名';
  // 決定事項を編集・削除できるのは 入力者(起案者)＋担当者＋担当部長＋取締役 のみ
  // 全社通達(all)の担当部長＝担当者の部署の部長
  const assigneeDept = decision.assigneeUsername ? state.members.find((m) => m.username === decision.assigneeUsername)?.departmentId ?? null : null;
  const canManageDec = canManageDecision(decision, me, assigneeDept);
  const canEdit = canManageDec && !decision.deleteRequested;
  // 編集の取り消し：承認待ちの間のみ・編集前スナップショットあり・「編集した本人」のみ
  const canUndoEdit = !!me && decision.status === 'pending' && !!decision.hasPrevState && decision.editedBy === me.username && !decision.deleteRequested;
  // 承認の取り消し：自分の承認・承認待ち（2名未達）・承認から30分以内
  const myApproval = me ? approvedList.find((a) => a.approver === me.username) : undefined;
  const within30 = !!myApproval?.createdAt && (Date.now() - new Date(myApproval.createdAt).getTime() < 30 * 60 * 1000);
  const canUndoApprove = !!myApproval && decision.status === 'pending' && within30 && !decision.deleteRequested;

  const total = decision.tasks.length;
  const doneCount = decision.tasks.filter((t) => t.status === 'done').length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const handleApprove = async () => {
    if (busy) return;
    setBusy(true);
    await approveDecision(decision.id).catch(() => null);
    setBusy(false);
  };

  const handleRequestDelete = async () => {
    if (busy || !confirm('この決定事項の削除を申請しますか？（削除には ' + (noManager ? '取締役2名' : '担当部長＋取締役1名') + ' の承認が必要です）')) return;
    setBusy(true);
    await requestDeleteDecision(decision).catch(() => null);
    setBusy(false);
  };

  const handleUndoEdit = async () => {
    if (busy || !confirm('この編集を取り消して、編集前の状態に戻しますか？')) return;
    setBusy(true);
    await undoEditDecision(decision.id).catch(() => null);
    setBusy(false);
  };

  const handleUndoApprove = async () => {
    if (busy) return;
    setBusy(true);
    await undoApproveDecision(decision.id).catch(() => null);
    setBusy(false);
  };

  const handleCancelDelete = async () => {
    if (busy) return;
    setBusy(true);
    await cancelDeleteDecision(decision).catch(() => null);
    setBusy(false);
  };

  return (
    <div ref={cardRef} className="rounded-2xl border p-4 sm:p-5 scroll-mt-24 transition-shadow" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[decision.status]}`}>
              {DECISION_STATUS_LABELS[decision.status]}
            </span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 break-words">{decision.title}</h3>
            {decision.boardOnly && (
              <span title="取締役＋担当部長のみに表示" className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800">🔒 取締役会限定（取締役＋担当部長のみ表示）</span>
            )}
            {decision.departmentId === 'all' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800">📢 全員通達</span>
            )}
          </div>
          {decision.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 whitespace-pre-wrap">{decision.description}</p>
          )}
          {((decision.policies && decision.policies.length > 0) || (decision.projects && decision.projects.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {decision.policies?.map((p) => (
                <span key={p.policyId} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800">方針: {p.policy.name}</span>
              ))}
              {decision.projects?.map((p) => (
                <span key={p.projectId} className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 border border-sky-200 dark:border-sky-800">PJ: {p.project.name}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>起案: {resolveMemberName(state.members, decision.createdBy)}</span>
            {deptName && <span>部門: {deptName}</span>}
            {decision.assigneeUsername && <span>担当: {resolveMemberName(state.members, decision.assigneeUsername)}</span>}
            {decision.startDate && <span>開始: {decision.startDate}</span>}
            {decision.dueDate && <span>完了予定: {decision.dueDate}</span>}
            {decision.approvedBy && <span>最終承認: {resolveMemberName(state.members, decision.approvedBy)}</span>}
            <span>{format(new Date(decision.createdAt), 'M月d日', { locale: ja })}</span>
            {decision.status === 'pending' && <span className="text-amber-500 font-medium">要承認: {requiredText}</span>}
          </div>
          {decision.status === 'pending' && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                承認 {approvedList.length}/{requiredCount}
              </span>
              {approvedList.map((a) => (
                <span key={a.approver} className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ {resolveMemberName(state.members, a.approver)}{a.asDirector ? '（取締役）' : a.asManager ? '（部長）' : ''}
                </span>
              ))}
              {remaining > 0 && (
                <span className="text-amber-600 dark:text-amber-400">あと{remaining}名の承認が必要</span>
              )}
            </div>
          )}
          {decision.status === 'pending' && iApproved && (
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ あなたは承認済みです{remaining > 0 ? `（残り${remaining}名の承認待ち）` : ''}
            </p>
          )}
          {decision.status === 'pending' && decision.editNote && (
            <div className="mt-1.5"><EditDiff note={decision.editNote} /></div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canApproveThis && !decision.deleteRequested && (
            <button onClick={handleApprove} disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-60">
              {busy ? '承認中…' : '承認する'}
            </button>
          )}
          {decision.status === 'pending' && iApproved && !decision.deleteRequested && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
              ✓ 承認済み
            </span>
          )}
          {canUndoApprove && (
            <button onClick={handleUndoApprove} disabled={busy}
              className="px-2 py-1.5 rounded-lg text-xs font-medium text-amber-600 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="自分の承認を取り消す（30分以内）">
              承認取消
            </button>
          )}
          {canUndoEdit && (
            <button onClick={handleUndoEdit} disabled={busy}
              className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="この編集を取り消して編集前に戻す（承認待ちの間のみ）">
              編集取消
            </button>
          )}
          {canEdit && (
            <button onClick={() => onEdit(decision)} disabled={busy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="編集（再承認になります）">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {decision.deleteRequested ? (
            <>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600">削除承認待ち</span>
              {eligible && (
                <button onClick={handleRequestDelete} disabled={busy}
                  className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60">削除を承認</button>
              )}
              {canManageDec && (
                <button onClick={handleCancelDelete} disabled={busy}
                  className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">取消</button>
              )}
            </>
          ) : canManageDec && (
            <button onClick={handleRequestDelete} disabled={busy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="削除を申請">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
              <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              タスク {doneCount}/{total} 完了
            </button>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* タスク0件・承認済みの決定事項：手動で完了/未完了を切替（担当部長＋取締役） */}
      {total === 0 && eligible && (decision.status === 'approved' || decision.status === 'done') && !decision.deleteRequested && (
        <div className="mt-3">
          {decision.status === 'done' ? (
            <button onClick={async () => { if (busy) return; setBusy(true); await completeDecision(decision.id, false).catch(() => null); setBusy(false); }}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {busy ? '処理中…' : '未完了に戻す'}
            </button>
          ) : (
            <button onClick={async () => { if (busy) return; setBusy(true); await completeDecision(decision.id, true).catch(() => null); setBusy(false); }}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors">
              {busy ? '処理中…' : '✓ 完了にする'}
            </button>
          )}
        </div>
      )}

      {/* タスク詳細（5W1H） */}
      {open && total > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
          {decision.tasks.map((t) => (
            <div key={t.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <span className={`font-medium ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{t.what}</span>
                <span className="text-xs text-slate-400">{STATUS_LABELS[t.status as TodoStatus]}</span>
                {t.pendingEdit && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">再承認待ち</span>}
                {canManageDecisionTask(t, me, decision.departmentId) && (
                  <button onClick={() => setEditingTaskId(editingTaskId === t.id ? null : t.id)}
                    className="ml-auto text-xs px-2 py-0.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex-shrink-0">
                    {editingTaskId === t.id ? '閉じる' : '編集'}
                  </button>
                )}
              </div>
              {editingTaskId === t.id ? (
                <InlineTaskEditor task={{ ...t, decisionId: decision.id }} onClose={() => setEditingTaskId(null)} />
              ) : (
                <div className="pl-4 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  {decision.createdBy && <span>決定事項作成者: {resolveMemberName(state.members, decision.createdBy)}</span>}
                  {t.createdBy && <span>実行タスク作成者: {resolveMemberName(state.members, t.createdBy)}</span>}
                  {t.who && <span>担当: {resolveMemberName(state.members, t.who)}</span>}
                  {t.departmentId && <span>部門: {getDepartmentName(t.departmentId, state.departments)}</span>}
                  {t.startDate && <span>開始: {t.startDate}</span>}
                  {t.whenDue && <span>完了予定: {t.whenDue}</span>}
                  {t.whereLoc && <span>場所: {t.whereLoc}</span>}
                  {t.why && <span>理由: {t.why}</span>}
                  {t.how && <span>方法: {t.how}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 実行タスクの後追い追加（追加後に再承認）。部長・取締役・代表取締役・管理者のみ。 */}
      {me && (me.position === 'manager' || me.isDirector || me.isRepresentative || me.role === 'admin') && !decision.deleteRequested && (
        <div className="mt-3">
          {addingTask ? (
            <InlineTaskCreator decisionId={decision.id} requireApproval onClose={() => setAddingTask(false)} />
          ) : (
            <button onClick={() => setAddingTask(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              実行タスクを追加（再承認が必要）
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────
type FilterStatus = 'all' | 'incomplete' | DecisionStatus;

export default function DecisionsPage() {
  const { state } = useStore();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('incomplete');
  const [boardFilter, setBoardFilter] = useState(false);
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [period, setPeriod] = useState<Period | null>(null); // 完了の期間絞り込み（ダッシュボードの完了カードから）
  const [view, setView] = useState<View>('mine');
  const [viewInit, setViewInit] = useState(false);
  // ダッシュボードから ?dec=&task= で来たとき、対象カードを展開＋タスク編集を開く
  const [autoDec, setAutoDec] = useState<string | null>(null);
  const [autoTask, setAutoTask] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s === 'pending' || s === 'approved' || s === 'done' || s === 'all') setFilter(s);
    const pd = params.get('period');
    if (pd === 'today' || pd === 'week' || pd === 'month' || pd === 'year') { setPeriod(pd); setFilter('done'); }
    if (params.get('board') === '1') { setBoardFilter(true); setFilter('all'); setView('all'); setViewInit(true); }
    if (params.get('overdue') === '1') { setOverdueFilter(true); setFilter('all'); setView('all'); setViewInit(true); }
    const dec = params.get('dec');
    const task = params.get('task');
    if (dec) { setAutoDec(dec); setAutoTask(task); setFilter('all'); setView('all'); setViewInit(true); }
  }, []);

  // 役職に応じた初期表示（取締役以上=全体／部長=自部門／社員=自分）。初回ユーザー解決時に一度だけ。
  useEffect(() => {
    if (!viewInit && currentUser) { setView(defaultView(currentUser)); setViewInit(true); }
  }, [currentUser, viewInit]);

  const matchesScope = useCallback((d: Decision) => decisionVisible(d, view, currentUser), [view, currentUser]);

  // まずスコープ（自分／自部門／全社）で絞り込み、その中で進捗タブを適用
  const scoped = useMemo(() => state.decisions.filter(matchesScope), [state.decisions, matchesScope]);

  const filtered = useMemo(() => {
    let list = scoped;
    if (boardFilter) list = list.filter((d) => d.boardOnly);
    if (overdueFilter) list = list.filter((d) => d.status !== 'done' && isOverdueDue(d.dueDate));
    if (filter === 'incomplete') list = list.filter((d) => d.status !== 'done');
    else if (filter !== 'all') list = list.filter((d) => d.status === filter);
    // 完了の期間絞り込み（ダッシュボードの完了カードから）：completedAt が期間内のもの
    if (period) { const from = jstPeriodStartMs(period); list = list.filter((d) => d.completedAt && new Date(d.completedAt).getTime() >= from); }
    // 完了（予定）日順：古い順、未設定は末尾
    return [...list].sort((a, b) => (a.dueDate || 'zzzz').localeCompare(b.dueDate || 'zzzz'));
  }, [scoped, filter, boardFilter, overdueFilter, period]);

  const counts = useMemo(() => ({
    all: scoped.length,
    incomplete: scoped.filter((d) => d.status !== 'done').length,
    pending: scoped.filter((d) => d.status === 'pending').length,
    approved: scoped.filter((d) => d.status === 'approved').length,
    done: scoped.filter((d) => d.status === 'done').length,
  }), [scoped]);

  const tabs: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'incomplete', label: '未完了', count: counts.incomplete },
    { key: 'all', label: 'すべて', count: counts.all },
    { key: 'pending', label: '承認待ち', count: counts.pending },
    { key: 'approved', label: '承認済み', count: counts.approved },
    { key: 'done', label: '完了', count: counts.done },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">決定事項</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {counts.all}件 / 承認待ち {counts.pending}件 / 完了 {counts.done}件
          </p>
          {boardFilter && (
            <button onClick={() => setBoardFilter(false)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              🔒 取締役会限定のみ表示中
              <span className="text-rose-400">✕ 解除</span>
            </button>
          )}
          {overdueFilter && (
            <button onClick={() => setOverdueFilter(false)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              ⚠ 期限超過のみ表示中
              <span className="text-rose-400">✕ 解除</span>
            </button>
          )}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-90 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">決定事項を追加</span>
          <span className="sm:hidden">追加</span>
        </button>
      </div>

      {/* 表示範囲（取締役以上=全体/部門、それ以外=自分/自部門）。通達(全員)は常に表示 */}
      <ScopeControl view={view} setView={setView} user={currentUser} departments={state.departments} />

      {/* フィルタータブ（進捗一覧） */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">決定事項がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => <DecisionCard key={d.id} decision={d} isAdmin={isAdmin} onEdit={setEditDecision} autoOpen={d.id === autoDec} autoEditTaskId={d.id === autoDec ? autoTask : null} />)}
        </div>
      )}

      {(showForm || editDecision) && (
        <DecisionForm key={editDecision?.id ?? 'new'} initial={editDecision ?? undefined} onClose={() => { setShowForm(false); setEditDecision(null); }} />
      )}
    </div>
  );
}
