import { prisma } from '@/lib/prisma';
import type { EntityType } from '@/lib/approval';

export type AuditAction = 'approve' | 'delete_approve' | 'deleted' | 'edit';

/** 監査ログを追記（失敗してもメイン処理は止めない） */
export async function writeAudit(params: {
  entityType: EntityType;
  entityId: string;
  title: string;
  action: AuditAction;
  actor: string;
  asDirector?: boolean;
  asManager?: boolean;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        action: params.action,
        actor: params.actor,
        asDirector: !!params.asDirector,
        asManager: !!params.asManager,
        detail: params.detail ?? null,
      },
    });
  } catch {
    /* 監査ログ失敗は無視 */
  }
}

/** エンティティの表示名を取り出す（decision=title, policy/project=name） */
export function entityTitle(entityType: EntityType, entity: unknown): string {
  const e = entity as { title?: string; name?: string };
  return (entityType === 'decision' ? e.title : e.name) ?? '(無題)';
}
