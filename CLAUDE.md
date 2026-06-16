# WorkPortal — Claude 引継ぎガイド

このファイルは Claude が自動で読み込む設定ファイルです。
新しいセッションを開始した Claude はここから始めてください。

---

## プロジェクト概要

**WorkPortal** — 社内向けタスク管理・カレンダー Web アプリケーション。
Next.js (App Router) + Azure SQL Server + Azure App Service で稼働中。

- 本番 URL: `https://workportal-app-auqexf.azurewebsites.net`
- リポジトリ: GitHub（`main` ブランチが本番に自動デプロイ）
- ローカル開発: `npm run dev` → `http://localhost:3000`

---

## ログイン情報

| ユーザー | パスワード | 名前 | 権限 |
|---|---|---|---|
| `admin` | `admin` | 管理者 | 全タスク管理 |
| `kanri` | `kanri` | 山田 | 自分のタスク管理 |

認証はクッキー（`workportal_auth=username`）で管理。DB ユーザーテーブルなし。
ユーザー定義は [`src/lib/users.ts`](src/lib/users.ts) に定数で記述。

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
| パッケージ管理 | npm |

---

## ディレクトリ構成

```
applippliportal/
├── src/
│   ├── app/
│   │   ├── login/page.tsx        # ログイン画面（アニメーション付き）
│   │   ├── dashboard/page.tsx    # KPI・統計ダッシュボード
│   │   ├── todos/page.tsx        # タスク管理（CRUD・フィルター・工程）
│   │   ├── calendar/page.tsx     # カレンダー（月/週/日/年ビュー）
│   │   ├── about/page.tsx        # サービス紹介
│   │   └── api/
│   │       ├── auth/login/       # POST: ログイン・クッキー設定
│   │       ├── todos/            # GET/POST: タスク一覧・作成
│   │       ├── todos/[id]/       # PUT/DELETE: タスク更新・削除
│   │       ├── todos/[id]/steps/ # POST: 工程作成
│   │       ├── todos/[id]/steps/[sid]/ # PUT/DELETE: 工程更新・削除
│   │       └── events/           # GET/POST/PUT/DELETE: カレンダーイベント
│   ├── components/
│   │   └── Layout/
│   │       ├── AppLayout.tsx     # メインレイアウト（エラーバナー・ローディング）
│   │       ├── ConditionalAppLayout.tsx # /login はサイドバー非表示
│   │       └── Sidebar.tsx       # サイドバー（ユーザー表示・ログアウト）
│   ├── lib/
│   │   ├── store.tsx             # グローバル状態管理（useReducer）
│   │   ├── users.ts              # ユーザー定数（admin / kanri）
│   │   ├── useCurrentUser.ts     # クッキーからログインユーザー取得
│   │   ├── prisma.ts             # Prisma シングルトン
│   │   └── utils.ts              # 汎用ユーティリティ
│   └── types/index.ts            # 型定義（Todo / TodoStep / CalendarEvent）
├── prisma/schema.prisma          # DB スキーマ定義
├── __tests__/                    # テストファイル
├── .claude/agents/               # エージェント定義（manager / coder / tester）
├── CHANGELOG.md                  # デプロイ・変更履歴
└── CLAUDE.md                     # このファイル
```

---

## DB スキーマ（Prisma）

