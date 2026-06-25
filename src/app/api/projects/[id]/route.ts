import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, canCreate } from '@/lib/approval';
import { writeAudit } from '@/lib/audit';
import { snapshotProject } from '@/lib/snapshot';

function getUsername(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = getUsername(req);
  const { name, description, policyId, sortOrder, editReason } = await req.json();
  // 内容変更時は再承認（方針付け替え・並び替えのみは除く）。内容編集は担当部長・取締役のみ。
  const contentChanged = name !== undefined || description !== undefined;
  if (contentChanged) {
    const member = await getMember(username);
    if (!member || !canCreate(member, 'project')) return NextResponse.json({ error: 'プロジェクトの編集は担当部長・取締役のみ可能です' }, { status: 403 });
  } else if (!username) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }
  const before = await prisma.project.findUnique({ where: { id } });
  const changes: { field: string; before: string; after: string }[] = [];
  if (before && name !== undefined && name !== before.name) changes.push({ field: '名称', before: before.name, after: name });
  if (before && description !== undefined && (description ?? null) !== before.description) changes.push({ field: '説明', before: before.description ?? '', after: description ?? '' });
  if (before && policyId !== undefined && (policyId || null) !== before.policyId) {
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
      ...(policyId !== undefined ? { policyId: policyId || null } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(contentChanged ? { status: 'pending', editNote: note, prevState: prevSnap, editedBy: username ?? null } : {}),
    },
  });
  if (contentChanged && username) await writeAudit({ entityType: 'project', entityId: id, title: project.name, action: 'edit', actor: username, detail: auditDetail });
  return NextResponse.json(project);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const { id } = await params;
  await prisma.approval.deleteMany({ where: { entityType: 'project', entityId: id } });
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
