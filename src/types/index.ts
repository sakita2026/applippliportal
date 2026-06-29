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

export interface TodoStep {
  id: string;
  todoId: string;
  title: string;
  stepOrder: number;
  done: boolean;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TodoStatus;
  dueDate?: string;
  startDate?: string | null;   // 開始日
  why?: string | null;         // なぜ
  who?: string | null;         // 誰が（担当）
  whereLoc?: string | null;    // どこで
  how?: string | null;         // どうやって
  departmentId?: string | null;// 担当部門
  completedAt?: string | null; // 完了日時
  isShared?: boolean;
  createdAt: string;
  steps?: TodoStep[];
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

// ---------------------------------------------------------------------------
// 決定事項 / 5W1H タスク
// ---------------------------------------------------------------------------

/** 決定事項のステータス（承認待ち / 承認済み・稼働中 / 完了） */
export type DecisionStatus = 'pending' | 'approved' | 'done';

export interface Department {
  id: string;
  name: string;
  sortOrder: number;
}

/** 役職（部署内のポジション） */
export type Position = 'manager' | 'chief' | 'staff';

/** システム権限 */
export type MemberRole = 'admin' | 'member';

/** 認証方式 */
export type AuthType = 'password' | 'email';

/** メンバー（社員）。パスワードは API レスポンスに含めない。 */
export interface Member {
  id: string;
  username: string;
  name: string;
  initials: string;
  email?: string | null;
  authType: AuthType;
  role: MemberRole;
  departmentId?: string | null;
  position?: Position | null;
  isDirector: boolean;
  isRepresentative: boolean;
  isAdvisor: boolean;
  active: boolean;
}

/** 決定事項に紐づく 5W1H タスク */
export interface DecisionTask {
  id: string;
  decisionId: string;
  what: string;          // 何を
  why?: string;          // なぜ
  who?: string;          // 誰が（担当 username）
  whereLoc?: string;     // どこで
  whenDue?: string;      // いつ（期限 YYYY-MM-DD）
  how?: string;          // どうやって
  departmentId?: string; // 部門
  status: TodoStatus;
  completedAt?: string | null; // 完了日時
  createdBy?: string | null; // 実行タスクの作成者 username
  startDate?: string | null; // 開始日 YYYY-MM-DD（whenDue を完了予定日として扱う）
  pendingEdit?: boolean;  // このタスク自体が再承認待ち（承認まで一覧で非表示）
  editedBy?: string | null; // このタスクを直近に編集した人（取り消しはこの人のみ可）
  sortOrder: number;
  createdAt: string;
  projects?: DecisionProjectLink[];
  policies?: DecisionPolicyLink[];
}

/** 決定事項に紐づくプロジェクト（タグ） */
export interface DecisionProjectLink {
  projectId: string;
  project: { id: string; name: string };
}

/** 決定事項に紐づく方針（タグ） */
export interface DecisionPolicyLink {
  policyId: string;
  policy: { id: string; name: string };
}

/** 決定事項 */
export interface Decision {
  id: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  createdBy: string;
  departmentId?: string | null;
  assigneeUsername?: string | null; // 担当者（だれが）
  boardOnly?: boolean;
  deleteRequested?: boolean;
  everApproved?: boolean;
  hasPrevState?: boolean;     // 承認待ち中に「編集の取り消し」が可能か
  editedBy?: string | null;   // 直近に編集した人（取り消しはこの人のみ可）
  startDate?: string | null;  // 開始日 YYYY-MM-DD
  dueDate?: string | null;    // 完了予定日 YYYY-MM-DD
  completedAt?: string | null; // 完了日時
  editNote?: string | null;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  tasks: DecisionTask[];
  projects?: DecisionProjectLink[];
  policies?: DecisionPolicyLink[];
  approvals?: DecisionApproval[];
  deleteApprovals?: DecisionApproval[];
}

/** 承認の進捗（誰が承認したか）。pending 中でも「あと何名」を表示するために使う */
export interface DecisionApproval {
  approver: string;
  asDirector: boolean;
  asManager: boolean;
  createdAt?: string;
}

/** 決定事項の作成リクエスト（5W1H タスクを内包） */
export interface CreateDecisionRequest {
  title: string;
  description?: string;
  tasks: Array<Omit<DecisionTask, 'id' | 'decisionId' | 'status' | 'sortOrder' | 'createdAt'>>;
  projectIds?: string[];
  policyIds?: string[];
  departmentId?: string;
  assigneeUsername?: string;
  boardOnly?: boolean;
  startDate?: string;
  dueDate?: string;
}