```prisma
model Todo {
  id          String     @id @default(cuid())
  userId      String?    // ログインユーザー名（null = 旧データ）
  title       String
  description String?
  priority    String     // high / medium / low
  status      String     // todo / in_progress / done
  dueDate     String?    // YYYY-MM-DD
  isShared    Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  steps       TodoStep[]
}

model TodoStep {
  id        String    @id @default(cuid())
  todoId    String
  title     String
  stepOrder Int       @default(0)
  done      Boolean   @default(false)
  dueDate   String?   // YYYY-MM-DD（工程の期限日）
  dueTime   String?   // HH:MM（工程の期限時間）
  createdAt DateTime  @default(now())
  todo      Todo      @relation(onDelete: Cascade)
}

model CalendarEvent {
  id          String   @id @default(cuid())
  title       String
  description String?
  date        String   // YYYY-MM-DD
  startTime   String?  // HH:MM
  endTime     String?  // HH:MM
  shareStatus String   // shared / private
  color       String   // indigo / violet / pink / emerald / amber / sky
  todoId      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Azure 環境設定

```
リソースグループ: workportal-rg
App Service:      workportal-app-auqexf
SQL Server:       workportal-sql-auqexf
DB 名:            workportaldb
```

**App Service 環境変数（az webapp config appsettings）**

| 変数名 | 値 |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `HOSTNAME` | `0.0.0.0` |
| `WEBSITES_PORT` | `3000` |
| `WEBSITE_RUN_FROM_PACKAGE` | `0` |
| `DATABASE_URL` | Azure SQL 接続文字列（GitHub Secrets で管理） |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |

起動コマンド: `node /home/site/wwwroot/server.js`

---

## Azure File Share（プロジェクト保管・バックアップ）

プロジェクトのソースコードおよびデプロイバックアップは **Azure File Share** で管理しています。

### 接続情報

| 項目 | 値 |
|---|---|
| ストレージアカウント | `applippliportal` |
| ファイル共有名 | `source` |
| ホスト名 | `applippliportal.file.core.windows.net` |
| ローカルマウント先 | `Z:\` |
| プロジェクト保管パス | `Z:\applippliportal\` |
| デプロイバックアップパス | `Z:\backups\deploy_YYYYMMDD_HHMMSS.zip` |

### Z: ドライブのマウント方法（Windows）

```powershell
$connectTestResult = Test-NetConnection -ComputerName applippliportal.file.core.windows.net -Port 445
if ($connectTestResult.TcpTestSucceeded) {
    cmd.exe /C "cmdkey /add:`"applippliportal.file.core.windows.net`" /user:`"localhost\applippliportal`" /pass:`"<ストレージキー>`""
    New-PSDrive -Name Z -PSProvider FileSystem -Root "\\applippliportal.file.core.windows.net\source" -Persist
}
```

> **ストレージキー・GitHub トークン・SQL パスワードの入手先：** `Z:\applippliportal\SECRETS.md` に記載されています（gitignore済み・GitHub には上がらない）。
> GitHub Secrets にも `AZURE_STORAGE_KEY` として登録済み（CI/CD で使用）。

### デプロイ時の自動バックアップ

GitHub Actions でデプロイするたびに `deploy.zip` が Azure File Share へ自動保存されます。

```
Z:\backups\deploy_20260616_094432.zip   ← 各デプロイの ZIP
Z:\applippliportal\                     ← ソースコード一式
```

ワークフロー内のバックアップステップ（`.github/workflows/azure-deploy.yml`）：
```yaml
- name: Backup deploy.zip to Azure File Share
  run: |
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    az storage file upload \
      --account-name applippliportal \
      --account-key "${{ secrets.AZURE_STORAGE_KEY }}" \
      --share-name source \
      --source deploy.zip \
      --path "backups/deploy_${TIMESTAMP}.zip"
```

---

## 開発環境のセットアップ（全PC共通）

**ソースコードは `Z:\applippliportal` を直接使用します。ローカルにはコピーしません。**
**`node_modules` のみ各PCのローカル（`C:\workportal_modules`）に置きます。**
（Azure File Share は SMB の制限で `node_modules` を置けないため）

### 初回セットアップ（新しい PC）

**`Z:\applippliportal\SECRETS.md` に完全な手順とストレージキーが記載されています。**
新規PCはそちらを参照してください（Step 1〜3 が全部書いてある）。

概要：
1. `SECRETS.md` の Step 1 コマンドで Z: をマウント
2. `Z:\applippliportal\setup.ps1` を実行（git・node_modules 自動設定）
3. `Z:\applippliportal\dev.ps1` で起動 → `http://localhost:3000`

### 2回目以降

```powershell
# 起動スクリプトを実行するだけ
Z:\applippliportal\dev.ps1
```

### DB スキーマ変更時

```powershell
# prisma コマンドは node_modules が必要なため、ローカルの npx を使う
$env:NODE_PATH = "C:\workportal_modules\node_modules"
Set-Location "Z:\applippliportal"
& "C:\workportal_modules\node_modules\.bin\prisma.cmd" db push

# ※ CI（GitHub Actions）では prisma db push を実行しない
# ※ スキーマ変更は必ずここから手動適用
```

### ファイル構成（PC ごと）

```
Z:\applippliportal\          ← ソースコード（全PC共通）
  src/, prisma/, .env, etc.
  dev.ps1                    ← 開発サーバー起動スクリプト
  setup.ps1                  ← 初回セットアップスクリプト

C:\workportal_modules\       ← 各PCのローカル（自動作成）
  node_modules\              ← npm パッケージ（~300 MB）
  package.json               ← Z: からコピー
```

