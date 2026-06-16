# Changelog

WorkPortal のデプロイ・変更履歴。

---

## [2026-06-16] マルチユーザー対応・バグ修正

### 追加
- **マルチユーザーサポート** (`612450c`)
  - `admin/admin`・`kanri/kanri` の2ユーザー対応（`users.ts` 定数管理）
  - ログイン時に `workportal_auth` クッキーへユーザー名を保存
  - `useCurrentUser` フックでクライアント側のログインユーザー取得
  - サイドバーにログイン中のユーザー名・イニシャルを表示
  - Prisma `Todo` モデルに `userId`・`isShared` フィールドを追加
  - タスク画面に「自分のタスク / 共有タスク」タブ切替
  - タスク作成フォームに共有トグルを追加
  - 他ユーザーのタスクにはオーナーバッジを表示

- **カレンダー週・日ビューの時間枠表示** (`deb0331`)
  - イベントが `startTime`〜`endTime` の時間幅に合わせて縦に伸縮（絶対配置）
  - 例）9:00〜12:00 のイベントはブロック内に 3 時間分のスペースを占有
  - イベントブロック内に時間帯（例：`9:00 〜 12:00`）を表示
  - 日ビューではブロックが十分な高さのとき説明文も表示

- **月ビューへの時間表示** (`71ddf24`)
  - イベントチップのタイトル右に時間帯を表示（例：`会議 9:00～12:00`）

- **ログイン API ルートの追加** (`fc94db0`)
  - `POST /api/auth/login` をサーバーサイドに移動
  - クライアントバンドルに認証ロジックが混入しない構成に変更

### 修正
- **プライベートタスクの漏洩バグ修正** (`756f890`)
  - `userId` が `null` のタスクが全ユーザーに見えていた問題を修正
  - フロントエンドの「自分のタスク」フィルターを `t.userId === currentUser.username` のみに限定
  - DBの既存タスク（`userId = null`）を `userId = 'admin'` へ移行済み

- **403エラー（アプリ停止）の恒久対策** (`6671e3d`, `6fa952b`)
  - GitHub Actions の `Start app` ステップに `if: always()` を追加
  - `Stop app` ステップに `continue-on-error: true` を追加
  - Kudu による `node_modules` 検証ステップを削除（スタンドアロンビルドでは不要）
  - →デプロイ途中でエラーが起きてもアプリが必ず再起動されるように

- **CI の prisma db push 削除** (`c13bf1b`)
  - CI で `prisma db push` を実行するとタイムアウト・失敗の原因になるため削除
  - スキーマ変更はローカルから直接 `npx prisma db push` で適用する運用に変更

---

## [2026-06-15] ログイン画面・初期リリース

### 追加
- **ログインアニメーション最終形** (`a2f6e64`)
  - 背景レイヤーが左スライド、カードレイヤーが右スライドして背後のダッシュボードが現れる 2 層アニメーション

- **ログイン画面リデザイン** (`4105fdb`)
  - 左パネル（55%）：インディゴグラデーション + ブランドメッセージ + 機能一覧
  - 右パネル（45%）：ホワイトフォーム + スライドインアニメーション
  - モバイル対応（左パネル非表示）

- **ログアウトボタン** (`c221ab2`)
  - サイドバー（デスクトップ）・モバイルヘッダーにログアウトボタン追加
  - ログイン画面を左右スプリットカーテンアニメーションに変更

- **ルート保護・ログイン画面初期実装** (`475163d`)
  - `admin/admin` 認証・クッキーセッション
  - スプリットカーテンアニメーション（上下パネル）
  - グラスモーフィズムカード・背景オーブアニメーション
  - パスワード表示切替・ローディング/成功/エラー状態
  - `ConditionalAppLayout`：`/login` ではサイドバー非表示
  - Next.js Middleware による未認証リダイレクト

- **WorkPortal 初期実装** (`2b4a372`)
  - ダッシュボード：Bento Grid、KPI カード、アクティビティフィード
  - カレンダー：日・週・月・年ビュー、共有機能
  - タスク管理：優先度・ステータス・フィルター
  - ダークモード対応（next-themes）
  - モバイルレスポンシブ・サイドバーレイアウト
  - Azure SQL（Prisma v5）永続化レイヤー
  - Todos・Events の REST API ルート
  - Azure App Service デプロイ（GitHub Actions CI/CD）

- **タスクステップ管理** (`7486792`)
  - `TodoStep` Prisma モデル追加（カスケード削除）
  - `POST/PUT/DELETE /api/todos/[id]/steps` API
  - タスクフォームにステップエディター（追加・削除・Enter で次へ）
  - タスク一覧に折りたたみ式ステップリスト・進捗バー

### 修正
- **Azure デプロイ安定化** (`3d46b09`, `ae452fd`, `c0ef73c`, `9a758ab`, `9ca7d1c`)
  - `azure/webapps-deploy@v3` に切り替え
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=false` で Oryx ビルドを無効化
  - スタンドアロン出力パス修正（`outputFileTracingRoot` 設定）
  - サービスプリンシパル認証への切り替え
  - `prisma migrate deploy` → `prisma db push` に変更（Azure SQL 対応）
  - 起動コマンドを `node server.js` に設定

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|---|---|---|
| Next.js | 16.2.9 | フレームワーク（App Router / standalone） |
| React | 19.2.4 | UI ライブラリ |
| TypeScript | 5.x | 型安全な JS |
| Tailwind CSS | 4.x | スタイリング |
| date-fns | 4.4.0 | 日付フォーマット |
| next-themes | 0.4.6 | ライト/ダーク切替 |
| Heroicons | 2.2.0 | SVG アイコン |

### バックエンド / データ

| 技術 | バージョン | 用途 |
|---|---|---|
| Next.js API Routes | 16.2.9 | REST API（フルスタック） |
| Prisma | 5.22.0 | ORM / スキーマ管理 |
| Azure SQL Server | - | クラウド RDB |

### テスト

| 技術 | バージョン | 用途 |
|---|---|---|
| Jest | 30.4.2 | テストランナー |
| React Testing Library | 16.3.2 | コンポーネントテスト |
| user-event | 14.6.1 | ユーザー操作シミュレート |

### インフラ / CI・CD

| 技術 | 詳細 |
|---|---|
| Azure App Service | Linux / Node 22 / Japan East |
| Azure SQL Server | `workportal-sql-auqexf.database.windows.net` |
| GitHub Actions | `main` push → ビルド → ZIP デプロイ → 起動 |
| デプロイ形式 | Next.js standalone + ZIP |
