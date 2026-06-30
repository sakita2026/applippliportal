'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  Todo, TodoStep, CalendarEvent, Priority, TodoStatus, ShareStatus,
  Decision, DecisionTask, Department, CreateDecisionRequest, Member, CategoryOption, SegmentOption,
} from '@/types';

// State
interface StoreState {
  todos: Todo[];
  events: CalendarEvent[];
  decisions: Decision[];
  departments: Department[];
  members: Member[];
  categories: CategoryOption[];
  segments: SegmentOption[];
  loading: boolean;
  error: string | null;
}

// Actions
type Action =
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'UPDATE_TODO'; payload: Todo }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'ADD_STEP'; payload: { todoId: string; step: TodoStep } }
  | { type: 'UPDATE_STEP'; payload: { todoId: string; step: TodoStep } }
  | { type: 'DELETE_STEP'; payload: { todoId: string; stepId: string } }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_DECISIONS'; payload: Decision[] }
  | { type: 'ADD_DECISION'; payload: Decision }
  | { type: 'UPDATE_DECISION'; payload: Decision }
  | { type: 'DELETE_DECISION'; payload: string }
  | { type: 'UPDATE_DECISION_TASK'; payload: { decisionId: string; task: DecisionTask } }
  | { type: 'SET_CATEGORIES'; payload: CategoryOption[] }
  | { type: 'SET_SEGMENTS'; payload: SegmentOption[] }
  | { type: 'SET_DEPARTMENTS'; payload: Department[] }
  | { type: 'ADD_DEPARTMENT'; payload: Department }
  | { type: 'UPDATE_DEPARTMENT'; payload: Department }
  | { type: 'DELETE_DEPARTMENT'; payload: string }
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_TODOS': return { ...state, todos: action.payload, loading: false };
    case 'SET_EVENTS': return { ...state, events: action.payload };
    case 'ADD_TODO': return { ...state, todos: [action.payload, ...state.todos] };
    case 'UPDATE_TODO':
      return { ...state, todos: state.todos.map((t) => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TODO':
      return { ...state, todos: state.todos.filter((t) => t.id !== action.payload) };
    case 'ADD_STEP':
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload.todoId
            ? { ...t, steps: [...(t.steps ?? []), action.payload.step].sort((a, b) => a.stepOrder - b.stepOrder) }
            : t
        ),
      };
    case 'UPDATE_STEP':
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload.todoId
            ? { ...t, steps: (t.steps ?? []).map((s) => s.id === action.payload.step.id ? action.payload.step : s) }
            : t
        ),
      };
    case 'DELETE_STEP':
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload.todoId
            ? { ...t, steps: (t.steps ?? []).filter((s) => s.id !== action.payload.stepId) }
            : t
        ),
      };
    case 'ADD_EVENT': return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map((e) => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload) };
    case 'SET_DECISIONS': return { ...state, decisions: action.payload };
    case 'ADD_DECISION': return { ...state, decisions: [action.payload, ...state.decisions] };
    case 'UPDATE_DECISION':
      return { ...state, decisions: state.decisions.map((d) => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DECISION':
      return { ...state, decisions: state.decisions.filter((d) => d.id !== action.payload) };
    case 'UPDATE_DECISION_TASK':
      return {
        ...state,
        decisions: state.decisions.map((d) => {
          if (d.id !== action.payload.decisionId) return d;
          const tasks = d.tasks.map((t) => t.id === action.payload.task.id ? action.payload.task : t);
          // 親決定事項のステータスを進捗に合わせて再計算（API と同じロジック）
          let status = d.status;
          if (d.status !== 'pending' && tasks.length > 0) {
            status = tasks.every((t) => t.status === 'done') ? 'done' : 'approved';
          }
          return { ...d, tasks, status };
        }),
      };
    case 'SET_CATEGORIES': return { ...state, categories: action.payload };
    case 'SET_SEGMENTS': return { ...state, segments: action.payload };
    case 'SET_DEPARTMENTS': return { ...state, departments: action.payload };
    case 'ADD_DEPARTMENT': return { ...state, departments: [...state.departments, action.payload].sort((a, b) => a.sortOrder - b.sortOrder) };
    case 'UPDATE_DEPARTMENT':
      return { ...state, departments: state.departments.map((d) => d.id === action.payload.id ? action.payload : d).sort((a, b) => a.sortOrder - b.sortOrder) };
    case 'DELETE_DEPARTMENT':
      return { ...state, departments: state.departments.filter((d) => d.id !== action.payload) };
    case 'SET_MEMBERS': return { ...state, members: action.payload };
    case 'ADD_MEMBER': return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return { ...state, members: state.members.map((m) => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MEMBER':
      return { ...state, members: state.members.filter((m) => m.id !== action.payload) };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    default: return state;
  }
}

// Context
interface StoreContextValue {
  state: StoreState;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'steps'>) => Promise<Todo>;
  updateTodo: (todo: Todo) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addStep: (todoId: string, title: string, stepOrder: number, dueDate?: string, dueTime?: string) => Promise<TodoStep>;
  updateStep: (todoId: string, step: TodoStep) => Promise<void>;
  deleteStep: (todoId: string, stepId: string) => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addDecision: (data: CreateDecisionRequest) => Promise<Decision>;
  updateDecision: (id: string, data: { title?: string; description?: string; departmentId?: string | null; assigneeUsername?: string | null; boardOnly?: boolean; segment?: string | null; projectIds?: string[]; policyIds?: string[]; editReason?: string; startDate?: string | null; dueDate?: string | null; newTasks?: Array<Record<string, unknown>> }) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  approveDecision: (id: string) => Promise<void>;
  completeDecision: (id: string, done: boolean) => Promise<void>;
  undoApproveDecision: (id: string) => Promise<void>;
  undoEditDecision: (id: string) => Promise<void>;
  requestDeleteDecision: (decision: Decision) => Promise<void>;
  cancelDeleteDecision: (decision: Decision) => Promise<void>;
  requestCancelTask: (taskId: string) => Promise<void>;
  undoRequestCancelTask: (taskId: string) => Promise<void>;
  updateDecisionTask: (decisionId: string, task: DecisionTask) => Promise<void>;
  editDecisionTask: (decisionId: string, task: DecisionTask & { projectIds?: string[]; policyIds?: string[] }) => Promise<void>;
  addDecisionTask: (decisionId: string, task: Partial<DecisionTask> & { what: string; projectIds?: string[]; policyIds?: string[] }, requireApproval?: boolean) => Promise<void>;
  undoEditTask: (decisionId: string, taskId: string) => Promise<void>;
  addDepartment: (data: { id: string; name: string; sortOrder?: number }) => Promise<void>;
  updateDepartment: (id: string, data: { name?: string; sortOrder?: number }) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addMember: (data: Partial<Member> & { username: string; name: string; password?: string }) => Promise<void>;
  updateMember: (id: string, data: Partial<Member> & { password?: string }) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
  addCategory: (data: { code: string; label: string }) => Promise<void>;
  updateCategory: (id: string, data: { label?: string; active?: boolean; sortOrder?: number }) => Promise<void>;
  refreshSegments: () => Promise<void>;
  addSegment: (data: { code: string; label: string }) => Promise<void>;
  updateSegment: (id: string, data: { label?: string; active?: boolean; sortOrder?: number }) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// API helpers
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store', // 常に最新を取得（承認状態などが古くならないように）
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'APIエラーが発生しました');
  }
  return res.json() as Promise<T>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    todos: [],
    events: [],
    decisions: [],
    departments: [],
    members: [],
    categories: [],
    segments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    Promise.all([
      apiFetch<Todo[]>('/api/todos'),
      apiFetch<CalendarEvent[]>('/api/events'),
    ])
      .then(([todos, events]) => {
        dispatch({ type: 'SET_TODOS', payload: todos });
        dispatch({ type: 'SET_EVENTS', payload: events });
      })
      .catch((err: Error) => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  // 決定事項・部門は独立して読み込む（テーブル未作成でもコア機能を壊さない）
  useEffect(() => {
    apiFetch<Decision[]>('/api/decisions')
      .then((decisions) => dispatch({ type: 'SET_DECISIONS', payload: decisions }))
      .catch(() => { /* 未作成時は無視 */ });
    apiFetch<Department[]>('/api/departments')
      .then((departments) => dispatch({ type: 'SET_DEPARTMENTS', payload: departments }))
      .catch(() => { /* 未作成時は無視 */ });
    apiFetch<Member[]>('/api/members')
      .then((members) => dispatch({ type: 'SET_MEMBERS', payload: members }))
      .catch(() => { /* 未作成時は無視 */ });
    apiFetch<CategoryOption[]>('/api/categories')
      .then((categories) => dispatch({ type: 'SET_CATEGORIES', payload: categories }))
      .catch(() => { /* 未作成時は無視 */ });
    apiFetch<SegmentOption[]>('/api/segments')
      .then((segments) => dispatch({ type: 'SET_SEGMENTS', payload: segments }))
      .catch(() => { /* 未作成時は無視 */ });
  }, []);

  const addTodo = useCallback(async (data: Omit<Todo, 'id' | 'createdAt' | 'steps'>) => {
    const todo = await apiFetch<Todo>('/api/todos', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_TODO', payload: todo });
    return todo;
  }, []);

  const updateTodo = useCallback(async (todo: Todo) => {
    const updated = await apiFetch<Todo>(`/api/todos/${todo.id}`, { method: 'PUT', body: JSON.stringify(todo) });
    dispatch({ type: 'UPDATE_TODO', payload: updated });
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    await apiFetch(`/api/todos/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_TODO', payload: id });
  }, []);

  const addStep = useCallback(async (todoId: string, title: string, stepOrder: number, dueDate?: string, dueTime?: string) => {
    const step = await apiFetch<TodoStep>(`/api/todos/${todoId}/steps`, {
      method: 'POST',
      body: JSON.stringify({ title, stepOrder, dueDate, dueTime }),
    });
    dispatch({ type: 'ADD_STEP', payload: { todoId, step } });
    return step;
  }, []);

  const updateStep = useCallback(async (todoId: string, step: TodoStep) => {
    const updated = await apiFetch<TodoStep>(`/api/todos/${todoId}/steps/${step.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: step.title, done: step.done, stepOrder: step.stepOrder, dueDate: step.dueDate, dueTime: step.dueTime }),
    });
    dispatch({ type: 'UPDATE_STEP', payload: { todoId, step: updated } });
  }, []);

  const deleteStep = useCallback(async (todoId: string, stepId: string) => {
    await apiFetch(`/api/todos/${todoId}/steps/${stepId}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_STEP', payload: { todoId, stepId } });
  }, []);

  const addEvent = useCallback(async (data: Omit<CalendarEvent, 'id'>) => {
    const event = await apiFetch<CalendarEvent>('/api/events', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_EVENT', payload: event });
  }, []);

  const updateEvent = useCallback(async (event: CalendarEvent) => {
    const updated = await apiFetch<CalendarEvent>(`/api/events/${event.id}`, { method: 'PUT', body: JSON.stringify(event) });
    dispatch({ type: 'UPDATE_EVENT', payload: updated });
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_EVENT', payload: id });
  }, []);

  const addDecision = useCallback(async (data: CreateDecisionRequest) => {
    const decision = await apiFetch<Decision>('/api/decisions', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_DECISION', payload: decision });
    return decision;
  }, []);

  const updateDecision = useCallback(async (id: string, data: { title?: string; description?: string; departmentId?: string | null; assigneeUsername?: string | null; boardOnly?: boolean; projectIds?: string[]; policyIds?: string[]; editReason?: string; startDate?: string | null; dueDate?: string | null; newTasks?: Array<Record<string, unknown>> }) => {
    const updated = await apiFetch<Decision>(`/api/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    dispatch({ type: 'UPDATE_DECISION', payload: updated });
  }, []);

  const deleteDecision = useCallback(async (id: string) => {
    await apiFetch(`/api/decisions/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_DECISION', payload: id });
  }, []);

  const approveDecision = useCallback(async (id: string) => {
    const updated = await apiFetch<Decision>('/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'decision', entityId: id }),
    });
    dispatch({ type: 'UPDATE_DECISION', payload: updated });
  }, []);

  // タスク0件の決定事項の手動完了/未完了切替
  const completeDecision = useCallback(async (id: string, done: boolean) => {
    const updated = await apiFetch<Decision>(`/api/decisions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ done }),
    });
    dispatch({ type: 'UPDATE_DECISION', payload: updated });
  }, []);

  // 承認の取り消し（自分の承認のみ・承認待ち・30分以内）
  const undoApproveDecision = useCallback(async (id: string) => {
    const updated = await apiFetch<Decision>('/api/approvals', {
      method: 'DELETE',
      body: JSON.stringify({ entityType: 'decision', entityId: id }),
    });
    dispatch({ type: 'UPDATE_DECISION', payload: updated });
  }, []);

  // 編集の取り消し（承認待ちの間のみ・編集前に復元）
  const undoEditDecision = useCallback(async (id: string) => {
    const updated = await apiFetch<Decision>(`/api/decisions/${id}/undo-edit`, { method: 'POST' });
    dispatch({ type: 'UPDATE_DECISION', payload: updated });
  }, []);

  // 決定事項の中止/中止解除（双方向2名承認フロー）。応答（cancelled/restored/deleteRequested）を反映するため最新を再取得。
  const refreshDecisions = useCallback(async () => {
    const decisions = await apiFetch<Decision[]>('/api/decisions').catch(() => null);
    if (decisions) dispatch({ type: 'SET_DECISIONS', payload: decisions });
  }, []);

  const requestDeleteDecision = useCallback(async (decision: Decision) => {
    await apiFetch('/api/deletions', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'decision', entityId: decision.id }),
    });
    await refreshDecisions();
  }, [refreshDecisions]);

  const cancelDeleteDecision = useCallback(async (decision: Decision) => {
    await apiFetch('/api/deletions', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'decision', entityId: decision.id, cancel: true }),
    });
    await refreshDecisions();
  }, [refreshDecisions]);

  // 実行タスクの中止/中止解除（申請＋本人承認）。cancel=true は申請の取り下げ。
  const requestCancelTask = useCallback(async (taskId: string) => {
    await apiFetch('/api/deletions', { method: 'POST', body: JSON.stringify({ entityType: 'decisionTask', entityId: taskId }) });
    await refreshDecisions();
  }, [refreshDecisions]);

  const undoRequestCancelTask = useCallback(async (taskId: string) => {
    await apiFetch('/api/deletions', { method: 'POST', body: JSON.stringify({ entityType: 'decisionTask', entityId: taskId, cancel: true }) });
    await refreshDecisions();
  }, [refreshDecisions]);

  const updateDecisionTask = useCallback(async (decisionId: string, task: DecisionTask) => {
    const updated = await apiFetch<DecisionTask>(`/api/decisions/${decisionId}/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
    dispatch({ type: 'UPDATE_DECISION_TASK', payload: { decisionId, task: updated } });
  }, []);

  // 5W1H の編集 → 親決定が再承認(pending)に戻る
  const editDecisionTask = useCallback(async (decisionId: string, task: DecisionTask & { projectIds?: string[]; policyIds?: string[] }) => {
    const res = await apiFetch<{ decision: Decision }>(`/api/decisions/${decisionId}/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...task, contentEdit: true }),
    });
    if (res.decision) dispatch({ type: 'UPDATE_DECISION', payload: res.decision });
  }, []);

  // 既存の決定事項に実行タスクを追加。requireApproval=true（決定事項から追加）は再承認、false（実行タスクページから追加）は承認不要。
  const addDecisionTask = useCallback(async (decisionId: string, task: Partial<DecisionTask> & { what: string; projectIds?: string[]; policyIds?: string[] }, requireApproval = false) => {
    const res = await apiFetch<{ decision: Decision }>(`/api/decisions/${decisionId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ ...task, requireApproval }),
    });
    if (res.decision) dispatch({ type: 'UPDATE_DECISION', payload: res.decision });
  }, []);

  // 実行タスクの編集取り消し（このタスクだけ編集前に復元・本人のみ・承認待ちの間）
  const undoEditTask = useCallback(async (decisionId: string, taskId: string) => {
    const res = await apiFetch<{ decision: Decision }>(`/api/decisions/${decisionId}/tasks/${taskId}/undo-edit`, { method: 'POST' });
    if (res.decision) dispatch({ type: 'UPDATE_DECISION', payload: res.decision });
  }, []);

  // ── 部門 CRUD ──
  const addDepartment = useCallback(async (data: { id: string; name: string; sortOrder?: number }) => {
    const dep = await apiFetch<Department>('/api/departments', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_DEPARTMENT', payload: dep });
  }, []);

  const updateDepartment = useCallback(async (id: string, data: { name?: string; sortOrder?: number }) => {
    const dep = await apiFetch<Department>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    dispatch({ type: 'UPDATE_DEPARTMENT', payload: dep });
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    await apiFetch(`/api/departments/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_DEPARTMENT', payload: id });
  }, []);

  // ── メンバー CRUD ──
  const addMember = useCallback(async (data: Partial<Member> & { username: string; name: string; password?: string }) => {
    const m = await apiFetch<Member>('/api/members', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_MEMBER', payload: m });
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Member> & { password?: string }) => {
    const m = await apiFetch<Member>(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    dispatch({ type: 'UPDATE_MEMBER', payload: m });
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_MEMBER', payload: id });
  }, []);

  // ── 集計分類（CategoryOption）── 追加・名称/表示/並び替え（システム管理者のみ：APIで制御）
  const refreshCategories = useCallback(async () => {
    const list = await apiFetch<CategoryOption[]>('/api/categories');
    dispatch({ type: 'SET_CATEGORIES', payload: list });
  }, []);
  const addCategory = useCallback(async (data: { code: string; label: string }) => {
    await apiFetch<CategoryOption>('/api/categories', { method: 'POST', body: JSON.stringify(data) });
    await refreshCategories();
  }, [refreshCategories]);
  const updateCategory = useCallback(async (id: string, data: { label?: string; active?: boolean; sortOrder?: number }) => {
    await apiFetch<CategoryOption>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    await refreshCategories();
  }, [refreshCategories]);

  // ── 実行管理集計区分（SegmentOption）── 決定事項用。追加・名称/表示/並び替え（システム管理者のみ：APIで制御）
  const refreshSegments = useCallback(async () => {
    const list = await apiFetch<SegmentOption[]>('/api/segments');
    dispatch({ type: 'SET_SEGMENTS', payload: list });
  }, []);
  const addSegment = useCallback(async (data: { code: string; label: string }) => {
    await apiFetch<SegmentOption>('/api/segments', { method: 'POST', body: JSON.stringify(data) });
    await refreshSegments();
  }, [refreshSegments]);
  const updateSegment = useCallback(async (id: string, data: { label?: string; active?: boolean; sortOrder?: number }) => {
    await apiFetch<SegmentOption>(`/api/segments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    await refreshSegments();
  }, [refreshSegments]);

  return (
    <StoreContext.Provider value={{
      state, addTodo, updateTodo, deleteTodo,
      addStep, updateStep, deleteStep,
      addEvent, updateEvent, deleteEvent,
      addDecision, updateDecision, deleteDecision, approveDecision, completeDecision, undoApproveDecision, undoEditDecision, updateDecisionTask,
      editDecisionTask, addDecisionTask, undoEditTask, requestDeleteDecision, cancelDeleteDecision,
      requestCancelTask, undoRequestCancelTask,
      addDepartment, updateDepartment, deleteDepartment,
      addMember, updateMember, deleteMember,
      refreshCategories, addCategory, updateCategory,
      refreshSegments, addSegment, updateSegment,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// Label helpers
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高', medium: '中', low: '低',
};

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: '未着手', in_progress: '進行中', done: '完了',
};

export const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', pink: 'bg-pink-500',
  emerald: 'bg-emerald-500', amber: 'bg-amber-500', sky: 'bg-sky-500',
};

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  shared: '共有', private: 'プライベート',
};

export const DECISION_STATUS_LABELS: Record<string, string> = {
  pending: '承認待ち', approved: '承認済み', done: '完了',
};

export const POSITION_LABELS: Record<string, string> = {
  manager: '部長', chief: '課長', staff: '社員',
};

/** メンバー一覧から表示名を解決（見つからなければ username をそのまま返す） */
export function resolveMemberName(members: Member[], username: string | null | undefined): string {
  if (!username) return '未割当';
  return members.find((m) => m.username === username)?.name ?? username;
}
