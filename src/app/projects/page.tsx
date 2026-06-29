'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { EditDiff } from '@/components/EditDiff';
import type { Decision } from '@/types';
import { STATUS_LABELS, DECISION_STATUS_LABELS, resolveMemberName, useStore } from '@/lib/store';
import { getDepartmentName } from '@/lib/departments';
import { ScopeControl } from '@/components/ScopeControl';
import { visibleTagIds, decisionVisible, defaultView, type View } from '@/lib/visibility';

type Approval = { approver: string; createdAt: string };
type Policy = { id: string; name: string; description: string | null; status: string; deleteRequested?: boolean; editNote?: string | null; prevState?: string | null; editedBy?: string | null; sortOrder: number; approvals?: Approval[]; deleteApprovals?: Approval[] };
type Project = { id: string; name: string; description: string | null; departmentId: string | null; assigneeUsername: string | null; policyId: string | null; status: string; deleteRequested?: boolean; editNote?: string | null; prevState?: string | null; editedBy?: string | null; sortOrder: number; approvals?: Approval[]; deleteApprovals?: Approval[] };
const fld = 'px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400';

// 承認状態を目立つ形で表示（左上）
function StatusPill({ status, deleteRequested }: { status: string; deleteRequested?: boolean }) {
  if (deleteRequested) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex-shrink-0">🗑 削除承認待ち</span>;
  if (status === 'approved') return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex-shrink-0">✓ 承認済</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex-shrink-0">● 承認待ち</span>;
}
function accentClass(status: string, del?: boolean) {
  return del ? 'border-l-4 border-l-rose-400' : status === 'approved' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-amber-400';
}
// ビジュアル用の小さな承認状態バッジ（承認待ち/削除承認待ちは「あと◯名」も表示）
function VizStatus({ status, deleteRequested, approvals, deleteApprovals }: { status: string; deleteRequested?: boolean; approvals?: Approval[]; deleteApprovals?: Approval[] }) {
  const required = 2;
  if (deleteRequested) {
    const n = deleteApprovals?.length ?? 0;
    return <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-600">🗑削除 {n}/{required}・あと{Math.max(0, required - n)}名</span>;
  }
  if (status === 'approved') return <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">承認済</span>;
  const n = approvals?.length ?? 0;
  return <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 text-amber-600">承認待ち {n}/{required}・あと{Math.max(0, required - n)}名</span>;
}
// 承認進捗（取締役2名）。承認待ちのみ表示。
function ApprovalProgress({ approvals, iApproved }: { approvals?: Approval[]; iApproved: boolean }) {
  const required = 2;
  const approved = approvals?.length ?? 0;
  const remaining = Math.max(0, required - approved);
  return iApproved
    ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">✓承認済・あと{remaining}名</span>
    : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">{approved}/{required}・あと{remaining}名</span>;
}
// 削除承認の進捗（取締役2名）
function DeleteProgress({ approvals, iApproved }: { approvals?: Approval[]; iApproved: boolean }) {
  const required = 2;
  const approved = approvals?.length ?? 0;
  const remaining = Math.max(0, required - approved);
  return iApproved
    ? <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">🗑✓削除承認済・あと{remaining}名</span>
    : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-600">🗑削除 {approved}/{required}・あと{remaining}名</span>;
}

function Chevron({ open }: { open: boolean }) {
  return <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}

