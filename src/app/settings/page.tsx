'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

const fld = 'px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400';

type Option = { id: string; code: string; label: string; sortOrder: number; active: boolean };

// 集計分類／実行管理集計区分 共通のマスタ編集UI（追加・名称変更・非表示・並び替え）
function MasterSection({
  title, description, noun, items, add, update, codePlaceholder, labelPlaceholder,
}: {
  title: string; description: string; noun: string;
  items: Option[];
  add: (data: { code: string; label: string }) => Promise<void>;
  update: (id: string, data: { label?: string; active?: boolean; sortOrder?: number }) => Promise<void>;
  codePlaceholder: string; labelPlaceholder: string;
}) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editLabels, setEditLabels] = useState<Record<string, string>>({});
  const rows = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!code.trim() || !label.trim()) { setErr('コードと名称は必須です'); return; }
    setBusy(true);
    try { await add({ code: code.trim(), label: label.trim() }); setCode(''); setLabel(''); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : '追加に失敗しました'); }
    finally { setBusy(false); }
  };
  const saveLabel = async (o: Option) => {
    const next = (editLabels[o.id] ?? o.label).trim();
    if (!next || next === o.label) { setEditLabels((p) => { const n = { ...p }; delete n[o.id]; return n; }); return; }
    setErr('');
    try { await update(o.id, { label: next }); setEditLabels((p) => { const n = { ...p }; delete n[o.id]; return n; }); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : '名称の変更に失敗しました'); }
  };
  const toggleActive = async (o: Option) => {
    setErr('');
    try { await update(o.id, { active: !o.active }); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : '表示切替に失敗しました'); }
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const a = rows[idx]; const b = rows[idx + dir];
    if (!a || !b) return;
    setErr('');
    try { await update(a.id, { sortOrder: b.sortOrder }); await update(b.id, { sortOrder: a.sortOrder }); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : '並び替えに失敗しました'); }
  };

  return (
    <section className="rounded-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      {err && <div className="px-4 py-2 text-sm text-rose-600 dark:text-rose-400">{err}</div>}
      <form onSubmit={handleAdd} className="px-4 py-3 border-b flex flex-wrap items-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">コード（半角英数・-・_）</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={codePlaceholder} className={fld + ' w-40'} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">名称</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={labelPlaceholder} className={fld + ' w-48'} />
        </div>
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm disabled:opacity-50">追加</button>
      </form>
      <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">{noun}がありません。上のフォームから追加してください。</div>
        )}
        {rows.map((o, idx) => (
          <div key={o.id} className={`flex items-center gap-2 px-4 py-2.5 ${o.active ? '' : 'opacity-50'}`}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 leading-none" title="上へ">▲</button>
              <button onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 leading-none" title="下へ">▼</button>
            </div>
            <code className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">{o.code}</code>
            <input
              value={editLabels[o.id] ?? o.label}
              onChange={(e) => setEditLabels((p) => ({ ...p, [o.id]: e.target.value }))}
              onBlur={() => saveLabel(o)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className={fld + ' flex-1'}
            />
            {!o.active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">非表示</span>}
            <button
              onClick={() => toggleActive(o)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${o.active ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}
            >
              {o.active ? '非表示にする' : '表示する'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { state, addCategory, updateCategory, addSegment, updateSegment } = useStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // 設定はシステム管理者のみ。表示用Cookie（workportal_admin=1）で判定。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAdmin(typeof document !== 'undefined' && document.cookie.split('; ').some((c) => c === 'workportal_admin=1'));
  }, []);

  if (isAdmin === null) return null;
  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border p-6 text-center text-slate-500" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          この設定はシステム管理者のみ利用できます。
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">設定</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">システム管理者のみ。集計区分などのマスタを管理します。</p>
      </div>

      <MasterSection
        title="集計分類"
        description="実行タスクに付与する分類です。コードは一意（重複・誤作動防止）で、作成後は変更できません。"
        noun="分類"
        items={state.categories}
        add={addCategory}
        update={updateCategory}
        codePlaceholder="例: marketing"
        labelPlaceholder="例: マーケティング"
      />

      <MasterSection
        title="実行管理集計区分"
        description="決定事項に付与する区分です。コードは一意（重複・誤作動防止）で、作成後は変更できません。"
        noun="区分"
        items={state.segments}
        add={addSegment}
        update={updateSegment}
        codePlaceholder="例: board"
        labelPlaceholder="例: 取締役会"
      />
    </div>
  );
}
