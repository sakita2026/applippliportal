'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Todo, CalendarEvent, Priority, TodoStatus, ShareStatus } from '@/types';

// State
interface StoreState {
  todos: Todo[];
  events: CalendarEvent[];
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
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
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
    case 'ADD_EVENT': return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map((e) => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload) };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    default: return state;
  }
}

// Context
interface StoreContextValue {
  state: StoreState;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => Promise<void>;
  updateTodo: (todo: Todo) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

// API helpers
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'APIエラーが発生しました');
  }
  return res.json() as Promise<T>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    todos: [],
    events: [],
    loading: true,
    error: null,
  });

  // Initial data fetch
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
      .catch((err) => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  const addTodo = useCallback(async (data: Omit<Todo, 'id' | 'createdAt'>) => {
    const todo = await apiFetch<Todo>('/api/todos', { method: 'POST', body: JSON.stringify(data) });
    dispatch({ type: 'ADD_TODO', payload: todo });
  }, []);

  const updateTodo = useCallback(async (todo: Todo) => {
    const updated = await apiFetch<Todo>(`/api/todos/${todo.id}`, { method: 'PUT', body: JSON.stringify(todo) });
    dispatch({ type: 'UPDATE_TODO', payload: updated });
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    await apiFetch(`/api/todos/${id}`, { method: 'DELETE' });
    dispatch({ type: 'DELETE_TODO', payload: id });
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

  return (
    <StoreContext.Provider value={{ state, addTodo, updateTodo, deleteTodo, addEvent, updateEvent, deleteEvent }}>
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
