import Link from 'next/link';

// WorkPortal 早わかりルールブック（社内配布用・アプリ内ヘルプ）
// 内容は docs/BASE_DESIGN.md（権限・表示の確定仕様）に厳密準拠。
// 専門用語（内部フィールド名）は使わず、画面の言葉に翻訳して記載する。

export const metadata = { title: '早わかりルールブック | WorkPortal' };

function Section({ id, no, title, children }: { id: string; no: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-sm">{no}</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

const th = 'px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap';
const td = 'px-3 py-2 align-top border-b border-slate-100 dark:border-slate-800';

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20 space-y-8">
      {/* ヘッダー */}
      <header className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">WorkPortal 早わかりルールブック</h1>
            <p className="text-sm text-white/80 mt-0.5">「誰に何が見えて、誰が何をできるか」をまとめた早わかり版です。</p>
          </div>
        </div>
      </header>

      {/* 役職の定義 */}
      <Card className="bg-slate-50 dark:bg-slate-900/60">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">まず：役職の呼び方</h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          <li><b>取締役</b>＝取締役・代表取締役。<span className="text-slate-500">承認と全体閲覧の基準になる役職。</span></li>
          <li><b>顧問</b>＝取締役会メンバーだが<b>承認はできない</b>（権限は社員相当）。</li>
          <li><b>取締役会メンバー</b>＝取締役・代表取締役・顧問。</li>
          <li><b>担当部長</b>＝その部門の部長（部門が一致する部長）。</li>
          <li><b>課長・社員</b>＝一般メンバー。</li>
          <li><b>管理者</b>＝システム管理担当（組織管理）。</li>
        </ul>
      </Card>

      {/* 1. 早見表 */}
      <Section id="cheat" no="1" title="権限の早見表（これだけ覚えればOK）">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className={th}>種類</th>
                <th className={th}>作成</th>
                <th className={th}>編集</th>
                <th className={th}>承認</th>
                <th className={th}>削除</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}><b>方針</b></td>
                <td className={td}>取締役</td>
                <td className={td}>取締役<br /><span className="text-xs text-amber-600 dark:text-amber-400">編集すると再承認</span></td>
                <td className={td}>取締役 <b>2名</b>（別の人）</td>
                <td className={td}>取締役2名の承認</td>
              </tr>
              <tr>
                <td className={td}><b>プロジェクト</b></td>
                <td className={td}>担当部長＋取締役<br /><span className="text-xs text-slate-500">部長は自部門のみ</span></td>
                <td className={td}>担当部長＋取締役<br /><span className="text-xs text-amber-600 dark:text-amber-400">編集すると再承認</span></td>
                <td className={td}>取締役 <b>2名</b><br /><span className="text-xs text-rose-500">部長は承認不可</span></td>
                <td className={td}>申請=担当部長＋取締役／実削除=取締役2名</td>
              </tr>
              <tr>
                <td className={td}><b>決定事項</b></td>
                <td className={td}>誰でも（ログイン者）</td>
                <td className={td}>起案者・担当者・担当部長・取締役<br /><span className="text-xs text-amber-600 dark:text-amber-400">編集すると再承認</span></td>
                <td className={td}>担当部長 <b>1名</b>＋取締役 <b>1名</b><br /><span className="text-xs text-slate-500">📢全社通達・🔒取締役会限定は取締役2名</span></td>
                <td className={td}>起案者・担当者・担当部長・取締役<br /><span className="text-xs text-slate-500">（承認要件を満たして削除）</span></td>
              </tr>
              <tr>
                <td className={td}><b>実行タスク</b></td>
                <td className={td}>決定事項にひも付けて作成<br /><span className="text-xs text-slate-500">後から足すのは部長以上</span></td>
                <td className={td}>起案者・担当者・担当部長・取締役</td>
                <td className={td}><span className="text-slate-500">—（決定事項側で承認）</span></td>
                <td className={td}>担当者・担当部長・取締役<br /><span className="text-xs text-rose-500">起案者は編集できるが削除は不可</span></td>
              </tr>
              <tr>
                <td className={td}><b>個人タスク</b></td>
                <td className={td}>本人</td>
                <td className={td}>本人・担当部長・取締役</td>
                <td className={td}><span className="text-slate-500">—（承認なし）</span></td>
                <td className={td}>本人・担当部長・取締役</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">※ 権限の無い操作は、ボタン自体が表示されません（押せる操作＝あなたに権限がある操作です）。</p>
        </Card>
      </Section>

      {/* 2. 全体像（階層） */}
      <Section id="hierarchy" no="2" title="全体像：4つの階層とつながり">
        <Card>
          <div className="flex flex-col items-center gap-1 text-center">
            {[
              { n: '方針', d: '会社の大きな方向性', c: 'from-violet-500 to-violet-600' },
              { n: 'プロジェクト', d: '方針を実現する取り組み', c: 'from-indigo-500 to-indigo-600' },
              { n: '決定事項', d: '「決めたこと」', c: 'from-sky-500 to-sky-600' },
              { n: '実行タスク', d: '決定を実行する具体作業（5W1H）', c: 'from-emerald-500 to-emerald-600' },
            ].map((x, i) => (
              <div key={x.n} className="flex flex-col items-center gap-1 w-full">
                <div className={`w-full max-w-md rounded-xl bg-gradient-to-r ${x.c} text-white px-4 py-2.5`}>
                  <span className="font-bold">{x.n}</span>
                  <span className="text-white/85 text-xs ml-2">{x.d}</span>
                </div>
                {i < 3 && <span className="text-slate-400 text-lg leading-none">▼</span>}
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li>・<b>決定事項</b>には、その実行手段である<b>実行タスク（5W1H）</b>を何件でもひも付けられます。</li>
            <li>・実行タスクの<b>全件が完了</b>すると、その決定事項は<b>自動で「完了」</b>になります。</li>
            <li>・あとから決定事項にタスクを足せるのは<b>部長以上</b>。決定事項カードから足すと再承認になります（実行タスク画面から足すと即時）。</li>
          </ul>
        </Card>
      </Section>

      {/* 3. 表示範囲 */}
      <Section id="visibility" no="3" title="誰に何が見える？（表示範囲）">
        <div className="grid sm:grid-cols-3 gap-3">
          <Card>
            <p className="font-bold text-indigo-600 dark:text-indigo-400">取締役会メンバー</p>
            <p className="text-xs text-slate-500 mb-1">取締役・代表・顧問</p>
            <p><b>全体</b>が見えます。</p>
          </Card>
          <Card>
            <p className="font-bold text-indigo-600 dark:text-indigo-400">部長</p>
            <p className="text-xs text-slate-500 mb-1">担当部長</p>
            <p><b>自部門に関係するもの</b>＋自分が関わるものが見えます。</p>
          </Card>
          <Card>
            <p className="font-bold text-indigo-600 dark:text-indigo-400">課長・社員</p>
            <p className="text-xs text-slate-500 mb-1">一般メンバー</p>
            <p><b>自分が関与するもの</b>が見えます。</p>
          </Card>
        </div>
        <Card>
          <p className="font-semibold mb-1">特別な扱い</p>
          <ul className="space-y-1.5">
            <li>📢 <b>全社通達</b>（部門＝全社の決定事項）… <b>全員</b>に表示されます。</li>
            <li>🔒 <b>取締役会限定</b> … <b>取締役会メンバーと該当する担当部長のみ</b>表示・作成できます。</li>
            <li>🗺️ <b>方針ビジュアル</b>（プロジェクト画面のビジュアルタブの方針）… <b>全員が全方針を閲覧可</b>。ただしその配下のプロジェクト・決定・タスクは、上の表示範囲どおりに絞られます。</li>
          </ul>
          <p className="text-xs text-slate-500 mt-2">※「関与」＝あなたが起案者・担当者・実行タスクの担当・承認者のいずれかであること。</p>
        </Card>
      </Section>

      {/* 4. 承認のルール */}
      <Section id="approval" no="4" title="承認のルール">
        <Card>
          <ul className="space-y-2">
            <li>・<b>方針／プロジェクト</b>の承認は<b>取締役2名</b>（別々の人）。<b>部長は承認できません</b>。</li>
            <li>・<b>決定事項</b>の承認は<b>担当部長1名＋取締役1名</b>（別々の人）。ただし📢全社通達・🔒取締役会限定は<b>取締役2名</b>。</li>
            <li>・<b>編集すると承認はリセット</b>され、もう一度承認が必要です（再承認）。承認待ちの間は変更内容（前→後）が表示されます。</li>
            <li>・<b>同じ人が二重に承認はできません</b>（承認済みは「✓承認済み」になります）。承認待ちは「あと◯名」が表示されます。</li>
            <li>・<b>承認の取り消し</b>は、自分の承認・まだ2名に達していない・<b>承認から30分以内</b>のときだけ可能です。</li>
            <li>・承認は<b>必ず本人がブラウザで操作</b>してください（代理実行は安全上ブロックされます）。</li>
          </ul>
        </Card>
      </Section>

      {/* 5. 削除・編集 */}
      <Section id="delete" no="5" title="削除・編集のときの注意">
        <Card>
          <ul className="space-y-2">
            <li>・<b>削除は申請→承認</b>で実行されます（方針・プロジェクト・決定事項）。承認要件は早見表の「削除」列のとおり。</li>
            <li>・<b>実行タスクの削除</b>は<b>担当者・担当部長・取締役</b>。<span className="text-rose-600 dark:text-rose-400">起案者（入力した人）は編集はできますが削除はできません。</span></li>
            <li>・<b>実行タスクの進捗（未着手／進行中／完了）の変更は再承認不要</b>です。内容（5W1H・タグ）を変えたときだけ、そのタスクについて再承認になります。</li>
            <li>・<b>編集の取り消し</b>は、承認待ちの間・<b>編集した本人</b>だけが行えます（編集前の状態に戻ります）。</li>
          </ul>
        </Card>
      </Section>

      {/* 6. 個人タスク・共有タスク・期限 */}
      <Section id="tasks" no="6" title="個人タスク・共有タスク・期限">
        <div className="grid sm:grid-cols-2 gap-3">
          <Card>
            <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">個人タスク</p>
            <p>自分の作業を管理するタスクです（5W1H＋優先度＋公開設定）。編集・削除できるのは<b>本人・担当部長・取締役</b>。</p>
          </Card>
          <Card>
            <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">共有タスク（「共有」タブ）</p>
            <p><b>公開設定した個人タスク</b>と、<b>📢全社通達の実行タスクで担当が自分でないもの</b>が表示されます（担当が自分なら「自分」タブにも出ます）。</p>
          </Card>
        </div>
        <Card className="bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/40">
          <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">⏰ 期限のルール</p>
          <p>期限は<b>完了予定日の 15:00（日本時間）を過ぎると「期限超過」</b>になります。ダッシュボードの「期限超過」から該当タスク・決定事項に移動できます。</p>
        </Card>
      </Section>

      <p className="text-xs text-slate-400 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
        このルールブックは権限・表示の確定仕様にもとづいて作成しています。運用で不明点があれば管理部までご連絡ください。
      </p>
      <div className="text-center">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
          ← ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
