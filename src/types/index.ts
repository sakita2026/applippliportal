/**
 * プロジェクト共通 TypeScript 型定義
 */

// ---------------------------------------------------------------------------
// 汎用ユーティリティ型
// ---------------------------------------------------------------------------

/** Nullable: T または null */
export type Nullable<T> = T | null;

/** Optional: T または undefined */
export type Optional<T> = T | undefined;

/** MaybeNull: T、null、または undefined */
export type MaybeNull<T> = T | null | undefined;

/** オブジェクトの特定キーを必須にする */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** オブジェクトの特定キーをオプションにする */
export type PartialKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// API 共通型
// ---------------------------------------------------------------------------

/** API レスポンスの共通ラッパー型 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/** ページネーション情報 */
export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** ページネーション付きリストレスポンス */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// UI 共通型
// ---------------------------------------------------------------------------

/** コンポーネントの基本プロパティ */
export interface BaseComponentProps {
  className?: string;
  id?: string;
}

/** 読み込み状態を持つコンポーネントのプロパティ */
export interface WithLoadingProps {
  isLoading?: boolean;
}

/** エラー状態を持つコンポーネントのプロパティ */
export interface WithErrorProps {
  error?: string | null;
}

// ---------------------------------------------------------------------------
// ユーザー関連型
// ---------------------------------------------------------------------------

/** ユーザー情報の基本型 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/** ユーザー作成リクエスト */
export type CreateUserRequest = Pick<User, "name" | "email">;

/** ユーザー更新リクエスト */
export type UpdateUserRequest = Partial<Pick<User, "name" | "email">>;

// ---------------------------------------------------------------------------
// 作業管理型
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';
export type TodoStatus = 'todo' | 'in_progress' | 'done';
export type EventColor = 'indigo' | 'violet' | 'pink' | 'emerald' | 'amber' | 'sky';
export type CalendarView = 'day' | 'week' | 'month' | 'year';
export type ShareStatus = 'shared' | 'private';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TodoStatus;
  dueDate?: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  shareStatus: ShareStatus;
  color: EventColor;
  todoId?: string;
}
