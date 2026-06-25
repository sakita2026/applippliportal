import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMember, canCreate } from '@/lib/approval';
import { writeAudit } from '@/lib/audit';
import { snapshotPolicy } from '@/lib/snapshot';

function getUsername(req: NextRequest): string | null {
  return req.cookies.get('workportal_auth')?.value ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = getUsername(req);
  const { name, description, sortOrder, editReason } = await req.json();
  // 内容編集（名称・説明）は取締役のみ。並び替えのみはログインで可。
  const contentEdit = name !== undefined || description !== undefined;
  if (contentEdit) {
    const member = await getMember(username);
    if (!member || !canCreate(member, 'policy')) return NextResponse.json({ error: '方針の編集は取締役のみ可能です' }, { status: 403 });
  } else if (!username) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }
  const before = await prisma.policy.findUnique({ where: { id } });
  const changes: { field: string; before: string; after: string }[] = [];
  if (before && name !== undefined && name !== before.name) changes.push({ field: '名称', before: before.name, after: name });
  if (before && description !== undefined && (description ?? null) !== before.description) changes.push({ field: '説明', before: before.description ?? '', after: description ?? '' });
  if (editReason) changes.push({ field: '理由', before: '', after: editReason });
  const note = contentEdit ? (changes.length ? JSON.stringify(changes) : null) : undefined;
  const auditDetail = changes.map((c) => `${c.field}: 「${c.before || '—'}」→「${c.after || '—'}」`).join(' / ');
  const prevSnap = contentEdit ? await snapshotPolicy(id) : null;
  if (contentEdit) await prisma.approval.deleteMany({ where: { entityType: 'policy', entityId: id } });
  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description ?? null } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(contentEdit ? { status: 'pending', editNote: note, prevState: prevSnap, editedBy: username ?? null } : {}),
    },
  });
  if (contentEdit && username) await writeAudit({ entityType: 'policy', entityId: id, title: policy.name, action: 'edit', actor: username, detail: auditDetail });
  return NextResponse.json(policy);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getUsername(req)) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  const { id } = await params;
  await prisma.approval.deleteMany({ where: { entityType: 'policy', entityId: id } });
  await prisma.policy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
