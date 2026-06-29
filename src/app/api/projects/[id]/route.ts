import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, canManageProject, isDirectorLike } from '@/lib/approval';
import { writeAudit } from '@/lib/audit';
import { snapshotProject } from '@/lib/snapshot';

function getUsername(req: NextRequest): string | null {
  return req.headers.get('x-wp-user');
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = getUsername(req);
  const { name, description, departmentId, assigneeUsername, policyId, sortOrder, editReason } = await req.json();
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
  // 名称・説明・部門・担当者の編集／方針付け替え／並び替えはすべて担当部長・取締役のみ＋再承認。
  const contentChanged =
    name !== undefined || description !== undefined || departmentId !== undefined ||
    assigneeUsername !== undefined || policyId !== undefined || sortOrder !== undefined;
  if (contentChanged) {
    const member = await getMember(username);
    // 現在の部門と（変更する場合は）変更後の部門の両方について担当部長/取締役であること
    const newDept = departmentId !== undefined ? (departmentId || null) : before.departmentId;
    if (!member || !canManageProject(before.departmentId, member) || !canManageProject(newDept, member)) {
      return NextResponse.json({ error: 'プロジェクトの編集は担当部長（対象部門の部長）・取締役のみ可能です' }, { status: 403 });
    }
    // 必須項目（指定された場合は空不可）
    const t = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    if ((name !== undefined && !t(name)) || (description !== undefined && !t(description)) ||
        (departmentId !== undefined && !t(departmentId)) || (assigneeUsername !== undefined && !t(assigneeUsername))) {
      return NextResponse.json({ error: '名称・説明・部門・担当者は必須です（空白不可）' }, { status: 400 });
    }
  } else if (!username) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }
  const changes: { field: string; before: string; after: string }[] = [];
  if (name !== undefined && name !== before.name) changes.push({ field: '名称', before: before.name, after: name });
  if (description !== undefined && (description ?? null) !== before.description) changes.push({ field: '説明', before: before.description ?? '', after: description ?? '' });
  if (departmentId !== undefined && (departmentId || null) !== before.departmentId) {
    const depts = await prisma.department.findMany();
    const nm = (v: string | null) => (v ? (depts.find((d) => d.id === v)?.name ?? v) : '');
    changes.push({ field: '部門', before: nm(before.departmentId), after: nm(departmentId || null) });
  }
  if (assigneeUsername !== undefined && (assigneeUsername || null) !== before.assigneeUsername) {
    changes.push({ field: '担当者', before: before.assigneeUsername ?? '', after: assigneeUsername ?? '' });
  }
  if (policyId !== undefined && (policyId || null) !== before.policyId) {
    const pols = await prisma.policy.findMany();
    const nm = (v: string | null) => (v ? (pols.find((p) => p.id === v)?.name ?? v) : '');
    changes.push({ field: '所属方針', before: nm(before.policyId), after: nm(policyId || null) });
  }
  if (editReason) changes.push({ field: '理由', before: '', after: editReason });
  const note = contentChanged ? (changes.length ? JSON.stringify(changes) : null) : undefined;
  const auditDetail = changes.map((c) => `${c.field}: 「${c.before || '—'}」→「${c.after || '—'}」`).join(' / ');
  const prevSnap = contentChanged ? await snapshotProject(id) : null;
  if (contentChanged) await prisma.approval.deleteMany({ where: { entityType: 'project', entityId: id } });
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description ?? null } : {}),
      ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
      ...(assigneeUsername !== undefined ? { assigneeUsername: assigneeUsername || null } : {}),
      ...(policyId !== undefined ? { policyId: policyId || null } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(contentChanged ? { status: 'pending', editNote: note, prevState: prevSnap, editedBy: username ?? null } : {}),
    },
  });
  if (contentChanged && username) await writeAudit({ entityType: 'project', entityId: id, title: project.name, action: 'edit', actor: username, detail: auditDetail });
  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 直接削除は取締役のみ（通常は削除申請→取締役2名承認の /api/deletions 経由）
  const member = await getMember(getUsername(req));
  if (!member) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  if (!isDirectorLike(member)) return NextResponse.json({ error: '削除は取締役のみ可能です' }, { status: 403 });
  const { id } = await params;
  await prisma.approval.deleteMany({ where: { entityType: 'project', entityId: id } });
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
