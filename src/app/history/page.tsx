'use client';

import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type Row = {
  id: string; entityType: 'policy' | 'project' | 'decision'; entityId: string; title: string;
  action: 'approve' | 'delete_approve' | 'deleted' | 'edit';
  actor: string; actorName: string; actorDept?: string; asDirector: boolean; asManager: boolean; detail: string | null; createdAt: string;
  assigneeNames?: string | null;
  creatorNames?: string | null;
};

const TYPE_LABEL: Record<string, string> = { policy: '方針', project: 'プロジェクト', decision: '決定事項' };
const TYPE_BADGE: Record<string, string> = {
  policy: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
  project: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
  decision: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600',
};
const ACTION_LABEL: Record<string, string> = { approve: '承認', delete_approve: '削除承認', deleted: '削除実行', edit: '編集' };
const ACTION_BADGE: Record<string, string> = {
  approve: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800',
  delete_approve: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800',
  deleted: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-200 dark:border-rose-800',
  edit: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800',
};
const fld = 'px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400';

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'all' | 'policy' | 'project' | 'decision'>('all');
  const [action, setAction] = useState<'all' | 'approve' | 'delete_approve' | 'deleted'>('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchRows = () => fetch('/api/audit').then((r) => r.ok ? r.json() : []).then((d) => { if (alive) { setRows(d); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    fetchRows();
    // 自動更新：ウィンドウ復帰時＋30秒間隔で最新を再取得
    const onFocus = () => fetchRows();
    window.addEventListener('focus', onFocus);
    const id = setInterval(fetchRows, 30_000);
    return () => { alive = false; window.removeEventListener('focus', onFocus); clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== 'all' && r.entityType !== type) return false;
      if (action !== 'all' && r.action !== action) return false;
      if (kw && !(r.title.toLowerCase().includes(kw) || r.actorName.toLowerCase().includes(kw))) return false;
      const day = r.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [rows, type, action, q, from, to]);

  type ParsedDetail = { kind: string; changes: string; submitterName: string; submitterDept: string; submittedAt: string };
  const parseDetail = (d: string | null): ParsedDetail | null => {
    if (!d) return null;
    try { const o = JSON.parse(d); if (o && typeof o === 'object' && o.kind) return o as ParsedDetail; } catch { /* plain text */ }
    return null;
  };
  // 申請種別の明記（新規申請／編集申請／削除申請）
  const reqKindLabel = (r: Row) => {
    const p = parseDetail(r.detail);
    if (r.action === 'approve') return `${p?.kind ?? '申請'}を承認`;
    if (r.action === 'delete_approve') return '削除申請を承認';
    if (r.action === 'deleted') return '削除を実行';
    if (r.action === 'edit') return '編集申請';
    return ACTION_LABEL[r.action];
  };
  const withDept = (name: string, dept?: string) => `${name}${dept ? `（${dept}）` : ''}`;
  // 申請者（approve/delete_approve は備考JSONの申請者、edit は実行者本人）
  const applicantOf = (r: Row): string => {
    const p = parseDetail(r.detail);
    if (p) return withDept(p.submitterName, p.submitterDept);
    if (r.action === 'edit') return withDept(r.actorName, r.actorDept);
    return '';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">承認・削除履歴</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">誰が・いつ・何を承認／削除したか（責任の明確化）。行をクリックで詳細。</p>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 items-center">
        <input className={fld + ' flex-1 min-w-[160px]'} style={{ borderColor: 'var(--border-color)' }} placeholder="対象名・実行者で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
          {([['all', 'すべて'], ['approve', '承認'], ['edit', '編集'], ['delete_approve', '削除承認'], ['deleted', '削除実行']] as [typeof action, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setAction(k)} className={`px-3 py-2 font-medium transition-colors ${action === k ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>{l}</button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-color)' }}>
          {([['all', '全種別'], ['decision', '決定事項'], ['project', 'PJ'], ['policy', '方針']] as [typeof type, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setType(k)} className={`px-3 py-2 font-medium transition-colors ${type === k ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>{l}</button>
          ))}
        </div>
        <input type="date" className={fld} style={{ borderColor: 'var(--border-color)' }} value={from} onChange={(e) => setFrom(e.target.value)} title="開始日" />
        <span className="text-slate-400">〜</span>
        <input type="date" className={fld} style={{ borderColor: 'var(--border-color)' }} value={to} onChange={(e) => setTo(e.target.value)} title="終了日" />
      </div>

      <p className="text-xs text-slate-400">{filtered.length}件</p>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-12">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">履歴がありません</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {filtered.map((r) => (
              <div key={r.id}>
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="text-xs text-slate-400 w-24 flex-shrink-0">{format(new Date(r.createdAt), 'M/d HH:mm', { locale: ja })}</div>
                  {/* 申請種別を先頭に明記 */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${ACTION_BADGE[r.action]}`}>{reqKindLabel(r)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[r.entityType]}`}>{TYPE_LABEL[r.entityType]}</span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{r.title}</span>
                  {r.creatorNames && <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 truncate max-w-[180px]">作成: {r.creatorNames}</span>}
                  {r.assigneeNames && <span className="text-xs text-indigo-600 dark:text-indigo-400 flex-shrink-0 truncate max-w-[180px]">担当: {r.assigneeNames}</span>}
                  {applicantOf(r) && <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">申請: {applicantOf(r)}</span>}
                  {(r.action === 'approve' || r.action === 'delete_approve') && <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">承認: {withDept(r.actorName, r.actorDept)}</span>}
                  <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openId === r.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {openId === r.id && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/60 dark:bg-slate-800/30">
                    {(() => {
                      const p = parseDetail(r.detail);
                      return (
                        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                          <dt className="text-slate-400">申請種別</dt><dd className="text-slate-700 dark:text-slate-200 font-medium">{reqKindLabel(r)}</dd>
                          <dt className="text-slate-400">対象種別</dt><dd className="text-slate-700 dark:text-slate-200">{TYPE_LABEL[r.entityType]}</dd>
                          <dt className="text-slate-400">対象</dt><dd className="text-slate-700 dark:text-slate-200">{r.title}</dd>
                          {r.creatorNames && (<><dt className="text-slate-400">作成者</dt><dd className="text-slate-700 dark:text-slate-200">{r.creatorNames}</dd></>)}
                          {r.assigneeNames && (<><dt className="text-slate-400">この内容の担当者</dt><dd className="text-slate-700 dark:text-slate-200">{r.assigneeNames}</dd></>)}
                          {applicantOf(r) && (<><dt className="text-slate-400">申請者</dt><dd className="text-slate-700 dark:text-slate-200">{applicantOf(r)}</dd></>)}
                          {p?.submittedAt && (<><dt className="text-slate-400">申請日時</dt><dd className="text-slate-700 dark:text-slate-200">{p.submittedAt}</dd></>)}
                          {(r.action === 'approve' || r.action === 'delete_approve') && (<><dt className="text-slate-400">承認者</dt><dd className="text-slate-700 dark:text-slate-200">{withDept(r.actorName, r.actorDept)}{r.asDirector && ' / 取締役'}{r.asManager && ' / 担当部長'}</dd></>)}
                          {(r.action === 'edit' || r.action === 'deleted') && (<><dt className="text-slate-400">実行者</dt><dd className="text-slate-700 dark:text-slate-200">{withDept(r.actorName, r.actorDept)}</dd></>)}
                          <dt className="text-slate-400">{r.action === 'approve' || r.action === 'delete_approve' ? '承認日時' : '日時'}</dt><dd className="text-slate-700 dark:text-slate-200">{format(new Date(r.createdAt), 'yyyy年M月d日 HH:mm:ss', { locale: ja })}</dd>
                          {p?.changes ? (<><dt className="text-slate-400">変更内容</dt><dd className="text-slate-700 dark:text-slate-200">{p.changes}</dd></>) : (r.detail && (<><dt className="text-slate-400">変更内容</dt><dd className="text-slate-700 dark:text-slate-200">{r.detail}</dd></>))}
                        </dl>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