### 注意事項

- ソースファイルの編集は `Z:\applippliportal\src\` 直接（VS Code で開く）
- `node_modules` は `C:\workportal_modules\` （自動管理、手動操作不要）
- `package.json` を変更したら `setup.ps1` を再実行して node_modules を更新
- 複数人が同時に `npm run dev` すると競合する可能性があるため、同時作業は避ける
- コード変更後は必ず `git add / commit / push` して GitHub を最新に保つ

---

## デプロイフロー

`main` ブランチに push すると GitHub Actions が自動実行：

```
1. npm ci
2. npx prisma generate   （クライアント生成のみ）
3. npm run build          （Next.js standalone ビルド）
4. ZIP 作成               （.next/standalone + static + public）
5. az webapp stop         （continue-on-error: true）
6. azure/webapps-deploy@v3
7. az webapp start        （if: always() — 必ず再起動）
```

---

## 実装済み機能

| 機能 | 説明 |
|---|---|
| ログイン | クッキー認証・スライドアニメーション |
| ルート保護 | Next.js Middleware（未認証 → /login リダイレクト） |
| ダッシュボード | KPI カード・完了率・本日の予定 |
| タスク管理 | CRUD・優先度/ステータス/期限・フィルター・検索・ソート |
| タスク工程 | 工程追加・完了チェック・期限日時・進捗バー |
| マルチユーザー | admin / kanri ユーザー分離・共有タスク機能 |
| カレンダー | 月/週/日/年ビュー・時間帯伸縮・時刻表示 |
| ダークモード | next-themes（light / dark / system） |
| モバイル対応 | レスポンシブレイアウト |

---

## エージェント体制

このプロジェクトは 3 エージェント体制で開発を進める。

| エージェント | ロール | 責務 |
|---|---|---|
| **マネージャー** | ユーザー対話・調整 | 要件整理、タスク分解、コーダー/テスターへの指示、成果物レビュー |
| **コーダー** | 実装 | Next.js コンポーネント・API ルート・ロジックの実装 |
| **テスター** | 品質保証 | ユニットテスト・統合テスト作成、バグ検出・報告 |

```
ユーザー
  └→ マネージャー（要件受信・タスク分解）
        ├→ コーダー（実装）
        └→ テスター（テスト作成・検証）
             └→ マネージャー（結果まとめ・ユーザーへ報告）
```

エージェント定義: [`.claude/agents/`](.claude/agents/)

---

## Claude への作業ルール

### ソース変更後の必須確認

**ソースコードを変更・実装した後は、必ず最後に以下を聞くこと：**

> 「デプロイしますか？」

ユーザーが「はい」と答えた場合：
1. `git add` → `git commit` → `git push` を実行（`main` ブランチへ push で自動デプロイ）
2. デプロイ完了後、`CHANGELOG.md` に変更内容を追記する

### CHANGELOG.md の更新ルール

デプロイ後は `CHANGELOG.md` の先頭に以下の形式で追記すること：

```markdown
## [YYYY-MM-DD] 変更タイトル

### 追加
- 追加した機能の説明

### 変更
- 変更した内容の説明

### 修正
- 修正したバグの説明
```

更新完了後、追記した内容をチャットにリスト形式で表示すること。

### デプロイ完了後の必須対応

以下を順番に実施すること：

1. **テスターエージェントを呼び出し**、本番 URL へのアクセスチェックを実施する
   - 確認項目：トップページ表示・ログイン・主要機能の動作
   - 異常があればチャットに報告する

2. CHANGELOG.md の更新内容をチャットにリスト形式で表示する

3. 本番 URL をリンクで記載する：
   `[WorkPortal](https://workportal-app-auqexf.azurewebsites.net)`

---

## 既知の制約・注意事項

- ユーザー認証は定数管理（DB なし）。ユーザー追加は `src/lib/users.ts` を編集してデプロイが必要
- `prisma db push` は CI に含めない（タイムアウトリスク）。スキーマ変更はローカルから手動適用
- Cookie の `httpOnly: false`（クライアント JS からユーザー名を読む設計上の制約）
- カレンダーの時刻計算は分単位（秒未満は非対応）
- 詳細な変更履歴は [`CHANGELOG.md`](CHANGELOG.md) を参照
