export const meta = {
  name: 'dev-team',
  description: 'マネージャー・コーダー・テスターの3エージェントで機能開発を実行する',
  phases: [
    { title: '要件分析', detail: 'マネージャーが要件を分析しタスクを分解' },
    { title: '実装', detail: 'コーダーが機能を実装' },
    { title: 'テスト', detail: 'テスターがテストを作成・検証' },
    { title: '報告', detail: 'マネージャーが結果をまとめてユーザーへ報告' },
  ],
}

// args: { request: "ユーザーからの機能要件" }
const userRequest = args?.request ?? 'プロジェクトの初期セットアップを行ってください'

// Phase 1: マネージャーが要件分析・タスク分解
phase('要件分析')
const plan = await agent(
  `あなたは開発マネージャーです。
以下のユーザー要件を分析し、コーダーとテスターへの具体的な指示に分解してください。

【ユーザー要件】
${userRequest}

プロジェクト: Next.js + TypeScript + Tailwind CSS の Web アプリ

以下の形式でJSONを返してください:
{
  "summary": "要件の簡潔なまとめ",
  "coder_tasks": ["実装タスク1", "実装タスク2"],
  "tester_tasks": ["テストタスク1", "テストタスク2"],
  "notes": "マネージャーからの補足・注意事項"
}`,
  {
    label: 'manager:plan',
    phase: '要件分析',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        coder_tasks: { type: 'array', items: { type: 'string' } },
        tester_tasks: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['summary', 'coder_tasks', 'tester_tasks', 'notes'],
    },
  }
)

log(`マネージャーが計画を作成: ${plan.summary}`)

// Phase 2: コーダーが実装
phase('実装')
const coderResult = await agent(
  `あなたは Next.js + TypeScript + Tailwind CSS の実装担当コーダーです。

【マネージャーからの実装指示】
${plan.coder_tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

【補足】
${plan.notes}

プロジェクトルート: C:\\Users\\sakita\\Documents\\applippliportal

指示に従ってコードを実装し、作成・変更したファイルの一覧と実装内容のサマリーを返してください。`,
  { label: 'coder:implement', phase: '実装' }
)

log('コーダーが実装完了')

// Phase 3: テスターがテスト作成・実行
phase('テスト')
const testerResult = await agent(
  `あなたは Jest + React Testing Library を使うテスト担当です。

【マネージャーからのテスト指示】
${plan.tester_tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

【コーダーの実装結果】
${coderResult}

プロジェクトルート: C:\\Users\\sakita\\Documents\\applippliportal

テストコードを作成し、実行してください。結果（パス数・失敗数・発見したバグ）を報告してください。`,
  { label: 'tester:verify', phase: 'テスト' }
)

log('テスターが検証完了')

// Phase 4: マネージャーが結果をまとめてユーザーへ報告
phase('報告')
const report = await agent(
  `あなたは開発マネージャーです。以下の情報をもとに、ユーザーへの最終報告をまとめてください。

【元のユーザー要件】
${userRequest}

【実装結果】
${coderResult}

【テスト結果】
${testerResult}

日本語で、分かりやすい最終報告書を作成してください。
- 何を実装したか
- テスト結果（問題があれば内容と対処方法）
- 次のステップの提案`,
  { label: 'manager:report', phase: '報告' }
)

return {
  plan,
  coder_result: coderResult,
  tester_result: testerResult,
  final_report: report,
}
