'use client';

import { useState } from 'react';
import { useStore, POSITION_LABELS } from '@/lib/store';
import type { Member, Position, AuthType, MemberRole } from '@/types';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { getDepartmentName } from '@/lib/departments';

const fieldCls = 'w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400';

// ── メンバー編集モーダル ────────────────────────────────────────────────────────
function MemberForm({ initial, onClose }: { initial?: Member; onClose: () => void }) {
  const { state, addMember, updateMember } = useStore();
  const [username, setUsername] = useState(initial?.username ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [initials, setInitials] = useState(initial?.initials ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [authType, setAuthType] = useState<AuthType>(initial?.authType ?? 'password');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<MemberRole>(initial?.role ?? 'member');
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? '');
  const [position, setPosition] = useState<Position | ''>(initial?.position ?? '');
  const [isDirector, setIsDirector] = useState(initial?.isDirector ?? false);
  const [isRepresentative, setIsRepresentative] = useState(initial?.isRepresentative ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim() || saving) return;
    setSaving(true);
    setError('');
    const data = {
      username: username.trim(),
      name: name.trim(),
      initials: initials.trim() || name.trim().slice(0, 1),
      email: email.trim() || null,
      authType,
      password: password || undefined,
      role,
      departmentId: departmentId || null,
      position: (position || null) as Position | null,
      isDirector,
      isRepresentative,
    };
    try {
      if (initial) await updateMember(initial.id, data);
      else await addMember(data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{initial ? 'メンバーを編集' : 'メンバーを追加'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">ユーザー名 *</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!initial}
                className={fieldCls} style={{ borderColor: 'var(--border-color)' }} placeholder="yamada" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">氏名 *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} placeholder="山田 太郎" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">イニシャル</label>
              <input value={initials} onChange={(e) => setInitials(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} placeholder="山" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">メールアドレス</label>
              <input type="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} placeholder="you@applippli.co.jp" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">認証方式</label>
              <select value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                <option value="password">パスワード</option>
                <option value="email">メール（マジックリンク）</option>
              </select>
            </div>
            {authType === 'password' && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">パスワード{initial ? '（変更時のみ）' : ''}</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} placeholder="••••••" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1">部門</label>
              <select value={departmentId ?? ''} onChange={(e) => setDepartmentId(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                <option value="">なし</option>
                {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">役職</label>
              <select value={position} onChange={(e) => setPosition(e.target.value as Position | '')} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                <option value="">なし</option>
                <option value="manager">部長</option>
                <option value="chief">課長</option>
                <option value="staff">社員</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">システム権限</label>
              <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }}>
                <option value="member">一般</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isDirector} onChange={(e) => setIsDirector(e.target.checked)} /> 取締役
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isRepresentative} onChange={(e) => setIsRepresentative(e.target.checked)} /> 代表取締役
            </label>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border-color)' }}>キャンセル</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white disabled:opacity-60">{saving ? '保存中...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 部門管理 ──────────────────────────────────────────────────────────────────
function DepartmentSection() {
  const { state, addDepartment, updateDepartment, deleteDepartment } = useStore();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const genId = () => 'd' + Math.random().toString(36).slice(2, 9);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const maxOrder = state.departments.reduce((m, d) => Math.max(m, d.sortOrder), 0);
    await addDepartment({ id: genId(), name: newName.trim(), sortOrder: maxOrder + 1 }).catch(() => null);
    setNewName('');
  };

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4">部門管理</h2>
      <div className="space-y-2 mb-4">
        {state.departments.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            {editId === d.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
                <button onClick={async () => { await updateDepartment(d.id, { name: editName.trim() }).catch(() => null); setEditId(null); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-indigo-500 text-white">保存</button>
                <button onClick={() => setEditId(null)} className="px-3 py-2 rounded-lg text-xs text-slate-500">取消</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{d.name}</span>
                <button onClick={() => { setEditId(d.id); setEditName(d.name); }} className="px-2 py-1 rounded-lg text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">編集</button>
                <button onClick={() => { if (confirm(`「${d.name}」を削除しますか？`)) deleteDepartment(d.id).catch(() => null); }}
                  className="px-2 py-1 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">削除</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新しい部門名" className={fieldCls} style={{ borderColor: 'var(--border-color)' }} />
        <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white whitespace-nowrap">追加</button>
      </div>
    </div>
  );
}

// ── メンバー管理 ──────────────────────────────────────────────────────────────
function MemberSection() {
  const { state, deleteMember } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800 dark:text-slate-100">メンバー管理</h2>
        <button onClick={() => { setEditMember(null); setShowForm(true); }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white">＋ メンバー追加</button>
      </div>
      <div className="space-y-2">
        {state.members.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">メンバーがいません</p>}
        {state.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {m.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                <span className="text-xs text-slate-400">@{m.username}</span>
                {m.role === 'admin' && <span className="text-xs px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-500">管理者</span>}
                {m.isRepresentative && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600">代表取締役</span>}
                {m.isDirector && <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-600">取締役</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {getDepartmentName(m.departmentId, state.departments)}
                {m.position && ` / ${POSITION_LABELS[m.position]}`}
                {` / ${m.authType === 'email' ? 'メール認証' : 'パスワード'}`}
                {!m.active && ' / 無効'}
              </p>
            </div>
            <button onClick={() => { setEditMember(m); setShowForm(true); }} className="px-2 py-1 rounded-lg text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">編集</button>
            <button onClick={() => { if (confirm(`${m.name} を削除しますか？`)) deleteMember(m.id).catch(() => null); }}
              className="px-2 py-1 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">削除</button>
          </div>
        ))}
      </div>
      {showForm && <MemberForm initial={editMember ?? undefined} onClose={() => { setShowForm(false); setEditMember(null); }} />}
    </div>
  );
}

export default function AdminPage() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">このページは管理者のみアクセスできます。</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">組織管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">部門とメンバーを管理します</p>
      </div>
      <DepartmentSection />
      <MemberSection />
    </div>
  );
}