export default function ProjectsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [tab, setTab] = useState<'viz' | 'manage'>('viz');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const { state } = useStore();

  const [polName, setPolName] = useState('');
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDept, setProjDept] = useState('');
  const [projAssignee, setProjAssignee] = useState('');
  const [projPolicy, setProjPolicy] = useState('');
  const me = useCurrentUser();
  const isDirector = !!me?.isDirector || !!me?.isRepresentative; // 代表取締役も取締役相当
  const isManager = me?.position === 'manager';
  // プロジェクトの担当部長/取締役判定（対象部門の部長 or 取締役）
  const canManageProj = useCallback(
    (deptId: string | null | undefined) => isDirector || (isManager && !!me?.departmentId && deptId === me.departmentId),
    [isDirector, isManager, me?.departmentId]);
  // 作成フォーム初期値（部門＝自部門、担当者＝自分）
  useEffect(() => {
    if (me) {
      setProjDept((prev) => prev || (isDirector ? '' : me.departmentId ?? ''));
      setProjAssignee((prev) => prev || me.username);
    }
  }, [me, isDirector]);
  const [view, setView] = useState<View>('dept');
  const [viewInit, setViewInit] = useState(false);
  useEffect(() => {
    // 方針ビジュアルは概観のため、社員も既定は「自部門」（取締役以上は全体）
    if (!viewInit && me) {
      const v = defaultView(me);
      setView(v === 'mine' ? 'dept' : v);
      setViewInit(true);
    }
  }, [me, viewInit]);

  // 表示対象の方針/プロジェクト（全体は全件、それ以外は自分/自部門の決定事項・タスクに紐づくもののみ）
  const { policyIds: visPol, projectIds: visProj } = useMemo(() => visibleTagIds(decisions, view, me), [decisions, view, me]);
  const visiblePolicies = useMemo(() => view === 'all' ? policies : policies.filter((p) => visPol.has(p.id)), [policies, visPol, view]);
  // 方針ビジュアルは全員が全方針を概観できる（管理タブの表示・権限は変更しない）
  const vizPolicies = policies;
  const visibleProjects = useMemo(() => view === 'all' ? projects : projects.filter((p) => visProj.has(p.id)), [projects, visProj, view]);
  const decVisible = useCallback((d: Decision) => decisionVisible(d, view, me), [view, me]);
  // 方針に紐づくが「プロジェクト指定なし」の決定事項（プロジェクト未割当）
  const noProjectDecisions = useCallback(
    (polId: string) => decisions.filter((d) => decVisible(d) && (d.projects?.length ?? 0) === 0 && d.policies?.some((pl) => pl.policyId === polId)),
    [decisions, decVisible]);
  const [err, setErr] = useState('');
  const [editItem, setEditItem] = useState<{ kind: 'policy' | 'project'; id: string; name: string; description: string; departmentId: string; assigneeUsername: string; policyId: string; editReason: string } | null>(null);

  const openEdit = (kind: 'policy' | 'project', item: { id: string; name: string; description: string | null; departmentId?: string | null; assigneeUsername?: string | null; policyId?: string | null }) => {
    setEditItem({ kind, id: item.id, name: item.name, description: item.description ?? '', departmentId: item.departmentId ?? '', assigneeUsername: item.assigneeUsername ?? '', policyId: item.policyId ?? '', editReason: '' });
  };
  const saveEdit = async () => {
    if (!editItem || !editItem.name.trim()) return;
    const url = editItem.kind === 'policy' ? `/api/policies/${editItem.id}` : `/api/projects/${editItem.id}`;
    const reason = editItem.editReason.trim() || undefined;
    if (editItem.kind === 'project') {
      if (!editItem.description.trim() || !editItem.departmentId || !editItem.assigneeUsername) {
        setErr('説明・部門・担当者は必須です（空白不可）'); return;
      }
    }
    const body = editItem.kind === 'policy'
      ? { name: editItem.name.trim(), description: editItem.description.trim() || null, editReason: reason }
      : { name: editItem.name.trim(), description: editItem.description.trim(), departmentId: editItem.departmentId, assigneeUsername: editItem.assigneeUsername, policyId: editItem.policyId || null, editReason: reason };
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '編集に失敗しました'); return; }
    setErr(''); setEditItem(null); load();
  };

  const approve = async (entityType: 'policy' | 'project', entityId: string) => {
    const res = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType, entityId }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '承認に失敗しました'); return; }
    setErr(''); load();
  };

  // 承認の取り消し（自分の承認・承認待ち・30分以内。条件はサーバーで判定）
  const undoApprove = async (entityType: 'policy' | 'project', entityId: string) => {
    const res = await fetch('/api/approvals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType, entityId }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '承認の取り消しに失敗しました'); return; }
    setErr(''); load();
  };

  // 編集の取り消し（承認待ちの間のみ・編集前に復元）
  const undoEdit = async (kind: 'policy' | 'project', id: string) => {
    if (!confirm('この編集を取り消して、編集前の状態に戻しますか？')) return;
    const url = kind === 'policy' ? `/api/policies/${id}/undo-edit` : `/api/projects/${id}/undo-edit`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '取り消しに失敗しました'); return; }
    setErr(''); load();
  };

  const load = useCallback(async () => {
    const opt = { cache: 'no-store' as const };
    const [p, pr, d] = await Promise.all([
      fetch('/api/policies', opt).then((r) => r.ok ? r.json() : []),
      fetch('/api/projects', opt).then((r) => r.ok ? r.json() : []),
      fetch('/api/decisions', opt).then((r) => r.ok ? r.json() : []),
    ]);
    setPolicies(p); setProjects(pr); setDecisions(d);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addPolicy = async () => {
    if (!polName.trim()) return;
    const res = await fetch('/api/policies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: polName.trim(), sortOrder: policies.length }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '方針の登録に失敗しました'); return; }
    setErr(''); setPolName(''); load();
  };
  const requestDelete = async (entityType: 'policy' | 'project', id: string, name: string) => {
    if (!confirm(`「${name}」の削除を申請しますか？（取締役2名の承認で削除されます）`)) return;
    const res = await fetch('/api/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType, entityId: id }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? '削除申請に失敗しました'); return; }
    setErr(''); load();
  };
  const cancelDelete = async (entityType: 'policy' | 'project', id: string) => {
    await fetch('/api/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityType, entityId: id, cancel: true }) });
    load();
  };
  const addProject = async () => {
    if (!projName.trim() || !projDesc.trim() || !projDept || !projAssignee) {
      setErr('名称・説明・部門・担当者は必須です（空白不可）'); return;
    }
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: projName.trim(), description: projDesc.trim(), departmentId: projDept, assigneeUsername: projAssignee, policyId: projPolicy || null, sortOrder: projects.length }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? 'プロジェクトの登録に失敗しました'); return; }
    setErr(''); setProjName(''); setProjDesc(''); setProjPolicy(''); setProjAssignee(me?.username ?? ''); load();
  };
  const setProjectPolicy = async (id: string, policyId: string) => { await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policyId: policyId || null }) }); load(); };

  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">方針・プロジェクト</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">方針 ＞ プロジェクト ＞ 決定事項 ＞ タスク の階層を管理・可視化</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          {([['viz', 'ビジュアル'], ['manage', '管理']] as [typeof tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === k ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{l}</button>
          ))}
        </div>
        <ScopeControl view={view} setView={setView} user={me} departments={state.departments} />
      </div>

      {tab === 'viz' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">クリックで展開：方針 ▸ プロジェクト ▸ 決定事項 ▸ 実行タスク ▸ 詳細</p>
          {vizPolicies.length === 0 && visibleProjects.length === 0 && <p className="text-center text-sm text-slate-400 py-12">表示できる方針・プロジェクトがありません。「管理」タブから登録してください。</p>}
          {[...vizPolicies.map((p) => {
              const real = visibleProjects.filter((pr) => pr.policyId === p.id);
              // プロジェクト指定なしの決定事項があれば合成ノードを追加
              const synthetic: Project[] = noProjectDecisions(p.id).length > 0
                ? [{ id: `__nopj__${p.id}`, name: '（プロジェクト指定なし）', description: null, departmentId: null, assigneeUsername: null, policyId: p.id, status: 'approved', sortOrder: 9999 }]
                : [];
              return { pol: p, prs: [...real, ...synthetic] };
            }),
            ...(visibleProjects.some((pr) => !pr.policyId) ? [{ pol: null as Policy | null, prs: visibleProjects.filter((pr) => !pr.policyId) }] : [])
          ].map(({ pol, prs }) => {
            const polKey = pol ? `pol:${pol.id}` : 'pol:none';
            const polOpen = open.has(polKey);
            return (
              <div key={polKey} className="rounded-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-full flex items-center gap-2 p-3">
                  <button onClick={() => toggle(polKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <Chevron open={polOpen} />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 font-medium flex-shrink-0">方針</span>
                    <span className="flex-1 min-w-0 font-bold text-slate-800 dark:text-slate-100 truncate">{pol ? pol.name : '（方針未割当）'}</span>
                  </button>
                  {pol && <VizStatus status={pol.status} deleteRequested={pol.deleteRequested} approvals={pol.approvals} deleteApprovals={pol.deleteApprovals} />}
                  {pol && pol.status === 'pending' && !pol.deleteRequested && (
                    <>
                      <ApprovalProgress approvals={pol.approvals} iApproved={!!me && !!pol.approvals?.some((a) => a.approver === me.username)} />
                      {isDirector && !pol.approvals?.some((a) => a.approver === me?.username) && (
                        <button onClick={() => approve('policy', pol.id)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500 text-white flex-shrink-0">承認</button>
                      )}
                    </>
                  )}
                  <span className="text-xs text-slate-400 flex-shrink-0">プロジェクト {prs.length}</span>
                </div>
                {polOpen && (
                  <div className="pl-6 pr-3 pb-2 space-y-1">
                    {pol?.description && <p className="text-xs text-slate-400 pl-2 pb-1">{pol.description}</p>}
                    {prs.length === 0 && <p className="text-xs text-slate-400 pl-2 py-1">プロジェクトなし</p>}
                    {prs.map((pr) => {
                      const decs = pr.id.startsWith('__nopj__')
                        ? noProjectDecisions(pr.id.slice('__nopj__'.length))
                        : decisions.filter((d) => d.projects?.some((x) => x.projectId === pr.id) && decVisible(d));
                      const pjKey = `pj:${pr.id}`;
                      const pjOpen = open.has(pjKey);
                      return (
                        <div key={pr.id} className="rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="w-full flex items-center gap-2 p-2">
                            <button onClick={() => toggle(pjKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <Chevron open={pjOpen} />
                              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 font-medium flex-shrink-0">PJ</span>
                              <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-200 truncate">{pr.name}</span>
                            </button>
                            {!pr.id.startsWith('__nopj__') && <VizStatus status={pr.status} deleteRequested={pr.deleteRequested} approvals={pr.approvals} deleteApprovals={pr.deleteApprovals} />}
                            {!pr.id.startsWith('__nopj__') && pr.status === 'pending' && !pr.deleteRequested && (
                              <>
                                <ApprovalProgress approvals={pr.approvals} iApproved={!!me && !!pr.approvals?.some((a) => a.approver === me.username)} />
                                {isDirector && !pr.approvals?.some((a) => a.approver === me?.username) && (
                                  <button onClick={() => approve('project', pr.id)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500 text-white flex-shrink-0">承認</button>
                                )}
                              </>
                            )}
                            <span className="text-xs text-slate-400 flex-shrink-0">決定 {decs.length}</span>
                          </div>
                          {pjOpen && (
                            <div className="pl-6 pr-2 pb-2 space-y-1">
                              {pr.description && <p className="text-xs text-slate-400 pl-2 pb-1">{pr.description}</p>}
                              {decs.length === 0 && <p className="text-xs text-slate-400 pl-2 py-1">決定事項なし</p>}
                              {decs.map((d) => {
                                const decKey = `dec:${d.id}`;
                                const decOpen = open.has(decKey);
                                return (
                                  <div key={d.id} className="rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                    <button onClick={() => toggle(decKey)} className="w-full flex items-center gap-2 p-2 text-left">
                                      <Chevron open={decOpen} />
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 font-medium flex-shrink-0">決定</span>
                                      <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-200 truncate">{d.title}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${d.status === 'done' ? 'bg-emerald-50 text-emerald-600' : d.status === 'approved' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{DECISION_STATUS_LABELS[d.status]}</span>
                                      <span className="text-xs text-slate-400 flex-shrink-0">タスク {d.tasks.length}</span>
                                    </button>
                                    {decOpen && (
                                      <div className="pl-6 pr-2 pb-2 space-y-1">
                                        {d.tasks.length === 0 && <p className="text-xs text-slate-400 pl-2 py-1">タスクなし</p>}
                                        {d.tasks.map((t) => {
                                          const tKey = `task:${t.id}`;
                                          const tOpen = open.has(tKey);
                                          return (
                                            <div key={t.id} className="rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                                              <button onClick={() => toggle(tKey)} className="w-full flex items-center gap-2 p-2 text-left">
                                                <Chevron open={tOpen} />
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">タスク</span>
                                                <span className={`flex-1 min-w-0 text-sm truncate ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{t.what}</span>
                                                <span className="text-xs text-slate-400 flex-shrink-0">{STATUS_LABELS[t.status]}</span>
                                              </button>
                                              {tOpen && (
                                                <dl className="px-4 py-2 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-xs bg-slate-50/60 dark:bg-slate-800/30">
                                                  <dt className="text-slate-400">何を</dt><dd className="text-slate-700 dark:text-slate-200">{t.what}</dd>
                                                  {t.why && (<><dt className="text-slate-400">なぜ</dt><dd className="text-slate-700 dark:text-slate-200">{t.why}</dd></>)}
                                                  {t.who && (<><dt className="text-slate-400">誰が</dt><dd className="text-slate-700 dark:text-slate-200">{resolveMemberName(state.members, t.who)}</dd></>)}
                                                  {t.whereLoc && (<><dt className="text-slate-400">どこで</dt><dd className="text-slate-700 dark:text-slate-200">{t.whereLoc}</dd></>)}
                                                  {t.whenDue && (<><dt className="text-slate-400">いつ</dt><dd className="text-slate-700 dark:text-slate-200">{t.whenDue}</dd></>)}
                                                  {t.how && (<><dt className="text-slate-400">どうやって</dt><dd className="text-slate-700 dark:text-slate-200">{t.how}</dd></>)}
                                                  {t.departmentId && (<><dt className="text-slate-400">部門</dt><dd className="text-slate-700 dark:text-slate-200">{getDepartmentName(t.departmentId, state.departments)}</dd></>)}
                                                  <dt className="text-slate-400">状態</dt><dd className="text-slate-700 dark:text-slate-200">{STATUS_LABELS[t.status]}</dd>
                                                  {((t.policies && t.policies.length > 0) || (t.projects && t.projects.length > 0)) && (
                                                    <><dt className="text-slate-400">タグ</dt><dd className="flex flex-wrap gap-1">
                                                      {t.policies?.map((p) => <span key={p.policyId} className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">方針:{p.policy.name}</span>)}
                                                      {t.projects?.map((p) => <span key={p.projectId} className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">PJ:{p.project.name}</span>)}
                                                    </dd></>
                                                  )}
                                                </dl>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'manage' && err && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
          {err}
        </div>
      )}
      {tab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 方針 */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3">方針</h2>
            <div className="space-y-2 mb-3">
              {visiblePolicies.map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 ${accentClass(p.status, p.deleteRequested)}`} style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusPill status={p.status} deleteRequested={p.deleteRequested} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-400 mb-2 pl-0.5 break-words">{p.description}</p>}
                  {p.status === 'pending' && p.editNote && <div className="mb-2"><EditDiff note={p.editNote} /></div>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDirector && !p.deleteRequested && <button onClick={() => openEdit('policy', p)} className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">編集</button>}
                    {p.status === 'pending' && p.prevState && p.editedBy === me?.username && !p.deleteRequested && <button onClick={() => undoEdit('policy', p.id)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">編集取消</button>}
                    {p.status === 'pending' && !p.deleteRequested && <ApprovalProgress approvals={p.approvals} iApproved={!!me && !!p.approvals?.some((a) => a.approver === me.username)} />}
                    {p.status !== 'approved' && isDirector && !p.deleteRequested && !p.approvals?.some((a) => a.approver === me?.username) && <button onClick={() => approve('policy', p.id)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500 text-white">承認</button>}
                    {p.status === 'pending' && isDirector && !p.deleteRequested && <button onClick={() => undoApprove('policy', p.id)} className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="自分の承認を取り消す（30分以内）">承認取消</button>}
                    {p.deleteRequested ? (
                      <>
                        <DeleteProgress approvals={p.deleteApprovals} iApproved={!!me && !!p.deleteApprovals?.some((a) => a.approver === me.username)} />
                        {isDirector && !p.deleteApprovals?.some((a) => a.approver === me?.username) && <button onClick={() => requestDelete('policy', p.id, p.name)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-500 text-white">削除を承認</button>}
                        {isDirector && <button onClick={() => cancelDelete('policy', p.id)} className="text-xs px-2.5 py-1 rounded-lg border text-slate-500" style={{ borderColor: 'var(--border-color)' }}>取消</button>}
                      </>
                    ) : isDirector && <button onClick={() => requestDelete('policy', p.id, p.name)} className="text-xs px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">削除申請</button>}
                  </div>
                </div>
              ))}
              {visiblePolicies.length === 0 && <p className="text-xs text-slate-400">表示できる方針がありません</p>}
            </div>
            {isDirector && (
              <div className="flex gap-2">
                <input className={fld + ' flex-1'} style={{ borderColor: 'var(--border-color)' }} placeholder="新しい方針名" value={polName} onChange={(e) => setPolName(e.target.value)} />
                <button onClick={addPolicy} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm">追加</button>
              </div>
            )}
          </div>
          {/* プロジェクト */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3">プロジェクト</h2>
            <div className="space-y-2 mb-3">
              {visibleProjects.map((pr) => (
                <div key={pr.id} className={`rounded-xl border p-3 ${accentClass(pr.status, pr.deleteRequested)}`} style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusPill status={pr.status} deleteRequested={pr.deleteRequested} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{pr.name}</span>
                  </div>
                  {pr.description && <p className="text-xs text-slate-400 mb-1 pl-0.5 break-words">{pr.description}</p>}
                  <p className="text-xs text-slate-400 mb-2 pl-0.5">
                    部門: {pr.departmentId ? (state.departments.find((d) => d.id === pr.departmentId)?.name ?? pr.departmentId) : '未設定'}
                    {' ／ '}担当者: {pr.assigneeUsername ? resolveMemberName(state.members, pr.assigneeUsername) : '未設定'}
                  </p>
                  {pr.status === 'pending' && pr.editNote && <div className="mb-2"><EditDiff note={pr.editNote} /></div>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {canManageProj(pr.departmentId) && !pr.deleteRequested ? (
                      <label className="text-xs text-slate-400 flex items-center gap-1">方針:
                        <select className={fld + ' text-xs py-1'} style={{ borderColor: 'var(--border-color)' }} value={pr.policyId ?? ''} onChange={(e) => setProjectPolicy(pr.id, e.target.value)}>
                          <option value="">なし</option>
                          {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </label>
                    ) : (
                      <span className="text-xs text-slate-400">方針: {pr.policyId ? (policies.find((p) => p.id === pr.policyId)?.name ?? '—') : 'なし'}</span>
                    )}
                    {canManageProj(pr.departmentId) && !pr.deleteRequested && <button onClick={() => openEdit('project', pr)} className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">編集</button>}
                    {pr.status === 'pending' && pr.prevState && pr.editedBy === me?.username && !pr.deleteRequested && <button onClick={() => undoEdit('project', pr.id)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">編集取消</button>}
                    {pr.status === 'pending' && !pr.deleteRequested && <ApprovalProgress approvals={pr.approvals} iApproved={!!me && !!pr.approvals?.some((a) => a.approver === me.username)} />}
                    {pr.status !== 'approved' && isDirector && !pr.deleteRequested && !pr.approvals?.some((a) => a.approver === me?.username) && <button onClick={() => approve('project', pr.id)} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500 text-white">承認</button>}
                    {pr.status === 'pending' && isDirector && !pr.deleteRequested && <button onClick={() => undoApprove('project', pr.id)} className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="自分の承認を取り消す（30分以内）">承認取消</button>}
                    {pr.deleteRequested ? (
                      <>
                        <DeleteProgress approvals={pr.deleteApprovals} iApproved={!!me && !!pr.deleteApprovals?.some((a) => a.approver === me.username)} />
                        {isDirector && !pr.deleteApprovals?.some((a) => a.approver === me?.username) && <button onClick={() => requestDelete('project', pr.id, pr.name)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-500 text-white">削除を承認</button>}
                        {canManageProj(pr.departmentId) && <button onClick={() => cancelDelete('project', pr.id)} className="text-xs px-2.5 py-1 rounded-lg border text-slate-500" style={{ borderColor: 'var(--border-color)' }}>取消</button>}
                      </>
                    ) : canManageProj(pr.departmentId) && <button onClick={() => requestDelete('project', pr.id, pr.name)} className="text-xs px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">削除申請</button>}
                  </div>
                </div>
              ))}
              {visibleProjects.length === 0 && <p className="text-xs text-slate-400">表示できるプロジェクトがありません</p>}
            </div>
            {(isDirector || isManager) && (
              <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs text-slate-400">新規プロジェクト（名称・説明・部門・担当者は必須）</p>
                <input className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} placeholder="プロジェクト名 *" value={projName} onChange={(e) => setProjName(e.target.value)} />
                <textarea rows={2} className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} placeholder="説明 *" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
                <div className="flex gap-2 flex-wrap">
                  <select className={fld + ' flex-1 min-w-[120px]'} style={{ borderColor: 'var(--border-color)' }} value={projDept} onChange={(e) => setProjDept(e.target.value)} disabled={!isDirector} title={!isDirector ? '部長は自部門のみ' : undefined}>
                    <option value="">部門 *</option>
                    {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select className={fld + ' flex-1 min-w-[120px]'} style={{ borderColor: 'var(--border-color)' }} value={projAssignee} onChange={(e) => setProjAssignee(e.target.value)}>
                    <option value="">担当者 *</option>
                    {state.members.map((m) => <option key={m.username} value={m.username}>{m.name}</option>)}
                  </select>
                  <select className={fld} style={{ borderColor: 'var(--border-color)' }} value={projPolicy} onChange={(e) => setProjPolicy(e.target.value)}>
                    <option value="">方針なし</option>
                    {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={addProject} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm w-full">追加</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 編集モーダル（名称・説明・方針）。保存すると再承認になります。 */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditItem(null)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl p-6" style={{ background: 'var(--card-bg)' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{editItem.kind === 'policy' ? '方針を編集' : 'プロジェクトを編集'}</h2>
            <p className="text-xs text-amber-500 mb-4">保存すると承認はリセットされ、取締役2名の再承認が必要になります。</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">名称 *</label>
                <input className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">説明{editItem.kind === 'project' ? ' *' : ''}</label>
                <textarea rows={3} className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
              </div>
              {editItem.kind === 'project' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">部門 *</label>
                    <select className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.departmentId} onChange={(e) => setEditItem({ ...editItem, departmentId: e.target.value })} disabled={!isDirector} title={!isDirector ? '部長は自部門のみ' : undefined}>
                      <option value="">部門を選択</option>
                      {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">担当者 *</label>
                    <select className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.assigneeUsername} onChange={(e) => setEditItem({ ...editItem, assigneeUsername: e.target.value })}>
                      <option value="">担当者を選択</option>
                      {state.members.map((m) => <option key={m.username} value={m.username}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">所属方針</label>
                    <select className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.policyId} onChange={(e) => setEditItem({ ...editItem, policyId: e.target.value })}>
                      <option value="">方針なし</option>
                      {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">変更理由（承認者に表示・任意）</label>
                <input className={fld + ' w-full'} style={{ borderColor: 'var(--border-color)' }} value={editItem.editReason} onChange={(e) => setEditItem({ ...editItem, editReason: e.target.value })} placeholder="例: 表記を統一" />
              </div>
              {err && <p className="text-sm text-rose-500">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--border-color)' }}>キャンセル</button>
                <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white">保存（再承認へ）</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
